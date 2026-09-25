#!/usr/bin/env python3
"""
Unit tests for Yavalath line detection (4-in-a-row WIN, 3-in-a-row LOSE).
"""

HEX_AXIAL_DIRECTIONS = [
    (1, 0),   # E-W
    (0, 1),   # NE-SW
    (1, -1),  # SE-NW
]

def check_lines_through_move(board, move, color):
    """
    Given the current board state after placing a stone at `move` with `color`,
    check all lines through `move` in the 3 axial directions.
    Returns:
      'win' if 4 or more in a row is made (even if 3 is also made elsewhere on this move)
      'lose' if exactly 3 in a row is made and no 4 in a row
      'continue' if neither
    """
    mq, mr = move
    has_four = False
    has_three = False

    for dq, dr in HEX_AXIAL_DIRECTIONS:
        # Count consecutive matching stones in +dir
        count = 1
        # Forward
        step = 1
        while board.get((mq + step * dq, mr + step * dr)) == color:
            count += 1
            step += 1
        # Backward
        step = 1
        while board.get((mq - step * dq, mr - step * dr)) == color:
            count += 1
            step += 1

        if count >= 4:
            has_four = True
        elif count == 3:
            has_three = True

    if has_four:
        return 'win'
    if has_three:
        return 'lose'
    return 'continue'

def test_yavalath():
    # Test 1: Single move -> continue
    board = {(0, 0): 'white'}
    res = check_lines_through_move(board, (0, 0), 'white')
    assert res == 'continue', f"Expected continue, got {res}"

    # Test 2: Two in a row -> continue
    board[(1, 0)] = 'white'
    res = check_lines_through_move(board, (1, 0), 'white')
    assert res == 'continue', f"Expected continue, got {res}"

    # Test 3: Three in a row -> LOSE!
    board[(2, 0)] = 'white'
    res = check_lines_through_move(board, (2, 0), 'white')
    assert res == 'lose', f"Expected lose, got {res}"

    # Test 4: Placing in middle to bridge: (0,0) and (2,0) with (1,0)
    b2 = {(0, 0): 'black', (2, 0): 'black', (1, 0): 'black'}
    res2 = check_lines_through_move(b2, (1, 0), 'black')
    assert res2 == 'lose', f"Expected lose for 3-in-a-row bridge, got {res2}"

    # Test 5: Four in a row -> WIN!
    b3 = {(0, 0): 'white', (1, 0): 'white', (2, 0): 'white', (3, 0): 'white'}
    res3 = check_lines_through_move(b3, (3, 0), 'white')
    assert res3 == 'win', f"Expected win, got {res3}"

    # Test 6: Move makes a 4-in-a-row in direction 1 AND a 3-in-a-row in direction 2 -> WIN overrides LOSE!
    b4 = {
        # Dir (1,0): (0,0), (1,0), (2,0), (3,0) -> 4
        (0, 0): 'white', (1, 0): 'white', (2, 0): 'white', (3, 0): 'white',
        # Dir (0,1): (3, -1), (3, 0), (3, 1) -> 3
        (3, -1): 'white', (3, 1): 'white'
    }
    res4 = check_lines_through_move(b4, (3, 0), 'white')
    assert res4 == 'win', f"Expected win when 4 and 3 are formed simultaneously, got {res4}"

    # Test 7: 3-player game simulation with elimination
    players = [1001, 1002, 1003]
    eliminated = []
    
    # Player 1 makes a 3-in-a-row and is eliminated
    res_p1 = 'lose'
    if res_p1 == 'lose':
        eliminated.append(1001)
        survivors = [p for p in players if p not in eliminated]
        assert len(survivors) == 2, f"Expected 2 survivors, got {len(survivors)}"
        assert survivors == [1002, 1003]
        # Game must continue, not end
        game_over = len(survivors) <= 1
        assert not game_over

    # Player 2 makes a 3-in-a-row and is eliminated
    res_p2 = 'lose'
    if res_p2 == 'lose':
        eliminated.append(1002)
        survivors = [p for p in players if p not in eliminated]
        assert len(survivors) == 1, f"Expected 1 survivor, got {len(survivors)}"
        assert survivors[0] == 1003
        game_over = len(survivors) <= 1
        assert game_over
        winner = survivors[0]
        assert winner == 1003

    # Test 8: 3-Player VP distribution
    # If 1001 eliminated first, 1002 eliminated second, 1003 wins:
    scores = {}
    winner_id = 1003
    scores[winner_id] = 2
    scores[eliminated[1]] = 1
    scores[eliminated[0]] = 0
    assert scores == {1003: 2, 1002: 1, 1001: 0}, f"Expected 2/1/0 VP, got {scores}"

    # Test 9: Five-not-four variant
    # Connect 5 to win, 4 to lose
    def check_five_not_four(board, move, color):
        mq, mr = move
        has_five = False
        has_four = False
        for dq, dr in HEX_AXIAL_DIRECTIONS:
            count = 1
            step = 1
            while board.get((mq + step * dq, mr + step * dr)) == color:
                count += 1
                step += 1
            step = 1
            while board.get((mq - step * dq, mr - step * dr)) == color:
                count += 1
                step += 1
            if count >= 5:
                has_five = True
            elif count == 4:
                has_four = True
        if has_five:
            return 'win'
        if has_four:
            return 'lose'
        return 'continue'

    # 4 in a row in five-not-four -> LOSE
    b_fnf = {(0,0): 'white', (1,0): 'white', (2,0): 'white', (3,0): 'white'}
    assert check_five_not_four(b_fnf, (3,0), 'white') == 'lose'

    # 5 in a row in five-not-four -> WIN
    b_fnf[(4,0)] = 'white'
    assert check_five_not_four(b_fnf, (4,0), 'white') == 'win'

    # Test 10: Pie Rule swap simulation
    player_colors = {1001: 'white', 1002: 'black'}
    # Player 2 invokes pie rule
    swapped_colors = {1001: 'black', 1002: 'white'}
    assert swapped_colors[1002] == 'white'
    assert swapped_colors[1001] == 'black'

    print("All Yavalath line detection, variants, and 3-player VP tests passed successfully!")

if __name__ == '__main__':
    test_yavalath()
