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
            id: 98,
            type: StateType::GAME,
        );
    }

    public function onEnteringState(): int
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

        $winnerName = $winnerId ? $this->game->loadPlayersBasicInfos()[$winnerId]['player_name'] : '';
        $loserName = $loserId ? $this->game->loadPlayersBasicInfos()[$loserId]['player_name'] : '';

        $msg = clienttranslate('Game over!');
        if ($reason === 'win_by_four') {
            $msg = clienttranslate('${player_name} completed 4-in-a-row and wins!');
        } elseif ($reason === 'lose_by_three') {
            $msg = clienttranslate('${player_name} wins! (${loser_name} formed 3-in-a-row)');
        } elseif ($reason === 'board_full_draw') {
            $msg = clienttranslate('The board is full. The game ends in a draw!');
        } elseif ($reason === 'zombie_forfeit') {
            $msg = clienttranslate('${player_name} wins by forfeit!');
        }

        $this->game->notifyAllPlayers('endGameScores', $msg, [
            'winner_id' => $winnerId,
            'loser_id' => $loserId,
            'reason' => $reason,
            'player_name' => $winnerName,
            'loser_name' => $loserName,
        ]);

        return 99;
    }
}
