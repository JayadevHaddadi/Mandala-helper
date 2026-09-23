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

    print("All Yavalath line detection tests passed successfully!")

if __name__ == '__main__':
    test_yavalath()
