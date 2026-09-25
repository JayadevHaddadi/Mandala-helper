<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotland\States;

use Bga\GameFramework\StateType;
use Bga\Games\lordsofscotland\Game;

const ST_END_GAME = 99;

class EndScore extends \Bga\GameFramework\States\GameState
{

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 98,
            type: StateType::GAME,
        );
    }

    /**
     * Game state action, example content.
     *
     * The onEnteringState method of state `EndScore` is called just before the end of the game.
     */
    public function onEnteringState(?int $activePlayerId = null): int|string
    {
        return ST_END_GAME;
    }
}