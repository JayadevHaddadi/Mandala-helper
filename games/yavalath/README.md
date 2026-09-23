# Yavalath — BGA Implementation Reference

> **Inventors**: Cameron Browne & Ludi (Computer Program) (2007)  
> **Publisher**: nestorgames (Néstor Romeral Andrés)  
> **Licensing**: Fully Approved by Cameron Browne and Néstor Romeral Andrés  
> **Attribution Requirement**: *"Invented by Cameron Browne and Ludi; Published by nestorgames"*  
> **BGA Project**: `yavalath`

---

## 📜 Core Rules

Yavalath is an evolutionary abstract connection game played on a hexagonal board of 5 hexes per side (radius 4, 61 cells).

### Objective
* **WIN**: Connect **4 or more stones in a straight line** of your color.
* **LOSE**: Connect **exactly 3 stones in a straight line** of your color (without simultaneously completing 4-in-a-row).

### Turn Structure
* Players take turns placing ONE stone of their color onto any unoccupied cell.
* If a move completes both a 3-in-a-row and a 4-in-a-row, the **WIN takes precedence**.
* If a player is forced to make 3-in-a-row, they lose immediately.
  * In a 2-player game, the other player wins.
  * In a 3-player game, the eliminated player's pieces remain on the board as inert blockers.

### Game End
1. A player forms a 4-in-a-row $\implies$ That player **Wins**.
2. A player forms a 3-in-a-row $\implies$ That player **Loses**.
3. All 61 board cells are filled without a winner $\implies$ **Draw**.
