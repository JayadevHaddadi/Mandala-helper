# Omega (nestorgames) — BGA Implementation Reference

> **Game Design**: Néstor Romeral Andrés (2010)  
> **Publisher**: nestorgames  
> **Licensing**: Approved by Néstor Romeral Andrés (SVGs provided)  
> **BGA Project**: `omegatest`

---

## 📜 Core Rules Summary

Omega is a combinatorial abstract strategy game for 2 to 4 players played on a hexagonal board of hexagonal cells.

### Objective
Achieve the highest score at game end. A player's score is the **product of the sizes of all connected groups of their color** on the board.
$$\text{Score} = \prod_{g \in \text{Groups}} |g|$$
*(Singletons count as 1. If a player has no stones, score is 0).*

### Components & Setup
* **Board**: Hexagonal grid.
  * 2 players: Board radius/size per side typically 4, 5, or 6 (default 5 or 6).
  * 3 players: 3 stone colors.
  * 4 players: 4 stone colors.
* **Stones**: Plain circular stones in 2 to 4 colors (White, Black, Red, Blue).

### Turn Structure
On their turn, an active player **places one stone of EACH color** in play onto empty hexes on the board:
* In a **2-player game**: Place 1 White stone and 1 Black stone anywhere on empty cells (order does not matter).
* In a **3-player game**: Place 1 White, 1 Black, and 1 Red stone on empty cells.
* In a **4-player game**: Place 1 of each color on empty cells.

### Pie Rule (Swap Rule)
In a 2-player game, Player 2 may optionally choose to swap colors after Player 1's opening move instead of making a normal move.

### Game End
The game ends when a full round of turns cannot be completed (i.e., not enough empty spaces remain on the board for every player to place their full set of stones).

The player with the highest total score wins.

---

## 📐 Board Geometry & Hex Grid Architecture

We use **Axial Coordinates** $(q, r)$ for the hexagonal grid:
* Radius $R$ (e.g. $R=4 \implies$ side length 5, $3R^2 + 3R + 1 = 61$ hexes).
* Coordinate constraints:
  $$-R \le q \le R, \quad -R \le r \le R, \quad -R \le q + r \le R$$
* The 6 adjacent neighbors of $(q, r)$ are:
  $$(q+1, r), (q-1, r), (q, r+1), (q, r-1), (q+1, r-1), (q-1, r+1)$$

---

## 🧮 Group Detection & Scoring Algorithm

Using Breadth-First Search (BFS) / Disjoint Set Union (DSU):
1. For each player/color:
   - Identify unvisited stones of that color.
   - Run BFS through adjacent matching-color neighbors to find each connected component.
   - Collect size $S_i$ for each component $i$.
2. Compute Product:
   $$\text{FinalScore} = \prod_{i=1}^k S_i$$
3. Real-time HUD: display group breakdown (e.g., `Score: 24 (Groups: 4 × 3 × 2)`).
