<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

class DraftSupporter extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 30,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $supporters = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength` FROM `card` WHERE `location` = 'supporter' ORDER BY `strength` DESC, `clan` ASC"
        );

        $activePlayerId = (int) $this->game->getActivePlayerId();
        $draftsRemaining = (int) $this->game->globals->get('drafts_remaining_for_player', 1);

        return [
            'supporters' => $supporters,
            'drafts_remaining' => $draftsRemaining,
        ];
    }

    #[PossibleAction]
    public function actDraftSupporter(int $card_id, int $activePlayerId): string
    {
        $supporter = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $card_id AND `location` = 'supporter'");
        if (!$supporter) {
            throw new UserException(clienttranslate('This card is not available in the supporter row'));
        }

        $strength = (int) $supporter['strength'];
        $clan = $supporter['clan'];
        $clanName = Game::CLANS[$clan]['name'];
        $playerName = $this->game->getPlayerNameById($activePlayerId);

        // Move to score pile
        Game::DbQuery("UPDATE `card` SET `location` = 'score', `location_arg` = $activePlayerId, `is_face_up` = 1 WHERE `card_id` = $card_id");

        // Increase player score using framework counter
        $this->game->playerScore->inc($activePlayerId, $strength);
        $newScore = (int) $this->game->playerScore->get($activePlayerId);
        $this->game->playerStats->inc('supporters_claimed', $activePlayerId, 1);

        $this->game->notifyAllPlayers("supporterDrafted", clienttranslate('${player_name} claims ${clan_name} (${strength} pts) from the Supporter row (New total score: ${new_score})'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'card_id' => $card_id,
            'clan' => $clan,
            'clan_name' => $clanName,
            'strength' => $strength,
            'new_score' => $newScore,
        ]);

        $draftsRemaining = (int) $this->game->globals->get('drafts_remaining_for_player', 1) - 1;
        $remainingSupportersCount = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'supporter'");

        if ($draftsRemaining > 0 && $remainingSupportersCount > 0) {
            $this->game->globals->set('drafts_remaining_for_player', $draftsRemaining);
            return DraftSupporter::class; // Draft the 2nd supporter (Cochrane bonus)
        }

        // Move to next player in rankings
        $currentIndex = (int) $this->game->globals->get('current_draft_index', 0) + 1;
        $this->game->globals->set('current_draft_index', $currentIndex);

        return SkirmishResolution::class;
    }

    public function zombie(int $playerId): string
    {
        $firstSupporter = Game::getObjectFromDb("SELECT * FROM `card` WHERE `location` = 'supporter' ORDER BY `strength` DESC LIMIT 1");
        if ($firstSupporter) {
            return $this->actDraftSupporter((int)$firstSupporter['card_id'], $playerId);
        }
        return SkirmishResolution::class;
    }

    public function zombieTurn(int $playerId): string
    {
        return $this->zombie($playerId);
    }
}

