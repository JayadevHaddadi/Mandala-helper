<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotland\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotland\Game;

class ResolvePowerCockburn extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 23,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $supporters = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` FROM `card` WHERE `location` = 'supporter' ORDER BY `card_id` ASC"
        );

        return [
            'supporters' => $supporters,
        ];
    }

    #[PossibleAction]
    public function actChooseSupporterSwap(int $supporter_card_id): string
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        $cockburnCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $pendingCardId AND `location` = 'army'");
        $supporterCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $supporter_card_id AND `location` = 'supporter'");

        if (!$cockburnCard || !$supporterCard) {
            throw new UserException(clienttranslate('Invalid card selection for supporter swap'));
        }

        $playerName = $this->game->getPlayerNameById($activePlayerId);

        // Cockburn moves to supporter row (face-up)
        Game::DbQuery("UPDATE `card` SET `location` = 'supporter', `location_arg` = 0, `is_face_up` = 1 WHERE `card_id` = $pendingCardId");

        // Supporter card moves into active player's army (face-up)
        $currentRound = (int) $this->game->globals->get('current_round', 1);
        Game::DbQuery("UPDATE `card` SET `location` = 'army', `location_arg` = $activePlayerId, `is_face_up` = 1, `round_played` = $currentRound WHERE `card_id` = $supporter_card_id");

        $newClanName = Game::CLANS[$supporterCard['clan']]['name'];
        $newStrength = (int) $supporterCard['strength'];

        $this->notify->all("powerCockburnUsed", clienttranslate('${player_name} (Clan Cockburn) swaps their card with ${new_clan_name} (${new_strength}) from the Supporter row'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'cockburn_card_id' => $pendingCardId,
            'supporter_card_id' => $supporter_card_id,
            'cockburn_card' => $cockburnCard,
            'supporter_card' => $supporterCard,
            'new_clan' => $supporterCard['clan'],
            'new_clan_name' => $newClanName,
            'new_strength' => $newStrength,
        ]);

        $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
        return $extraMuster ? PlayerTurn::class : NextPlayer::class;
    }

    #[PossibleAction]
    public function actUndo(): string
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        $card = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $pendingCardId AND `location` = 'army' AND `location_arg` = $activePlayerId");
        if (!$card) {
            throw new UserException(clienttranslate('No pending muster to undo'));
        }

        // Return card to player's hand face-down
        Game::DbQuery("UPDATE `card` SET `location` = 'hand', `location_arg` = $activePlayerId, `is_face_up` = 0, `power_activated` = 0, `round_played` = 0, `copied_clan` = NULL WHERE `card_id` = $pendingCardId");

        $this->game->playerStats->inc('powers_activated', -1, $activePlayerId);
        $this->game->globals->set('pending_power_card_id', 0);

        $playerName = $this->game->getPlayerNameById($activePlayerId);

        $this->notify->all("musterUndone", clienttranslate('${player_name} undid their muster'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'card_id' => $pendingCardId,
            'card' => $card,
        ]);

        return PlayerTurn::class;
    }

    public function zombie(int $playerId): string
    {
        $supporter = Game::getObjectFromDb("SELECT * FROM `card` WHERE `location` = 'supporter' LIMIT 1");
        if ($supporter) {
            return $this->actChooseSupporterSwap((int)$supporter['card_id']);
        }
        return NextPlayer::class;
    }

}

