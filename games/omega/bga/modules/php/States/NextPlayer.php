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
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $this->playerStats->inc('turns_number', 1, $activePlayerId);

        $colorsPerTurn = count($this->game->getActiveColorsInGame());
        $emptyCount = count($this->game->getEmptyCells());

        // Omega rule: The game ends when it is not possible to complete a turn (fewer empty cells than colors).
        if ($emptyCount < $colorsPerTurn) {
            return EndScore::class;
        }

        // Turn count increment
        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->globals->set('turn_count', $turnCount + 1);

        // Advance to next player
        $nextPlayerId = (int) $this->game->activeNextPlayer();
        $this->game->giveExtraTime($nextPlayerId);

        return PlayerTurn::class;
    }
}
