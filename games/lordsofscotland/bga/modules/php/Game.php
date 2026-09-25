<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * lordsofscotland implementation : © Jayadev Haddadi
 * -----
 *
 * Game.php
 */
declare(strict_types=1);

namespace Bga\Games\lordsofscotland;

use Bga\Games\lordsofscotland\States\PlayerTurn;
use Bga\Games\lordsofscotland\States\EndScore;

class Game extends \Bga\GameFramework\Table
{
    public const CLANS = [
        'makgill' => [
            'name' => 'Makgill',
            'power' => 'Muster another Clan',
            'desc' => 'Play another card from your hand into your army.',
            'is_end' => false,
        ],
        'fergusson' => [
            'name' => 'Fergusson',
            'power' => 'Swap with another Clan',
            'desc' => 'Swap this card with any card in any player’s army (retaining orientation).',
            'is_end' => false,
        ],
        'wemyss' => [
            'name' => 'Wemyss',
            'power' => 'Discard a Clan',
            'desc' => 'Discard one card from any player’s army in the skirmish.',
            'is_end' => false,
        ],
        'scott' => [
            'name' => 'Scott',
            'power' => 'Copy another power',
            'desc' => 'Copy the power of any face-up card in any player’s army.',
            'is_end' => false,
        ],
        'forsyth' => [
            'name' => 'Forsyth',
            'power' => 'Draw a Card',
            'desc' => 'Draw a card from the draw pile into your hand.',
            'is_end' => false,
        ],
        'cockburn' => [
            'name' => 'Cockburn',
            'power' => 'Swap with a Supporter',
            'desc' => 'Swap this card with a card from the Supporter row (enters army face-up).',
            'is_end' => false,
        ],
        'cochrane' => [
            'name' => 'Cochrane',
            'power' => 'Claim two Supporters',
            'desc' => 'When claiming supporters at the end of the skirmish, claim 2 cards instead of 1.',
            'is_end' => true,
        ],
        'macdonnell' => [
            'name' => 'Macdonnell',
            'power' => 'Do not discard this Clan',
            'desc' => 'This card remains face-up in front of you for the next skirmish.',
            'is_end' => true,
        ],
        'bruce' => [
            'name' => 'Bruce',
            'power' => 'Wildcard Bloodline',
            'desc' => 'Acts as a wildcard bloodline to help double your army strength.',
            'is_end' => true,
        ],
    ];

    public function __construct()
    {
        parent::__construct();
    }

