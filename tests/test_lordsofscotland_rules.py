#!/usr/bin/env python3
"""
Unit tests for Lords of Scotland core game rules, scoring, power activation,
bloodline doubling, and tiebreaker logic.
"""

import unittest

CLANS = [
    'makgill', 'fergusson', 'wemyss', 'scott',
    'forsyth', 'cockburn', 'cochrane', 'macdonnell', 'bruce'
]

def build_deck(include_bruce=False):
    cards = []
    clan_index = 0
    non_bruce = [c for c in CLANS if c != 'bruce']
    bruce_rank = len(non_bruce) * 12 + 1

    for clan in CLANS:
        if clan == 'bruce':
            if include_bruce:
                cards.append({'clan': 'bruce', 'strength': 0, 'rank': bruce_rank})
                cards.append({'clan': 'bruce', 'strength': 0, 'rank': bruce_rank + 1})
            continue
        for s in range(1, 13):
            rank = clan_index * 12 + s
            cards.append({'clan': clan, 'strength': s, 'rank': rank})
        clan_index += 1

    return cards


def can_activate_power(strength, clan, num_players, army_cards):
    """
    Simulate canActivatePower(strength, clan) given existing face-up army cards.
    """
    face_up_cards = [c for c in army_cards if c.get('is_face_up', 0) == 1]

    if num_players <= 3:
        if not face_up_cards:
            return True
        lowest = min(c['strength'] for c in face_up_cards)
        return strength <= lowest
    else:
        same_clan_face_up = [c for c in face_up_cards if c['clan'] == clan]
        if not same_clan_face_up:
            return True
        lowest = min(c['strength'] for c in same_clan_face_up)
        return strength < lowest


def calculate_army_strength(cards):
    """
    Simulate calculateArmyStrength(playerId) for a player's army cards.
    """
    if not cards:
        return {'total': 0, 'doubled': False, 'cards': [], 'max_card': 0, 'max_rank': 0}

    total = 0
    max_card = 0
    max_rank = 0
    clans = []

    for c in cards:
        st = c['strength']
        total += st
        if st > max_card:
            max_card = st
        if c['rank'] > max_rank:
            max_rank = c['rank']

        activated = (c.get('power_activated', 0) == 1)
        is_wildcard = (
            (c['clan'] == 'bruce' and activated) or
            (c['clan'] == 'scott' and c.get('copied_clan') == 'bruce' and activated)
        )
        if not is_wildcard:
            clans.append(c['clan'])

    doubled = False
    if len(cards) > 1:
        unique_clans = set(clans)
        if len(unique_clans) <= 1:
            doubled = True
            total *= 2

    return {
        'total': total,
        'doubled': doubled,
        'cards': cards,
        'max_card': max_card,
        'max_rank': max_rank,
    }


def rank_skirmish(players_armies, victor_initiative_id):
    """
    Rank players by total strength DESC, then max_rank DESC, then victor's initiative.
    """
    rankings = []
    for p_id, cards in players_armies.items():
        calc = calculate_army_strength(cards)
        has_cochrane = any(
            c.get('power_activated') == 1 and (
                c['clan'] == 'cochrane' or
                (c['clan'] == 'scott' and c.get('copied_clan') == 'cochrane')
            )
            for c in cards
        )
        rankings.append({
            'player_id': p_id,
            'total': calc['total'],
            'doubled': calc['doubled'],
            'max_rank': calc['max_rank'],
            'card_count': len(cards),
            'has_cochrane': has_cochrane,
            'is_vi': (p_id == victor_initiative_id),
        })

    rankings.sort(
        key=lambda r: (r['total'], r['max_rank'], 1 if r['is_vi'] else 0),
        reverse=True
    )
    for idx, r in enumerate(rankings):
        r['rank'] = idx + 1
    return rankings


