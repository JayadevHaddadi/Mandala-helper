<?php

declare(strict_types=1);

namespace Bga\Games\yavalath\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\yavalath\Game;

class NextPlayer extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct(
            $game,
            id: 20,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    public function onEnteringState(): string
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $this->playerStats->inc('turns_number', 1, $activePlayerId);

        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->globals->set('turn_count', $turnCount + 1);

        $eliminated = $this->globals->get('eliminated_players', []);
        $allPlayers = array_keys($this->game->loadPlayersBasicInfos());
        $maxAttempts = count($allPlayers);

        $nextPlayerId = (int) $this->game->activeNextPlayer();
        $attempts = 0;
        while (in_array($nextPlayerId, $eliminated, true) && $attempts < $maxAttempts) {
            $nextPlayerId = (int) $this->game->activeNextPlayer();
            $attempts++;
        }

        $this->game->giveExtraTime($nextPlayerId);

        return PlayerTurn::class;
    }
}
