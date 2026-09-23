#!/usr/bin/env python3
"""
Unit tests for Omega board geometry and group product scoring algorithm.
"""

from collections import deque

# 6 hexagonal neighbor directions in axial coordinates (q, r)
HEX_DIRECTIONS = [
    (1, 0), (1, -1), (0, -1),
    (-1, 0), (-1, 1), (0, 1)
]

def generate_hex_board(radius=4):
    """Generate all valid (q, r) axial coordinates for a hex board of given radius."""
    cells = set()
    for q in range(-radius, radius + 1):
        for r in range(-radius, radius + 1):
            if -radius <= q + r <= radius:
                cells.add((q, r))
    return cells

def get_neighbors(coord, valid_cells):
    q, r = coord
    neighbors = []
    for dq, dr in HEX_DIRECTIONS:
        nxt = (q + dq, r + dr)
        if nxt in valid_cells:
            neighbors.append(nxt)
    return neighbors

def calculate_omega_score(board, color, valid_cells):
    """
    board: dict mapping (q, r) -> color
    color: string (e.g. 'white' or 'black')
    Returns: (final_score, list_of_group_sizes)
    """
    stones = {coord for coord, col in board.items() if col == color}
    if not stones:
        return 0, []

    visited = set()
    group_sizes = []

    for stone in stones:
        if stone in visited:
            continue
        # BFS
        group = []
        queue = deque([stone])
        visited.add(stone)

        while queue:
            curr = queue.popleft()
            group.append(curr)
            for nbr in get_neighbors(curr, valid_cells):
                if nbr in stones and nbr not in visited:
                    visited.add(nbr)
                    queue.append(nbr)

        group_sizes.append(len(group))

    # Product of all group sizes
    score = 1
    for sz in group_sizes:
        score *= sz

    # Sort descending for tiebreaking
    group_sizes.sort(reverse=True)
    return score, group_sizes

def test_omega():
    cells = generate_hex_board(4)
    assert len(cells) == 61, f"Expected 61 cells for radius 4, got {len(cells)}"

    # Test 1: Empty board
    score, groups = calculate_omega_score({}, 'white', cells)
    assert score == 0 and groups == []

    # Test 2: Single stone
    score, groups = calculate_omega_score({(0, 0): 'white'}, 'white', cells)
    assert score == 1 and groups == [1]

    # Test 3: Two separate stones
    score, groups = calculate_omega_score({(0, 0): 'white', (2, 2): 'white'}, 'white', cells)
    assert score == 1 and groups == [1, 1]

    # Test 4: One connected group of 3, one group of 2, one singleton
    board = {
        # Group of 3: (0,0), (1,0), (2,0)
        (0, 0): 'white', (1, 0): 'white', (2, 0): 'white',
        # Group of 2: (0, 2), (0, 3)
        (0, 2): 'white', (0, 3): 'white',
        # Singleton: (-2, -1)
        (-2, -1): 'white',
        # Other color stones
        (0, 1): 'black', (-1, 0): 'black'
    }
    score, groups = calculate_omega_score(board, 'white', cells)
    assert groups == [3, 2, 1], f"Expected groups [3, 2, 1], got {groups}"
    assert score == 6, f"Expected score 3 * 2 * 1 = 6, got {score}"

    # Test 5: Connected group of 4, group of 3 -> score 12
    board2 = {
        (0,0): 'black', (1,0): 'black', (0,1): 'black', (1,-1): 'black', # 4 connected
        (-2,0): 'black', (-3,0): 'black', (-2,-1): 'black' # 3 connected
    }
    score_b, groups_b = calculate_omega_score(board2, 'black', cells)
    assert groups_b == [4, 3]
    assert score_b == 12

    print("All Omega scoring tests passed successfully!")

if __name__ == '__main__':
    test_omega()
