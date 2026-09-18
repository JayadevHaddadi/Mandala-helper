<?php

declare(strict_types=1);

namespace Bga\Games\lordsofscotlandtest\States;

use Bga\GameFramework\StateType;
use Bga\Games\lordsofscotlandtest\Game;

class SkirmishResolution extends \Bga\GameFramework\States\GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 95,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    public function onEnteringState(int $activePlayerId): string
    {
        $started = (int) $this->game->globals->get('skirmish_resolution_started', 0);

        if ($started === 0) {
            // 1. Reveal all face-down army cards
            Game::DbQuery("UPDATE `card` SET `is_face_up` = 1 WHERE `location` = 'army'");

            // 2. Fetch players and compute army strengths
            $players = Game::getCollectionFromDb("SELECT `player_id` AS `id`, `player_name` AS `name` FROM `player`");
            $victorInitiative = (int) $this->game->globals->get('victor_initiative', 0);

            $rankings = [];
            foreach ($players as $pId => $pData) {
                $calc = $this->game->calculateArmyStrength((int)$pId);
                $pIdInt = (int)$pId;

                // Check highest army strength stat
                $currentHighest = (int) Game::getUniqueValueFromDb("SELECT `highest_army_strength` FROM `player` WHERE `player_id` = $pIdInt");
                if ($calc['total'] > $currentHighest) {
                    $this->game->playerStats->set('highest_army_strength', $pIdInt, $calc['total']);
                }

                if ($calc['doubled']) {
                    $this->game->playerStats->inc('bloodlines_doubled', $pIdInt, 1);
                }

                // Check if player has Cochrane in their army (claim 2 supporters)
                $hasCochrane = false;
                foreach ($calc['cards'] as $c) {
                    if ($c['clan'] === 'cochrane' || ($c['clan'] === 'scott' && ($c['copied_clan'] ?? '') === 'cochrane')) {
                        $hasCochrane = true;
                        break;
                    }
                }

                $rankings[] = [
                    'player_id' => $pIdInt,
                    'name' => $pData['name'],
                    'total' => $calc['total'],
                    'doubled' => $calc['doubled'],
                    'max_card' => $calc['max_card'],
                    'card_count' => count($calc['cards']),
                    'cards' => $calc['cards'],
                    'has_cochrane' => $hasCochrane,
                    'is_vi' => ($pIdInt === $victorInitiative),
                ];
            }

            // Sort: total DESC, max_card DESC, is_vi DESC
            usort($rankings, function ($a, $b) {
                if ($a['total'] !== $b['total']) {
                    return $b['total'] <=> $a['total'];
                }
                if ($a['max_card'] !== $b['max_card']) {
                    return $b['max_card'] <=> $a['max_card'];
                }
                return ($b['is_vi'] ? 1 : 0) <=> ($a['is_vi'] ? 1 : 0);
            });

            // Assign rank position (1-based)
            foreach ($rankings as $idx => &$r) {
                $r['rank'] = $idx + 1;
            }

            $this->game->globals->set('skirmish_rankings', $rankings);
            $this->game->globals->set('current_draft_index', 0);
            $this->game->globals->set('skirmish_resolution_started', 1);

            $this->game->notifyAllPlayers("skirmishResolved", clienttranslate('=== The 5 rounds are over! Skirmish armies are revealed ==='), [
                'rankings' => $rankings,
            ]);
        }

        $rankings = (array) $this->game->globals->get('skirmish_rankings', []);
        $currentIndex = (int) $this->game->globals->get('current_draft_index', 0);
        $supportersCount = (int) Game::getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `location` = 'supporter'");

        // Find next eligible player who has at least 1 card in their army
        while ($currentIndex < count($rankings) && $supportersCount > 0) {
            $candidate = $rankings[$currentIndex];
            if ($candidate['card_count'] > 0) {
                // This player can draft!
                $draftsCount = $candidate['has_cochrane'] ? 2 : 1;
                $this->game->globals->set('drafts_remaining_for_player', $draftsCount);
                $this->game->globals->set('current_draft_index', $currentIndex);
                $this->game->gamestate->changeActivePlayer((int)$candidate['player_id']);
                return DraftSupporter::class;
            }
            $currentIndex++;
            $this->game->globals->set('current_draft_index', $currentIndex);
        }

        // Supporter drafting is complete!
        $winner = $rankings[0] ?? null;
        $winnerId = $winner ? (int)$winner['player_id'] : (int)$this->game->globals->get('victor_initiative', 0);
        $this->game->globals->set('victor_initiative', $winnerId);

        if ($winner) {
            $this->game->playerStats->inc('skirmishes_won', $winnerId, 1);
        }
        $this->game->tableStats->inc('skirmishes_number', 1);

        // Check if any player has reached 40 or more points
        $maxScore = (int) Game::getUniqueValueFromDb("SELECT MAX(`player_score`) FROM `player`");
        if ($maxScore >= 40) {
            return EndScore::class;
        }

        // Otherwise, prepare next skirmish
        // 1. Discard army cards (except Macdonnell where persisted == 0)
        // Persisted == 0 Macdonnell cards become persisted == 1 and stay in army
        Game::DbQuery(
            "UPDATE `card` SET `location` = 'discard', `location_arg` = 0, `is_face_up` = 0 WHERE `location` = 'army' AND (`clan` != 'macdonnell' OR `persisted` = 1)"
        );
        Game::DbQuery(
            "UPDATE `card` SET `persisted` = 1, `copied_clan` = NULL WHERE `location` = 'army' AND `clan` = 'macdonnell'"
        );

        // 2. Discard remaining recruit and supporter cards
        Game::DbQuery("UPDATE `card` SET `location` = 'discard', `location_arg` = 0, `is_face_up` = 0 WHERE `location` IN ('recruit', 'supporter')");

        // 3. Deal fresh 5 face-down recruits
        for ($slot = 0; $slot < 5; $slot++) {
            $this->game->drawCardFromDeck('recruit', $slot, 0);
        }

        // 4. Deal fresh supporters (equal to player count)
        $numPlayers = count($rankings);
        $this->game->dealSupporterRow($numPlayers);

        // 5. Flip slot 0 recruit card face-up for round 1
        Game::DbQuery("UPDATE `card` SET `is_face_up` = 1 WHERE `location` = 'recruit' AND `location_arg` = 0");

        $skirmishNum = (int) $this->game->globals->get('current_skirmish', 1) + 1;
        $this->game->globals->set('current_skirmish', $skirmishNum);
        $this->game->globals->set('current_round', 1);
        $this->game->globals->set('turns_taken_this_round', 0);
        $this->game->globals->set('extra_muster_active', 0);
        $this->game->globals->set('skirmish_resolution_started', 0);

        // Victor starts next skirmish
        $this->game->gamestate->changeActivePlayer($winnerId);

        $this->game->notifyAllPlayers("newSkirmishStarted", clienttranslate('=== Skirmish #${skirmish_num} begins! Victor’s Initiative is held by ${winner_name} ==='), [
            'skirmish_num' => $skirmishNum,
            'winner_id' => $winnerId,
            'winner_name' => $winner ? $winner['name'] : '',
        ]);

        return PlayerTurn::class;
    }
}
