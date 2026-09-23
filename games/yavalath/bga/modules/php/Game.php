<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * yavalath implementation : © Jayadev Haddadi
 *
 * Game.php - Core Game Engine for Yavalath
 *
 * Invented by Cameron Browne & Ludi (Computer Program)
 * Published by nestorgames (Néstor Romeral Andrés)
 *------
 */
declare(strict_types=1);

namespace Bga\Games\yavalath;

use Bga\Games\yavalath\States\PlayerTurn;
use Bga\Games\yavalath\States\NextPlayer;
use Bga\Games\yavalath\States\EndScore;
use Bga\GameFramework\UserException;

class Game extends \Bga\GameFramework\Table
{
    public const HEX_RADIUS = 4; // Side length 5 = 61 hex cells

    // 3 axial line axes (each covers forward and backward)
    public const LINE_AXES = [
        [1, 0],   // East - West
        [0, 1],   // Northeast - Southwest
        [1, -1],  // Southeast - Northwest
    ];

    public function __construct()
    {
        parent::__construct();
    }

    public function getGameProgression(): int
    {
        $placed = (int) $this->getUniqueValueFromDb("SELECT COUNT(*) FROM `board` WHERE `color` IS NOT NULL");
        return (int) min(100, round(($placed / 61) * 100));
    }

