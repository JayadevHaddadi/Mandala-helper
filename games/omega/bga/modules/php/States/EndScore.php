<?php

declare(strict_types=1);

namespace Bga\Games\omega\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\omega\Game;

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
        $players = $this->game->loadPlayersBasicInfos();

        foreach ($scores as $playerId => $data) {
            $pId = (int) $playerId;
            $scoreVal = (int) $data['score'];
            $groups = $data['groups'];
            $largestGroup = !empty($groups) ? (int) $groups[0] : 0;
            $playerNo = isset($players[$pId]) ? (int) $players[$pId]['player_no'] : 1;

            // Official Néstor Romeral Andrés tiebreaker:
            // "In case of a tie, the last of the tied players to have taken their turn wins."
            // player_no represents turn order (1 = White, 2 = Black, 3 = Red, 4 = Blue).
            // Higher player_no moved later in the round, winning the tiebreaker.
            $auxScore = $playerNo;

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
