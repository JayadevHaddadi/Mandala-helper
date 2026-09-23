<?php

declare(strict_types=1);

namespace Bga\Games\yavalath\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\yavalath\Game;

class EndScore extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct(
            $game,
            id: 99,
            type: StateType::GAME_END,
        );
    }

    public function onEnteringState(): void
    {
        $winnerId = (int) $this->globals->get('winner_id', 0);
        $loserId = (int) $this->globals->get('loser_id', 0);
        $reason = (string) $this->globals->get('end_reason', '');
        $players = array_keys($this->game->loadPlayersBasicInfos());

        foreach ($players as $pId) {
            $p = (int) $pId;
            if ($p === $winnerId) {
                $this->bga->playerScore->set($p, 1);
            } else {
                $this->bga->playerScore->set($p, 0);
            }
        }

        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->tableStats->set('turns_number', $turnCount);

        $msg = client_translate('Game over!');
        if ($reason === 'win_by_four') {
            $msg = client_translate('${player_name} completed 4-in-a-row and wins!');
        } elseif ($reason === 'lose_by_three') {
            $msg = client_translate('${player_name} formed 3-in-a-row and is defeated!');
        }

        $this->game->notifyAllPlayers('endGameScores', $msg, [
            'winner_id' => $winnerId,
            'loser_id' => $loserId,
            'reason' => $reason,
            'player_name' => $winnerId ? $this->game->loadPlayersBasicInfos()[$winnerId]['player_name'] : '',
        ]);
    }
}