    public function ensureSchema(): void
    {
        try {
            $cols = static::getObjectListFromDb("SHOW COLUMNS FROM `board` LIKE 'coord_q'");
            if (empty($cols)) {
                static::DbQuery("DROP TABLE IF EXISTS `board`");
                static::DbQuery("CREATE TABLE IF NOT EXISTS `board` (
                    `coord_q` smallint(5) NOT NULL,
                    `coord_r` smallint(5) NOT NULL,
                    `color` varchar(16) DEFAULT NULL,
                    `player_id` int(10) unsigned DEFAULT NULL,
                    PRIMARY KEY (`coord_q`, `coord_r`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            }
        } catch (\Exception $e) {}
    }

    public function upgradeTableDb($from_version)
    {
        $this->ensureSchema();
    }

    protected function setupNewGame($players, $options = [])
    {
        $this->ensureSchema();
        static::DbQuery("DELETE FROM `board`");

        $default_colors = ['ffffff', '222222', 'd32f2f'];
        $colorNames = ['white', 'black', 'red'];
        $query_values = [];
        $playerColors = [];
        $idx = 0;
        $playerIds = array_keys($players);

        foreach ($playerIds as $player_id) {
            $hexColor = $default_colors[$idx % count($default_colors)];
            $colName = $colorNames[$idx % count($colorNames)];
            $playerColors[$player_id] = $colName;
            $query_values[] = vsprintf("(%s, '%s', '%s')", [
                $player_id,
                $hexColor,
                addslashes($players[$player_id]["player_name"]),
            ]);
            $idx++;
        }

        static::DbQuery(
            sprintf(
                "INSERT INTO `player` (`player_id`, `player_color`, `player_name`) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reloadPlayersBasicInfos();

        $radius = self::HEX_RADIUS;
        $values = [];
        for ($q = -$radius; $q <= $radius; $q++) {
            for ($r = -$radius; $r <= $radius; $r++) {
                if ($q + $r >= -$radius && $q + $r <= $radius) {
                    $values[] = "({$q}, {$r}, NULL, NULL)";
                }
            }
        }
        if (!empty($values)) {
            static::DbQuery("INSERT INTO `board` (`coord_q`, `coord_r`, `color`, `player_id`) VALUES " . implode(',', $values));
        }

        $this->globals->set('turn_count', 1);
        $this->globals->set('player_colors', $playerColors);
        $this->globals->set('eliminated_players', []);
        $this->globals->set('winner_id', 0);
        $this->globals->set('loser_id', 0);
        $this->globals->set('end_reason', '');

        $this->tableStats->init(['turns_number', 'win_by_four', 'win_by_opponent_three'], 0);
        $this->playerStats->init(['turns_number', 'stones_placed'], 0);

        // First player is White
        $p1 = (int) $playerIds[0];
        $this->gamestate->changeActivePlayer($p1);

        return PlayerTurn::class;
    }

    protected function getAllDatas(): array
    {
        $result = [];
        $result['players'] = $this->loadPlayersBasicInfos();
        $result['board'] = $this->getBoardState();
        $result['player_colors'] = $this->globals->get('player_colors', []);
        $result['eliminated_players'] = $this->globals->get('eliminated_players', []);
        $result['hex_radius'] = self::HEX_RADIUS;
        $result['turn_count'] = (int) $this->globals->get('turn_count', 1);
        return $result;
    }

    public function getBoardState(): array
    {
        $rows = static::getObjectListFromDb("SELECT `coord_q`, `coord_r`, `color`, `player_id` FROM `board`");
        $board = [];
        foreach ($rows as $row) {
            $key = "{$row['coord_q']}_{$row['coord_r']}";
            $board[$key] = [
                'q' => (int) $row['coord_q'],
                'r' => (int) $row['coord_r'],
                'color' => $row['color'],
                'player_id' => $row['player_id'] ? (int) $row['player_id'] : null,
            ];
        }
        return $board;
    }

    public function isValidCoord(int $q, int $r): bool
    {
        $radius = self::HEX_RADIUS;
        return ($q >= -$radius && $q <= $radius &&
                $r >= -$radius && $r <= $radius &&
                ($q + $r) >= -$radius && ($q + $r) <= $radius);
    }

    public function placeStone(int $q, int $r, int $playerId): string
    {
        if (!$this->isValidCoord($q, $r)) {
            throw new UserException(clienttranslate("Invalid coordinate."));
        }

        $existing = $this->getUniqueValueFromDb("SELECT `color` FROM `board` WHERE `coord_q` = {$q} AND `coord_r` = {$r}");
        if ($existing !== null) {
            throw new UserException(clienttranslate("This cell is already occupied."));
        }

        $playerColors = $this->globals->get('player_colors', []);
        $color = $playerColors[$playerId] ?? 'white';

        static::DbQuery("UPDATE `board` SET `color` = '{$color}', `player_id` = {$playerId} WHERE `coord_q` = {$q} AND `coord_r` = {$r}");

        return $color;
    }

    /**
     * Inspect all 3 axes passing through (q, r) to evaluate win/loss conditions:
     * - 4+ in a row: WIN
     * - exactly 3 in a row (with no 4): LOSE
     */
    public function evaluateMove(int $q, int $r, string $color): array
    {
        $board = $this->getBoardState();
        $board["{$q}_{$r}"] = ['q' => $q, 'r' => $r, 'color' => $color];

        $hasFour = false;
        $hasThree = false;
        $winningLine = [];
        $losingLine = [];

        foreach (self::LINE_AXES as $axis) {
            $dq = $axis[0];
            $dr = $axis[1];

            $line = [['q' => $q, 'r' => $r]];

            // Forward
            $step = 1;
            while (true) {
                $nq = $q + $step * $dq;
                $nr = $r + $step * $dr;
                $k = "{$nq}_{$nr}";
                if (isset($board[$k]) && $board[$k]['color'] === $color) {
                    $line[] = ['q' => $nq, 'r' => $nr];
                    $step++;
                } else {
                    break;
                }
            }

            // Backward
            $step = 1;
            while (true) {
                $nq = $q - $step * $dq;
                $nr = $r - $step * $dr;
                $k = "{$nq}_{$nr}";
                if (isset($board[$k]) && $board[$k]['color'] === $color) {
                    array_unshift($line, ['q' => $nq, 'r' => $nr]);
                    $step++;
                } else {
                    break;
                }
            }

            if (count($line) >= 4) {
                $hasFour = true;
                $winningLine = $line;
            } elseif (count($line) === 3) {
                $hasThree = true;
                $losingLine = $line;
            }
        }

        if ($hasFour) {
            return ['status' => 'win', 'line' => $winningLine];
        }
        if ($hasThree) {
            return ['status' => 'lose', 'line' => $losingLine];
        }

        // Check if board full
        $empty = (int) $this->getUniqueValueFromDb("SELECT COUNT(*) FROM `board` WHERE `color` IS NULL");
        if ($empty === 0) {
            return ['status' => 'draw', 'line' => []];
        }

        return ['status' => 'continue', 'line' => []];
    }
}
