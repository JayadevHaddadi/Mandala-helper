<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\lordsofscotlandtest\Game;

class PlayerTurn extends GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();

        $handCount = (int) Game::getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `location` = 'hand' AND `location_arg` = $activePlayerId"
        );
        $canRecruit = ($handCount < 10);

        $recruitCards = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength`, `location_arg` AS `slot`, `is_face_up` FROM `card` WHERE `location` = 'recruit' ORDER BY `location_arg` ASC"
        );

        $handCards = Game::getObjectListFromDb(
            "SELECT `card_id`, `clan`, `strength` FROM `card` WHERE `location` = 'hand' AND `location_arg` = $activePlayerId ORDER BY `strength` ASC, `clan` ASC"
        );

        foreach ($handCards as &$c) {
            $c['can_activate_power'] = $this->game->canActivatePower((int)$c['strength'], $c['clan']);
        }

        $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;

        return [
            'can_recruit' => $canRecruit && !$extraMuster,
            'recruit_cards' => $recruitCards,
            'hand_cards' => $handCards,
            'extra_muster_active' => $extraMuster,
            'lowest_face_up' => $this->game->getLowestFaceUpStrengthInSkirmish(),
        ];
    }

    #[PossibleAction]
    public function actRecruit(int $card_id, int $activePlayerId): string
    {
        $extraMuster = (int) $this->game->globals->get('extra_muster_active', 0) === 1;
        if ($extraMuster) {
            throw new UserException(clienttranslate('You used Clan Makgill to muster another clan and must muster now'));
        }

        $handCount = (int) Game::getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `location` = 'hand' AND `location_arg` = $activePlayerId"
        );
        if ($handCount >= 10) {
            throw new UserException(clienttranslate('Your hand is full (maximum 10 cards). You must muster a clan'));
        }

        $card = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $card_id AND `location` = 'recruit'");
        if (!$card) {
            throw new UserException(clienttranslate('This card is not in the recruit row'));
        }

        $slot = (int) $card['location_arg'];
        $wasFaceUp = (int) $card['is_face_up'];

        // Move recruited card to hand (hidden)
        Game::DbQuery("UPDATE `card` SET `location` = 'hand', `location_arg` = $activePlayerId, `is_face_up` = 0 WHERE `card_id` = $card_id");

        // Refill recruit slot with same orientation
        $refillCard = $this->game->drawCardFromDeck('recruit', $slot, $wasFaceUp);

        $playerName = $this->game->getPlayerNameById($activePlayerId);

        // Precompute power readiness so recipient immediately sees power state in hand
        $card['can_activate_power'] = $this->game->canActivatePower((int)$card['strength'], $card['clan']);

        $publicCard = $wasFaceUp ? $card : ['card_id' => $card['card_id'], 'clan' => 'hidden', 'strength' => 0, 'is_face_up' => 0];

        $this->notify->all("cardRecruited", clienttranslate('${player_name} recruits a clan card from slot ${slot_display}'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'slot' => $slot,
            'slot_display' => $slot + 1,
            'card_id' => $card_id,
            'was_face_up' => $wasFaceUp,
            'card' => $publicCard,
            'refill_card' => $refillCard && $wasFaceUp ? $refillCard : ($refillCard ? ['card_id' => $refillCard['card_id'], 'clan' => 'hidden', 'strength' => 0, 'slot' => $slot, 'is_face_up' => 0] : null),
        ]);

        if (!$wasFaceUp) {
            // Tell only the recruiting player the true identity of their new hand card.
            $this->notify->player($activePlayerId, "cardRecruited", '', [
                'player_id' => $activePlayerId,
                'card_id' => $card_id,
                'card' => $card,
            ]);
        }

        return NextPlayer::class;
    }

    #[PossibleAction]
    public function actMuster(int $card_id, bool $face_up, int $activePlayerId): string
    {
        $card = Game::getObjectFromDb("SELECT * FROM `card` WHERE `card_id` = $card_id AND `location` = 'hand' AND `location_arg` = $activePlayerId");
        if (!$card) {
            throw new UserException(clienttranslate('This card is not in your hand'));
        }

        $currentRound = (int) $this->game->globals->get('current_round', 1);
        $isFaceUpInt = $face_up ? 1 : 0;

        // Move to army. Reset copied_clan/power_activated in case this physical card previously
        // lived a whole other life (e.g. was a Scott copy or an activated Bruce before being
        // discarded and reshuffled back into the deck) — those flags must never carry over.
        Game::DbQuery(
            "UPDATE `card` SET `location` = 'army', `location_arg` = $activePlayerId, `is_face_up` = $isFaceUpInt, `round_played` = $currentRound, `copied_clan` = NULL, `power_activated` = 0 WHERE `card_id` = $card_id"
        );

        $playerName = $this->game->getPlayerNameById($activePlayerId);
        $clan = $card['clan'];
        $strength = (int) $card['strength'];
        $clanName = Game::CLANS[$clan]['name'];

        $powerActivated = false;
        if ($face_up) {
            $powerActivated = $this->game->canActivatePower($strength, $clan, $card_id);
            if ($powerActivated) {
                Game::DbQuery("UPDATE `card` SET `power_activated` = 1 WHERE `card_id` = $card_id");
            }
        }

        // Clear extra muster flag if it was active
        $this->game->globals->set('extra_muster_active', 0);

        if (!$face_up) {
            // Played face-down: public broadcast stays masked, owner gets the true identity privately.
            $this->notify->all("cardMustered", clienttranslate('${player_name} musters a clan face-down into their army'), [
                'player_id' => $activePlayerId,
                'player_name' => $playerName,
                'card_id' => $card_id,
                'is_face_up' => 0,
            ]);
            $this->notify->player($activePlayerId, "cardMustered", '', [
                'player_id' => $activePlayerId,
                'card_id' => $card_id,
                'clan' => $clan,
                'strength' => $strength,
                'is_face_up' => 0,
                'reveal_to_owner' => true,
            ]);
            return NextPlayer::class;
        }

        // Played face-up
        if (!$powerActivated) {
            $this->notify->all("cardMustered", clienttranslate('${player_name} musters ${clan_name} (${strength}) face-up (strength is not lowest; power does not activate)'), [
                'player_id' => $activePlayerId,
                'player_name' => $playerName,
                'card_id' => $card_id,
                'clan' => $clan,
                'clan_name' => $clanName,
                'strength' => $strength,
                'is_face_up' => 1,
                'power_activated' => 0,
            ]);
            return NextPlayer::class;
        }

        // Power Activated!
        $this->game->playerStats->inc('powers_activated', 1, $activePlayerId);
        $powerDesc = Game::CLANS[$clan]['power'];

        $this->notify->all("powerActivated", clienttranslate('${player_name} musters ${clan_name} (${strength}) and activates its power: <strong>${power_desc}</strong>!'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
            'card_id' => $card_id,
            'clan' => $clan,
            'clan_name' => $clanName,
            'strength' => $strength,
            'power_desc' => $powerDesc,
            'is_face_up' => 1,
            'power_activated' => 1,
        ]);

        $this->game->globals->set('pending_power_card_id', $card_id);

        // Branch depending on which bloodline power
        switch ($clan) {
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
                return NextPlayer::class;

            case 'makgill': // Muster another clan
                $this->game->globals->set('extra_muster_active', 1);
                $this->notify->player($activePlayerId, "extraMusterGranted", clienttranslate('Clan Makgill allows you to immediately muster another clan card from your hand!'), []);
                return PlayerTurn::class; // Stays active for extra muster!

            case 'wemyss': // Discard a clan
                // Check if any other army cards exist
                $otherArmyCards = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'army' AND `card_id` != $card_id");
                if ($otherArmyCards > 0) {
                    return ResolvePowerWemyss::class;
                }
                return NextPlayer::class;

            case 'fergusson': // Swap with another clan
                $otherArmyCards = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'army' AND `card_id` != $card_id");
                if ($otherArmyCards > 0) {
                    return ResolvePowerFergusson::class;
                }
                return NextPlayer::class;

            case 'scott': // Copy another power
                $faceUpOthers = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'army' AND `is_face_up` = 1 AND `card_id` != $card_id AND `clan` != 'scott'");
                if ($faceUpOthers > 0) {
                    return ResolvePowerScott::class;
                }
                return NextPlayer::class;

            case 'cockburn': // Swap with a supporter
                $supporterCount = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'supporter'");
                if ($supporterCount > 0) {
                    return ResolvePowerCockburn::class;
                }
                return NextPlayer::class;

            case 'cochrane':
            case 'macdonnell':
            case 'bruce':
            default:
                // End-of-skirmish powers: effect takes place during or after skirmish resolution
                return NextPlayer::class;
        }
    }

    #[PossibleAction]
    public function actPass(int $activePlayerId): string
    {
        $playerName = $this->game->getPlayerNameById($activePlayerId);
        $this->notify->all("playerPassed", clienttranslate('${player_name} passes their turn'), [
            'player_id' => $activePlayerId,
            'player_name' => $playerName,
        ]);
        return NextPlayer::class;
    }

    public function zombie(int $playerId): string
    {
        $card = Game::getObjectFromDb("SELECT * FROM `card` WHERE `location` = 'hand' AND `location_arg` = $playerId LIMIT 1");
        if ($card) {
            return $this->actMuster((int)$card['card_id'], false, $playerId);
        }
        return NextPlayer::class;
    }

}