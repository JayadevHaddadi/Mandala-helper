<?php

declare(strict_types=1);

namespace Bga\Games\omegatest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\omegatest\Game;

class PlayerTurn extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct(
            $game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $placedThisTurn = $this->globals->get('placed_this_turn', []);
        $allColors = $this->game->getActiveColorsInGame();
        $remainingColors = array_values(array_diff($allColors, $placedThisTurn));

        $pieRuleAvailable = (bool) $this->globals->get('pie_rule_available', false) &&
                            empty($placedThisTurn) &&
                            ((int) $this->globals->get('turn_count', 1) === 2);

        return [
            'empty_cells' => $this->game->getEmptyCells(),
            'placed_this_turn' => $placedThisTurn,
            'remaining_colors' => $remainingColors,
            'pie_rule_available' => $pieRuleAvailable,
            'scores' => $this->game->calculateAllScores(),
        ];
    }

    #[PossibleAction]
    public function actPlaceStone(int $q, int $r, string $color, int $activePlayerId, array $args): ?string
    {
        $placedThisTurn = $this->globals->get('placed_this_turn', []);
        $allColors = $this->game->getActiveColorsInGame();

        if (!in_array($color, $allColors, true)) {
            throw new UserException(client_translate("Invalid stone color for this game."));
        }

        if (in_array($color, $placedThisTurn, true)) {
            throw new UserException(client_translate("You have already placed a stone of this color this turn."));
        }

        $this->game->placeStone($q, $r, $color, $activePlayerId);

        $placedThisTurn[] = $color;
        $this->globals->set('placed_this_turn', $placedThisTurn);

        // Notify table
        $this->game->notifyAllPlayers('stonePlaced', client_translate('${player_name} placed a ${color} stone at (${q}, ${r})'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->loadPlayersBasicInfos()[$activePlayerId]['player_name'],
            'q' => $q,
            'r' => $r,
            'color' => $color,
            'placed_this_turn' => $placedThisTurn,
            'scores' => $this->game->calculateAllScores(),
        ]);

        // Check if turn complete
        $remainingColors = array_diff($allColors, $placedThisTurn);
        if (empty($remainingColors)) {
            // Turn finished
            $this->globals->set('placed_this_turn', []);
            return NextPlayer::class;
        }

        // Still more stones to place this turn
        return null;
    }

    #[PossibleAction]
    public function actSwapColors(int $activePlayerId, array $args): string
    {
        $turnCount = (int) $this->globals->get('turn_count', 1);
        $pieAvailable = (bool) $this->globals->get('pie_rule_available', false);
        $placedThisTurn = $this->globals->get('placed_this_turn', []);

        if (!$pieAvailable || $turnCount !== 2 || !empty($placedThisTurn)) {
            throw new UserException(client_translate("The Pie Rule (Swap) is not available at this moment."));
        }

        $players = array_keys($this->game->loadPlayersBasicInfos());
        if (count($players) !== 2) {
            throw new UserException(client_translate("Pie Rule is only available in 2-player games."));
        }

        $p1 = (int) $players[0];
        $p2 = (int) $players[1];
        $this->game->swapPlayerColors($p1, $p2);

        $this->game->notifyAllPlayers('colorsSwapped', client_translate('${player_name} chose to swap colors using the Pie Rule!'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->loadPlayersBasicInfos()[$activePlayerId]['player_name'],
            'player_colors' => $this->globals->get('player_colors', []),
            'scores' => $this->game->calculateAllScores(),
        ]);

        return NextPlayer::class;
    }

    public function zombie(int $playerId): string
    {
        $allPlayers = array_keys($this->game->loadPlayersBasicInfos());
        $surviving = array_values(array_diff($allPlayers, [$playerId]));
        if (!empty($surviving)) {
            $winnerId = (int) $surviving[0];
            $this->bga->playerScore->set($winnerId, 1);
            $this->bga->playerScore->set($playerId, 0);
        }
        return EndScore::class;
    }
}
