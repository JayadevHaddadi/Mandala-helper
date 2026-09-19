<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

class ResolvePowerWemyss extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        // All army cards except the played Wemyss card itself
        $eligibleCards = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `player_id`, `is_face_up` FROM `card` WHERE `location` = 'army' AND `card_id` != $pendingCardId ORDER BY `location_arg`, `card_id`"
        );

        foreach ($eligibleCards as &$c) {
            $c['player_name'] = $this->game->getPlayerNameById((int)$c['player_id']);
            if (!$c['is_face_up'] && (int)$c['player_id'] !== $activePlayerId) {
                $c['clan'] = 'hidden';
                $c['strength'] = 0;
            }
        }

        return [
            'eligible_cards' => $eligibleCards,
        ];
    }

    #[PossibleAction]
    public function actChooseDiscard(int $target_card_id, int $activePlayerId): string
    {
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        $target = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $target_card_id AND `location` = 'army' AND `card_id` != $pendingCardId");
        if (!$target) {
            throw new UserException(clienttranslate('Selected card is not an eligible army card to discard'));
        }

        $victimId = (int) $target['location_arg'];
        $victimName = $this->game->getPlayerNameById($victimId);
        $playerName = $this->game->getPlayerNameById($activePlayerId);

        // Move target to discard
        Game::DbQuery("UPDATE `card` SET `location` = 'discard', `location_arg` = 0, `is_face_up` = 0 WHERE `card_id` = $target_card_id");

        $cardDesc = $target['is_face_up'] ? (Game::CLANS[$target['clan']]['name'] . ' (' . $target['strength'] . ')') : clienttranslate('a face-down card');

        $this->notify->all("powerWemyssUsed", clienttranslate('${player_name} (Clan Wemyss) discards ${card_desc} from ${victim_name}’s army'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'victim_id' => $victimId,
            'victim_name' => $victimName,
            'target_card_id' => $target_card_id,
            'card_desc' => $cardDesc,
        ]);

        $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
        return $extraMuster ? PlayerTurn::class : NextPlayer::class;
    }

    public function zombie(int $playerId): string
    {
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);
        $target = Game::getObjectFromDb("SELECT * FROM `card` WHERE `location` = 'army' AND `card_id` != $pendingCardId LIMIT 1");
        if ($target) {
            return $this->actChooseDiscard((int)$target['card_id'], $playerId);
        }
        return NextPlayer::class;
    }

}

