<?php

declare(strict_types=1);

namespace Bga\Games\omega\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\omega\Game;

class NextPlayer extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct(
            $game,
            id: 20,
            type: StateType::GAME,
        );
    }

    public function onEnteringState(): string
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $this->playerStats->inc('turns_number', 1, $activePlayerId);

        $playerIds = array_keys($this->game->loadPlayersBasicInfos());
        $numPlayers = count($playerIds);
        $firstPlayerId = (int) $playerIds[0];

        $colorsPerTurn = count($this->game->getActiveColorsInGame());
        $emptyCount = count($this->game->getEmptyCells());

        // Advance to next player
        $nextPlayerId = (int) $this->game->activeNextPlayer();

        // Omega official rule: The game ends just before White's turn (new round)
        // when it is no longer possible for all players to complete a full round (requires N * N empty spaces).
        $minSpacesForFullRound = $numPlayers * $colorsPerTurn;
        if ($nextPlayerId === $firstPlayerId && $emptyCount < $minSpacesForFullRound) {
            return EndScore::class;
        }

        // Safety check: if remaining empty spaces are fewer than required for a single turn
        if ($emptyCount < $colorsPerTurn) {
            return EndScore::class;
        }

        // Turn count increment
        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->globals->set('turn_count', $turnCount + 1);

        $this->game->giveExtraTime($nextPlayerId);

        return PlayerTurn::class;
    }
}
