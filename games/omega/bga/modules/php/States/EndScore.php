<?php

declare(strict_types=1);

namespace Bga\Games\omegatest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\omegatest\Game;

const ST_END_GAME = 99;

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
        $scores = $this->game->calculateAllScores();
        $bestScore = -1;

        foreach ($scores as $playerId => $data) {
            $pId = (int) $playerId;
            $scoreVal = (int) $data['score'];
            $groups = $data['groups'];
            $largestGroup = !empty($groups) ? (int) $groups[0] : 0;
            $secondGroup = (count($groups) > 1) ? (int) $groups[1] : 0;
            $thirdGroup = (count($groups) > 2) ? (int) $groups[2] : 0;

            // Auxiliary score for tiebreaking: largest * 10000 + second * 100 + third
            $auxScore = ($largestGroup * 10000) + ($secondGroup * 100) + $thirdGroup;

            $this->bga->playerScore->set($pId, $scoreVal);
            $this->bga->playerScoreAux->set($pId, $auxScore);

            $this->playerStats->set('final_groups_count', count($groups), $pId);
            $this->playerStats->set('largest_group_size', $largestGroup, $pId);

            if ($scoreVal > $bestScore) {
                $bestScore = $scoreVal;
            }
        }

        $turnCount = (int) $this->globals->get('turn_count', 1);
        $this->tableStats->set('winning_score', max(0, $bestScore));
        $this->tableStats->set('turns_number', $turnCount);

        $this->game->notifyAllPlayers('endGameScores', clienttranslate('Game finished! Final scores computed.'), [
            'scores' => $scores,
        ]);

        return ST_END_GAME;
    }
}
