<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\Games\lordsofscotlandtest\Game;

class NextPlayer extends \Bga\GameFramework\States\GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 90,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    public function onEnteringState(int $activePlayerId): string
    {
        $this->game->giveExtraTime($activePlayerId);

        $numPlayers = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `player`");
        $turnsTaken = (int) $this->game->globals->get('turns_taken_this_round', 0) + 1;

        if ($turnsTaken < $numPlayers) {
            // Next player in current round
            $this->game->globals->set('turns_taken_this_round', $turnsTaken);
            $this->game->activeNextPlayer();
            return PlayerTurn::class;
        }

        // All players have taken their turn in this round!
        $this->game->globals->set('turns_taken_this_round', 0);
        $currentRound = (int) $this->game->globals->get('current_round', 1) + 1;

        if ($currentRound <= 5) {
            // Advance to next round (2 to 5)
            $this->game->globals->set('current_round', $currentRound);

            // Flip next recruit card face-up
            $slotToFlip = $currentRound - 1;
            Game::DbQuery("UPDATE `card` SET `is_face_up` = 1 WHERE `location` = 'recruit' AND `location_arg` = $slotToFlip");
            $flippedCard = Game::getObjectFromDb("SELECT `card_id`, `clan`, `strength`, `location_arg` AS `slot`, `is_face_up` FROM `card` WHERE `location` = 'recruit' AND `location_arg` = $slotToFlip");

            // Victor's Initiative starts the new round
            $victorInitiativePlayer = (int) $this->game->globals->get('victor_initiative', $activePlayerId);
            $this->game->gamestate->changeActivePlayer($victorInitiativePlayer);

            $this->notify->all("newRoundStarted", clienttranslate('--- Round ${round_num} of 5 begins! Recruit slot ${slot_display} turned face-up (${clan_name} ${strength}) ---'), [
                'round_num' => $currentRound,
                'slot' => $slotToFlip,
                'slot_display' => $slotToFlip + 1,
                'flipped_card' => $flippedCard,
                'clan_name' => $flippedCard ? Game::CLANS[$flippedCard['clan']]['name'] : '',
                'strength' => $flippedCard ? $flippedCard['strength'] : '',
                'active_player_id' => $victorInitiativePlayer,
            ]);

            return PlayerTurn::class;
        }

        // All 5 rounds are complete! Proceed to skirmish resolution
        $this->game->globals->set('skirmish_resolution_started', 0);
        return SkirmishResolution::class;
    }
}