class TestLordsOfScotlandRules(unittest.TestCase):

    def test_deck_composition_standard(self):
        deck = build_deck(include_bruce=False)
        self.assertEqual(len(deck), 96)
        ranks = [c['rank'] for c in deck]
        self.assertEqual(len(set(ranks)), 96, "All standard card ranks must be strictly unique")

    def test_deck_composition_with_bruce(self):
        deck = build_deck(include_bruce=True)
        self.assertEqual(len(deck), 98)
        bruce_cards = [c for c in deck if c['clan'] == 'bruce']
        self.assertEqual(len(bruce_cards), 2)
        ranks = [c['rank'] for c in deck]
        self.assertEqual(len(set(ranks)), 98, "All 98 card ranks must be strictly unique")

    def test_power_activation_2_players(self):
        army = []
        # First card played in skirmish always activates
        self.assertTrue(can_activate_power(8, 'wemyss', 2, army))

        # Face-down cards don't count for lowest
        army.append({'clan': 'wemyss', 'strength': 8, 'is_face_up': 0})
        self.assertTrue(can_activate_power(10, 'scott', 2, army))

        # Face-up card with strength 6 played
        army.append({'clan': 'scott', 'strength': 6, 'is_face_up': 1})
        # Strength 7 > 6 -> cannot activate
        self.assertFalse(can_activate_power(7, 'makgill', 2, army))
        # Strength 6 == 6 -> can activate (tied for lowest)
        self.assertTrue(can_activate_power(6, 'makgill', 2, army))
        # Strength 4 < 6 -> can activate
        self.assertTrue(can_activate_power(4, 'cockburn', 2, army))

    def test_power_activation_4_players_bloodline_based(self):
        army = [
            {'clan': 'wemyss', 'strength': 5, 'is_face_up': 1},
            {'clan': 'makgill', 'strength': 9, 'is_face_up': 1},
        ]
        # In 4-5 players, compares to same bloodline only!
        # First Makgill is 9. Playing Makgill 7 < 9 -> can activate
        self.assertTrue(can_activate_power(7, 'makgill', 4, army))
        # Playing Makgill 9 == 9 -> cannot activate (must be strictly less than)
        self.assertFalse(can_activate_power(9, 'makgill', 4, army))
        # Playing Scott (no face-up Scott yet) -> can activate
        self.assertTrue(can_activate_power(12, 'scott', 4, army))

    def test_army_strength_single_card_not_doubled(self):
        cards = [{'clan': 'wemyss', 'strength': 10, 'rank': 30}]
        res = calculate_army_strength(cards)
        self.assertEqual(res['total'], 10)
        self.assertFalse(res['doubled'])

    def test_army_strength_same_bloodline_doubled(self):
        cards = [
            {'clan': 'makgill', 'strength': 3, 'rank': 3},
            {'clan': 'makgill', 'strength': 7, 'rank': 7},
            {'clan': 'makgill', 'strength': 11, 'rank': 11},
        ]
        res = calculate_army_strength(cards)
        # Sum = 21, doubled = 42
        self.assertEqual(res['total'], 42)
        self.assertTrue(res['doubled'])

    def test_army_strength_mixed_bloodline_not_doubled(self):
        cards = [
            {'clan': 'makgill', 'strength': 5, 'rank': 5},
            {'clan': 'wemyss', 'strength': 7, 'rank': 31},
        ]
        res = calculate_army_strength(cards)
        self.assertEqual(res['total'], 12)
        self.assertFalse(res['doubled'])

    def test_bruce_wildcard_doubles_bloodline(self):
        cards = [
            {'clan': 'fergusson', 'strength': 6, 'rank': 18},
            {'clan': 'bruce', 'strength': 0, 'rank': 97, 'power_activated': 1},
        ]
        res = calculate_army_strength(cards)
        # Bruce is wildcard, fergusson is 6. All non-wildcards are Fergusson. Doubled! Total = 6 * 2 = 12
        self.assertEqual(res['total'], 12)
        self.assertTrue(res['doubled'])

    def test_bruce_unactivated_does_not_double_mixed(self):
        cards = [
            {'clan': 'fergusson', 'strength': 6, 'rank': 18},
            {'clan': 'bruce', 'strength': 0, 'rank': 97, 'power_activated': 0},
        ]
        res = calculate_army_strength(cards)
        # Bruce was not activated (e.g. played face-down) -> distinct clan, mixed -> not doubled!
        self.assertEqual(res['total'], 6)
        self.assertFalse(res['doubled'])

    def test_skirmish_tiebreaker_by_highest_rank(self):
        # Player 1 has total 15 with max rank 40
        # Player 2 has total 15 with max rank 55
        armies = {
            1001: [
                {'clan': 'makgill', 'strength': 8, 'rank': 8},
                {'clan': 'wemyss', 'strength': 7, 'rank': 40},
            ],
            1002: [
                {'clan': 'fergusson', 'strength': 10, 'rank': 22},
                {'clan': 'cockburn', 'strength': 5, 'rank': 55},
            ],
        }
        rankings = rank_skirmish(armies, victor_initiative_id=1001)
        self.assertEqual(rankings[0]['player_id'], 1002, "Player 1002 has higher max card rank and should win tie")
        self.assertEqual(rankings[0]['rank'], 1)
        self.assertEqual(rankings[1]['rank'], 2)

    def test_cochrane_grants_two_drafts(self):
        armies = {
            1001: [
                {'clan': 'cochrane', 'strength': 4, 'rank': 76, 'power_activated': 1},
            ],
            1002: [
                {'clan': 'wemyss', 'strength': 2, 'rank': 26, 'power_activated': 0},
            ],
        }
        rankings = rank_skirmish(armies, victor_initiative_id=1001)
        self.assertTrue(rankings[0]['has_cochrane'])
        self.assertFalse(rankings[1]['has_cochrane'])


if __name__ == '__main__':
    unittest.main()
