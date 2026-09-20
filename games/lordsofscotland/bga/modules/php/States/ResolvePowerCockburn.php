<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

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
    public function actChooseSupporterSwap(int $supporter_card_id, int $activePlayerId): string
    {
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

    public function zombie(int $playerId): string
    {
        return NextPlayer::class;
    }

}

