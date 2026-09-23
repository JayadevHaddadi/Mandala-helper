<?php

declare(strict_types=1);

namespace Bga\Games\omegatest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\omegatest\Game;

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
        $players = array_keys($this->game->loadPlayersBasicInfos());
        $numPlayers = count($players);
        $colorsPerTurn = count($this->game->getActiveColorsInGame());
        $emptyCount = count($this->game->getEmptyCells());

        // Omega rule: The game ends when it is not possible to complete a full round of turns.
        // A full round requires: $numPlayers * $colorsPerTurn empty cells.
        // Also if fewer than $colorsPerTurn remain, the next player cannot even place their stones.
        if ($emptyCount < $colorsPerTurn) {
            return EndScore::class;
        }

        $activePlayerId = (int) $this->game->getActivePlayerId();
        $this->playerStats->inc('turns_number', 1, $activePlayerId);

        // Turn count increment
        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->globals->set('turn_count', $turnCount + 1);

        // Advance to next player
        $nextPlayerId = (int) $this->game->activeNextPlayer();
        $this->game->giveExtraTime($nextPlayerId);

        return PlayerTurn::class;
    }
}
