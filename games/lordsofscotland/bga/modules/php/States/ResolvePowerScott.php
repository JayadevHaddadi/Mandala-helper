<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

class ResolvePowerScott extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 22,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        // Any face-up card in any army, except scott cards
        $eligibleCards = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `player_id`, `is_face_up` FROM `card` WHERE `location` = 'army' AND `is_face_up` = 1 AND `card_id` != $pendingCardId AND `clan` != 'scott' ORDER BY `location_arg`, `card_id`"
        );

        foreach ($eligibleCards as &$c) {
            $c['player_name'] = $this->game->getPlayerNameById((int)$c['player_id']);
            $c['power_desc'] = Game::CLANS[$c['clan']]['power'];
        }

        return [
            'eligible_cards' => $eligibleCards,
        ];
    }

    #[PossibleAction]
    public function actChooseCopy(int $target_card_id, int $activePlayerId): string
    {
        $pendingCardId = (int) $this->game->globals->get('pending_power_card_id', 0);

        $targetCard = Game::getObjectFromDb(
            "SELECT * FROM `card` WHERE `card_id` = $target_card_id AND `location` = 'army' AND `is_face_up` = 1 AND `card_id` != $pendingCardId AND `clan` != 'scott'"
        );

        if (!$targetCard) {
            throw new UserException(clienttranslate('Selected card is not an eligible face-up card to copy'));
        }

        $copiedClan = $targetCard['clan'];
        $copiedClanName = Game::CLANS[$copiedClan]['name'];
        $powerDesc = Game::CLANS[$copiedClan]['power'];
        $playerName = $this->game->getPlayerNameById($activePlayerId);

        // Record copied clan. power_activated matters for end-of-round copies (Bruce/Cochrane/
        // Macdonnell) — those checks require genuine activation, not just clan identity.
        Game::DbQuery("UPDATE `card` SET `copied_clan` = '$copiedClan', `power_activated` = 1 WHERE `card_id` = $pendingCardId");

        $this->notify->all("powerScottUsed", clienttranslate('${player_name} (Clan Scott) copies the power of ${copied_clan_name}: <strong>${power_desc}</strong>'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'scott_card_id' => $pendingCardId,
            'copied_clan' => $copiedClan,
            'copied_clan_name' => $copiedClanName,
            'power_desc' => $powerDesc,
        ]);

        // Branch execution of copied power
        switch ($copiedClan) {
            case 'forsyth': // Draw a card
                $drawn = $this->game->drawCardFromDeck('hand', $activePlayerId, 0);
                if ($drawn) {
                    $this->notify->player($activePlayerId, "cardDrawn", clienttranslate('You drew ${clan_name} (${strength}) from the draw pile'), [
                        'card' => $drawn,
                        'clan_name' => Game::CLANS[$drawn['clan']]['name'],
                        'strength' => $drawn['strength'],
                    ]);
                    $this->notify->all("deckCardDrawn", clienttranslate('${player_name} draws a card from the draw pile'), [
                        'player_id' => $activePlayerId,
                        'player_name' => $playerName,
                    ]);
                }
                $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
                return $extraMuster ? PlayerTurn::class : NextPlayer::class;

            case 'makgill': // Extra muster
                $this->game->globals->set('extra_muster_active', 1);
                $this->notify->player($activePlayerId, "extraMusterGranted", clienttranslate('Clan Makgill power allows you to immediately muster another clan card!'), []);
                return PlayerTurn::class;

            case 'wemyss':
                return ResolvePowerWemyss::class;

            case 'fergusson':
                return ResolvePowerFergusson::class;

            case 'cockburn':
                return ResolvePowerCockburn::class;

            case 'cochrane':
            case 'macdonnell':
            case 'bruce':
            default:
                $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
                return $extraMuster ? PlayerTurn::class : NextPlayer::class;
        }
    }

    public function zombie(int $playerId): string
    {
        return NextPlayer::class;
    }

}

