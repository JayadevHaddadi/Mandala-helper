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
        $playerInfos = $this->game->loadPlayersBasicInfos();
        $players = array_keys($playerInfos);
        $playerCount = count($players);
        $eliminated = $this->globals->get('eliminated_players', []);

        if ($playerCount === 2) {
            foreach ($players as $pId) {
                $p = (int) $pId;
                if ($p === $winnerId) {
                    $this->bga->playerScore->set($p, 1);
                } else {
                    $this->bga->playerScore->set($p, 0);
                }
            }
        } elseif ($playerCount === 3) {
            // 3-Player VP Ranking:
            // 1st place: 2 VP
            // 2nd place: 1 VP
            // 3rd place: 0 VP
            if ($winnerId !== 0) {
                $this->bga->playerScore->set($winnerId, 2);

                $remaining = array_values(array_diff($players, [$winnerId]));
                if (count($eliminated) >= 2) {
                    // Both opponents eliminated in sequence:
                    // eliminated[0] was knocked out first -> 3rd place (0 VP)
                    // eliminated[1] was knocked out second -> 2nd place (1 VP)
                    $third = (int) $eliminated[0];
                    $second = (int) $eliminated[1];
                    $this->bga->playerScore->set($second, 1);
                    $this->bga->playerScore->set($third, 0);
                } elseif (count($eliminated) === 1) {
                    // 1 player eliminated earlier, then winner made winning line:
                    // eliminated[0] is 3rd place (0 VP)
                    // surviving runner-up is 2nd place (1 VP)
                    $third = (int) $eliminated[0];
                    $secondCandidates = array_values(array_diff($remaining, [$third]));
                    $second = !empty($secondCandidates) ? (int) $secondCandidates[0] : 0;
                    if ($second) {
                        $this->bga->playerScore->set($second, 1);
                    }
                    $this->bga->playerScore->set($third, 0);
                } else {
                    // Winner connected winning line before anyone was eliminated:
                    // Both opponents survived (tied for 2nd place)
                    foreach ($remaining as $rId) {
                        $this->bga->playerScore->set((int) $rId, 0);
                    }
                }
            } else {
                // Board full draw
                if (count($eliminated) === 1) {
                    $third = (int) $eliminated[0];
                    $this->bga->playerScore->set($third, 0);
                    $survivors = array_values(array_diff($players, [$third]));
                    foreach ($survivors as $sId) {
                        $this->bga->playerScore->set((int) $sId, 1);
                    }
                } else {
                    foreach ($players as $pId) {
                        $this->bga->playerScore->set((int) $pId, 0);
                    }
                }
            }
        }

        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->tableStats->set('turns_number', $turnCount);

        $winnerName = $winnerId ? $playerInfos[$winnerId]['player_name'] : '';
        $loserName = $loserId ? $playerInfos[$loserId]['player_name'] : '';

        $winLen = (int) $this->globals->get('win_length', 4);
        $loseLen = (int) $this->globals->get('lose_length', 3);

        $msg = clienttranslate('Game over!');
        if ($reason === 'win_by_line' || $reason === 'win_by_four') {
            $msg = clienttranslate('${player_name} completed ${len}-in-a-row and wins!');
        } elseif ($reason === 'lose_by_line' || $reason === 'lose_by_three') {
            if ($playerCount === 3) {
                $msg = clienttranslate('${player_name} is the sole survivor and wins!');
            } else {
                $msg = clienttranslate('${player_name} wins! (${loser_name} formed ${len}-in-a-row)');
            }
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
            'len' => ($reason === 'win_by_line' || $reason === 'win_by_four') ? $winLen : $loseLen,
        ]);

        return 99;
    }
}
