<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

class ResolvePowerFergusson extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 21,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        // Fergusson's power swaps into an OPPONENT's army only (rulebook: "take one of their Followers").
        $eligibleCards = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `player_id`, `is_face_up` FROM `card` WHERE `location` = 'army' AND `card_id` != $pendingCardId AND `location_arg` != $activePlayerId ORDER BY `location_arg`, `card_id`"
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
    public function actChooseSwap(int $target_card_id): string
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        $fergussonCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $pendingCardId AND `location` = 'army'");
        $targetCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $target_card_id AND `location` = 'army' AND `card_id` != $pendingCardId");

        if (!$fergussonCard || !$targetCard) {
            throw new UserException(clienttranslate('Invalid cards for swap'));
        }

        if ((int) $targetCard['location_arg'] === $activePlayerId) {
            throw new UserException(clienttranslate('Clan Fergusson must swap into an opponent\'s army, not your own'));
        }

        $targetPlayerId = (int) $targetCard['location_arg'];
        $targetPlayerName = $this->game->getPlayerNameById($targetPlayerId);
        $playerName = $this->game->getPlayerNameById($activePlayerId);
        // Swap player_id location_args, keep is_face_up orientations
        Game::DbQuery("UPDATE `card` SET `location_arg` = $targetPlayerId WHERE `card_id` = $pendingCardId");
        Game::DbQuery("UPDATE `card` SET `location_arg` = $activePlayerId WHERE `card_id` = $target_card_id");

        $targetCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $target_card_id");
        $fergussonCard = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $pendingCardId");

        $publicTargetCard = $targetCard['is_face_up'] ? $targetCard : ['card_id' => $target_card_id, 'clan' => 'hidden', 'strength' => 0, 'is_face_up' => 0];

        $this->notify->all("powerFergussonUsed", clienttranslate('${player_name} (Clan Fergusson) swaps their card with a card from ${target_player_name}\'s army'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'target_player_id' => $targetPlayerId,
            'target_player_name' => $targetPlayerName,
            'fergusson_card_id' => $pendingCardId,
            'target_card_id' => $target_card_id,
            'fergusson_card' => $fergussonCard,
            'target_card' => $publicTargetCard,
        ]);

        if (!$targetCard['is_face_up']) {
            $this->notify->player($activePlayerId, "cardRevealedToOwner", '', [
                'card' => $targetCard,
                'player_id' => $activePlayerId,
            ]);
        }

        $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
        return $extraMuster ? PlayerTurn::class : NextPlayer::class;
    }

    public function zombie(int $playerId): string
    {
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);
        $target = Game::getObjectFromDb("SELECT * FROM `card` WHERE `location` = 'army' AND `card_id` != $pendingCardId AND `location_arg` != $playerId LIMIT 1");
        if ($target) {
            return $this->actChooseSwap((int)$target['card_id']);
        }
        return NextPlayer::class;
    }

}