    public function ensureSchema(): void
    {
        self::DbQuery("CREATE TABLE IF NOT EXISTS `card` (
          `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `clan` VARCHAR(16) NOT NULL,
          `strength` TINYINT NOT NULL DEFAULT 0,
          `location` VARCHAR(16) NOT NULL DEFAULT 'deck',
          `location_arg` BIGINT NOT NULL DEFAULT 0,
          `is_face_up` TINYINT(1) NOT NULL DEFAULT 0,
          `copied_clan` VARCHAR(16) DEFAULT NULL,
          `persisted` TINYINT(1) NOT NULL DEFAULT 0,
          `power_activated` TINYINT(1) NOT NULL DEFAULT 0,
          `rank` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
          `round_played` TINYINT NOT NULL DEFAULT 0,
          PRIMARY KEY (`card_id`),
          INDEX `idx_location` (`location`, `location_arg`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;");

        // Defensive migration: a table created before these columns existed won't get them from
        // CREATE TABLE IF NOT EXISTS alone (BGA keeps the same DB across restarts).
        $expectedCols = [
            'power_activated' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'rank' => 'SMALLINT UNSIGNED NOT NULL DEFAULT 0',
            'round_played' => 'TINYINT NOT NULL DEFAULT 0',
            'persisted' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'copied_clan' => 'VARCHAR(16) DEFAULT NULL',
        ];
        foreach ($expectedCols as $col => $def) {
            try {
                $cols = self::getObjectListFromDb("SHOW COLUMNS FROM `card` LIKE '$col'");
                if (empty($cols)) {
                    self::DbQuery("ALTER TABLE `card` ADD COLUMN `$col` $def");
                }
            } catch (\Exception $e) {
                // Ignore
            }
        }
    }

    public function upgradeTableDb($from_version): void
    {
        $this->ensureSchema();
    }

    public function getGameProgression(): int
    {
        $maxScore = 0;
        foreach (array_keys($this->loadPlayersBasicInfos()) as $pId) {
            $maxScore = max($maxScore, (int) $this->playerScore->get((int)$pId));
        }
        $targetScore = (int) $this->globals->get('target_score', 40);
        return min(100, (int) round(($maxScore / $targetScore) * 100));
    }

    protected function getAllDatas(int $currentPlayerId): array
    {
        $result = [];

        $result['players'] = $this->loadPlayersBasicInfos();

        $result['current_skirmish'] = (int) $this->globals->get('current_skirmish', 1);
        $result['current_round'] = (int) $this->globals->get('current_round', 1);
        $vi = (int) $this->globals->get('victor_initiative', 0);
        if ($vi <= 0 && !empty($result['players'])) {
            $pKeys = array_keys($result['players']);
            $vi = (int) $pKeys[array_rand($pKeys)];
            $this->globals->set('victor_initiative', $vi);
        }
        $result['victor_initiative'] = $vi;
        $result['clans'] = self::CLANS;

        // Recruit row (guarantee 5 slots)
        $result['recruit'] = $this->ensureRecruitRow();

        // Supporter row
        $result['supporters'] = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` FROM `card` WHERE `location` = 'supporter' ORDER BY `card_id` ASC"
        );

        // Deck & Discard counts
        $result['deck_count'] = (int) self::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'deck'");
        $result['discard_count'] = (int) self::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'discard'");

        // Hand cards for current player (hidden from opponents)
        $result['hand'] = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` FROM `card` WHERE `location` = 'hand' AND `location_arg` = $currentPlayerId ORDER BY `strength` ASC, `clan` ASC"
        );
        foreach ($result['hand'] as &$c) {
            $c['can_activate_power'] = $this->canActivatePower((int)$c['strength'], $c['clan']);
        }

        $result['current_player_id'] = (int) $currentPlayerId;
        $handCounts = self::getCollectionFromDb(
            "SELECT `location_arg` AS `player_id`, COUNT(*) AS `count` FROM `card` WHERE `location` = 'hand' GROUP BY `location_arg`",
            true
        );
        foreach ($result['players'] as $pId => $pData) {
            $pIdInt = (int) $pId;
            $result['players'][$pId]['player_id'] = $pIdInt;
            $result['players'][$pId]['id'] = $pIdInt;
            $result['players'][$pId]['player_no'] = (int) ($pData['player_no'] ?? 0);
            $result['players'][$pId]['hand_count'] = (int) ($handCounts[$pId] ?? 0);
        }

        // Armies for all players (face-down cards masked for opponents, power_activated included for badges)
        $armyCards = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `player_id`, `is_face_up`, `copied_clan`, `persisted`, `power_activated`, `round_played` FROM `card` WHERE `location` = 'army' ORDER BY `card_id` ASC"
        );
        $armies = [];
        foreach ($result['players'] as $pId => $pData) {
            $armies[(string)$pId] = [];
        }
        foreach ($armyCards as $c) {
            $pId = (string) $c['player_id'];
            if (!$c['is_face_up'] && (int)$currentPlayerId !== (int)$pId) {
                // Opponents see it is face down
                $c['clan'] = 'hidden';
                $c['strength'] = 0;
            }
            if (isset($armies[$pId])) {
                $armies[$pId][] = $c;
            }
        }
        $result['armies'] = (object) $armies;

        // Player victory piles (cards claimed)
        $scoreCards = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `player_id` FROM `card` WHERE `location` = 'score' ORDER BY `strength` DESC"
        );
        $victoryPiles = [];
        foreach ($result['players'] as $pId => $pData) {
            $victoryPiles[$pId] = [];
        }
        foreach ($scoreCards as $c) {
            $victoryPiles[(int) $c['player_id']][] = $c;
        }
        $result['victory_piles'] = $victoryPiles;

        // Lowest face-up strength currently in skirmish
        $result['lowest_face_up'] = $this->getLowestFaceUpStrengthInSkirmish();

        return $result;
    }

    protected function setupNewGame($players, $options = [])
    {
        $this->ensureSchema();
        self::DbQuery("DELETE FROM `card`");

        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        $query_values = [];
        foreach ($players as $player_id => $player) {
            $query_values[] = vsprintf("(%s, '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                addslashes($player["player_name"]),
            ]);
        }

        static::DbQuery(
            sprintf(
                "INSERT INTO `player` (`player_id`, `player_color`, `player_name`) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // 1. Build Deck (Option 100: 1 = Excluded (default for beginners), 2 = Included (advanced))
        $includeBruce = (int) ($options[100] ?? 1) === 2;
        $cardsToInsert = [];

        // Every physical card has a globally unique `rank` (separate from `strength`), printed in
        // its top-right corner, used only to break skirmish ties (rulebook, p.2 & p.5). We don't
        // have the real printed values, so we assign a deterministic, collision-free rank per
        // clan+strength slot instead: still a fair, consistent tiebreaker even if the exact
        // numbers don't match a physical card.
        $clanIndex = 0;
        $nonBruceClans = array_filter(array_keys(self::CLANS), fn($c) => $c !== 'bruce');
        $bruceRank = count($nonBruceClans) * 12 + 1;

        foreach (array_keys(self::CLANS) as $clan) {
            if ($clan === 'bruce') {
                if ($includeBruce) {
                    $cardsToInsert[] = "('bruce', 0, 'deck', 0, 0, $bruceRank)";
                    $cardsToInsert[] = "('bruce', 0, 'deck', 0, 0, " . ($bruceRank + 1) . ")";
                }
                continue;
            }
            for ($s = 1; $s <= 12; $s++) {
                $rank = $clanIndex * 12 + $s;
                $cardsToInsert[] = "('$clan', $s, 'deck', 0, 0, $rank)";
            }
            $clanIndex++;
        }

        self::DbQuery(
            "INSERT INTO `card` (`clan`, `strength`, `location`, `location_arg`, `is_face_up`, `rank`) VALUES " . implode(',', $cardsToInsert)
        );

        // 2. Setup Globals: randomly determine who has Victor's Initiative for the first skirmish
        $playerIds = array_keys($players);
        $firstPlayerId = (int) $playerIds[array_rand($playerIds)];
        $targetScoreOpt = (int) ($options[101] ?? 1);
        $targetScore = match ($targetScoreOpt) {
            2 => 30,
            3 => 20,
            4 => 50,
            default => 40,
        };
        $this->globals->set('target_score', $targetScore);
        $this->globals->set('current_skirmish', 1);
        $this->globals->set('current_round', 1);
        $this->globals->set('victor_initiative', $firstPlayerId);
        $this->globals->set('turns_taken_this_round', 0);
        $this->globals->set('extra_muster_active', 0);

        // 3. Init Stats
        $this->tableStats->init('skirmishes_number', 0);
        $this->playerStats->init('skirmishes_won', 0);
        $this->playerStats->init('supporters_claimed', 0);
        $this->playerStats->init('bloodlines_doubled', 0);
        $this->playerStats->init('highest_army_strength', 0);
        $this->playerStats->init('powers_activated', 0);

        // 4. Deal 5 cards to each player's hand
        foreach (array_keys($players) as $pId) {
            $drawn = $this->drawCardsFromDeck(5, 'hand', (int)$pId);
        }

        // 5. Deal 5 cards to Recruit row (slot 0 face-up, rest face-down)
        $this->dealRecruitRow();

        // 6. Deal N supporter cards (face-up, ensuring not all same strength)
        $this->dealSupporterRow(count($players));

        // 7. Set active player to Victor's Initiative holder
        $this->gamestate->changeActivePlayer($firstPlayerId);

        return PlayerTurn::class;
    }

    public function dealRecruitRow(): array
    {
        self::DbQuery("UPDATE `card` SET `location` = 'discard', `location_arg` = 0, `is_face_up` = 0 WHERE `location` = 'recruit'");
        for ($slot = 0; $slot < 5; $slot++) {
            $this->drawCardFromDeck('recruit', $slot, ($slot === 0) ? 1 : 0);
        }
        return $this->ensureRecruitRow();
    }

    public function ensureRecruitRow(): array
    {
        $existing = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `slot`, `is_face_up` FROM `card` WHERE `location` = 'recruit' ORDER BY `location_arg` ASC"
        );
        $presentSlots = array_map('intval', array_column($existing, 'slot'));
        $round = (int) $this->globals->get('current_round', 1);

        for ($s = 0; $s < 5; $s++) {
            if (!in_array($s, $presentSlots, true)) {
                $isFaceUp = ($s < $round) ? 1 : 0;
                $this->drawCardFromDeck('recruit', $s, $isFaceUp);
            }
        }

        $cards = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `slot`, `is_face_up` FROM `card` WHERE `location` = 'recruit' ORDER BY `location_arg` ASC"
        );
        foreach ($cards as &$c) {
            if (!(int)$c['is_face_up']) {
                $c['clan'] = 'hidden';
                $c['strength'] = 0;
            }
        }
        return $cards;
    }

    public function dealSupporterRow(int $count): void
    {
        self::DbQuery("UPDATE `card` SET `location` = 'discard' WHERE `location` = 'supporter'");
        
        while (true) {
            $drawn = $this->drawCardsFromDeck($count, 'supporter', 0, 1);
            if (count($drawn) <= 1) {
                break;
            }
            // Check if all drawn supporters have identical strength
            $strengths = array_column($drawn, 'strength');
            if (count(array_unique($strengths)) > 1) {
                break; // Valid supporters!
            }
            // Discard and redraw if all identical
            self::DbQuery("UPDATE `card` SET `location` = 'discard' WHERE `location` = 'supporter'");
        }
    }

    public function drawCardFromDeck(string $location, int $locationArg = 0, int $isFaceUp = 0): ?array
    {
        $drawn = $this->drawCardsFromDeck(1, $location, $locationArg, $isFaceUp);
        return $drawn[0] ?? null;
    }

    public function drawCardsFromDeck(int $count, string $location, int $locationArg = 0, int $isFaceUp = 0): array
    {
        $deckCount = (int) self::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'deck'");
        if ($deckCount < $count) {
            // Reshuffle discard into deck
            self::DbQuery("UPDATE `card` SET `location` = 'deck', `location_arg` = 0, `is_face_up` = 0 WHERE `location` = 'discard'");
        }

        $cards = self::getObjectListFromDb("SELECT `card_id`, `clan`, `strength` FROM `card` WHERE `location` = 'deck' ORDER BY RAND() LIMIT $count");
        if (empty($cards)) {
            return [];
        }

        $ids = array_column($cards, 'card_id');
        $idList = implode(',', $ids);
        self::DbQuery("UPDATE `card` SET `location` = '$location', `location_arg` = $locationArg, `is_face_up` = $isFaceUp WHERE `card_id` IN ($idList)");

        foreach ($cards as &$c) {
            $c['location'] = $location;
            $c['location_arg'] = $locationArg;
            $c['is_face_up'] = $isFaceUp;
        }

        return $cards;
    }

    public function getLowestFaceUpStrengthInSkirmish(?string $clanFilter = null, ?int $excludeCardId = null): ?int
    {
        $excludeClause = $excludeCardId ? "AND `card_id` != $excludeCardId" : "";
        $clanClause = $clanFilter ? "AND `clan` = '$clanFilter'" : "";

        $val = self::getUniqueValueFromDb(
            "SELECT MIN(`strength`) FROM `card` WHERE `location` = 'army' AND `is_face_up` = 1 $clanClause $excludeClause"
        );

        return $val !== null ? (int) $val : null;
    }

    public function canActivatePower(int $strength, string $clan, ?int $excludeCardId = null): bool
    {
        $numPlayers = (int) self::getUniqueValueFromDb("SELECT COUNT(*) FROM `player`");

        if ($numPlayers <= 3) {
            // Rulebook: activates if no OTHER face-up Follower has LOWER strength — a tie for
            // lowest still qualifies, so this must be <=, not <.
            $lowest = $this->getLowestFaceUpStrengthInSkirmish(null, $excludeCardId);
            if ($lowest === null) {
                return true; // First face-up card in the skirmish automatically qualifies!
            }
            return $strength <= $lowest;
        } else {
            // 4 or 5 players: checked against same bloodline. Rulebook: activates only if no
            // OTHER same-clan Follower has strength EQUAL TO OR LESS than yours — ties block here,
            // deliberately stricter than the base rule above.
            $lowest = $this->getLowestFaceUpStrengthInSkirmish($clan, $excludeCardId);
            if ($lowest === null) {
                return true; // First face-up card of this bloodline qualifies!
            }
            return $strength < $lowest;
        }
    }

    public function calculateArmyStrength(int $playerId): array
    {
        $cards = self::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `is_face_up`, `copied_clan`, `persisted`, `power_activated`, `rank` FROM `card` WHERE `location` = 'army' AND `location_arg` = $playerId"
        );

        if (empty($cards)) {
            return ['total' => 0, 'doubled' => false, 'cards' => [], 'max_card' => 0, 'max_rank' => 0];
        }

        $sum = 0;
        $maxCard = 0;
        $maxRank = 0;
        $clans = [];

        foreach ($cards as $c) {
            $st = (int) $c['strength'];
            $sum += $st;
            if ($st > $maxCard) {
                $maxCard = $st;
            }
            if ((int) $c['rank'] > $maxRank) {
                $maxRank = (int) $c['rank'];
            }
            // Bruce's wildcard-clan power (or a Scott card that copied it) only counts if it was
            // genuinely activated — a face-down or non-qualifying Bruce is just its own bloodline.
            $activated = (int) $c['power_activated'] === 1;
            $isWildcard = ($c['clan'] === 'bruce' && $activated)
                || ($c['clan'] === 'scott' && ($c['copied_clan'] ?? '') === 'bruce' && $activated);
            if (!$isWildcard) {
                $clans[] = $c['clan'];
            }
        }

        $rawTotal = $sum;
        $doubled = false;
        // Bloodline Doubling Rule: if player played > 1 card and all cards belong to the same bloodline (Bruce acting as wild)
        if (count($cards) > 1) {
            $uniqueClans = array_unique($clans);
            if (count($uniqueClans) <= 1) {
                // Either 1 unique non-bruce clan or all bruce cards
                $doubled = true;
                $sum *= 2;
            }
        }

        return [
            'total' => $sum,
            'raw_total' => $rawTotal,
            'doubled' => $doubled,
            'cards' => $cards,
            'max_card' => $maxCard,
            'max_rank' => $maxRank,
        ];
    }
}

