# BGA Studio Multi-Game Workspace Instructions & Rules

This project is a multi-game Board Game Arena (BGA) Studio development workspace. All agents working in this repository MUST follow these rules.

---

## ⚡ MANDATORY RULE: Sync & Commit After Every Change

Whenever you modify or debug ANY game code (PHP, JS, CSS, SQL, JSON), you **MUST**:
1. **Sync immediately to BGA Studio** using `tools/sync.py` so the user can refresh and test on Studio right away:
   * **Omega**: `python tools/sync.py omegatest`
   * **Yavalath**: `python tools/sync.py yavalath`
   * **Lords of Scotland**: `python tools/sync.py lordsofscotlandtest`
   * **Push Fight**: `python tools/sync.py pushfighttest` (or `pushfight`)
   * **Mandala**: `python tools/sync.py mandala`
2. **Commit and push** changes to GitHub so the GitHub Actions deployer stays synchronized.

---

## 🎮 Game Target Mapping Reference

| Game | Local Directory | Remote BGA Studio Slot | Sync Command |
| :--- | :--- | :--- | :--- |
| **Omega** | `games/omega/bga/` | `omegatest` | `python tools/sync.py omegatest` |
| **Yavalath** | `games/yavalath/bga/` | `yavalath` | `python tools/sync.py yavalath` |
| **Lords of Scotland** | `games/lordsofscotland/bga/` | `lordsofscotlandtest` | `python tools/sync.py lordsofscotlandtest` |
| **Push Fight** | `games/pushfight/bga/` | `pushfighttest` / `pushfight` | `python tools/sync.py pushfighttest` |
| **Mandala** | `games/mandala/bga-prod/` | `mandala` | `python tools/sync.py mandala` |

---

## 🛡️ Critical BGA Studio Architecture Rules & Gotchas

1. **The Mandatory `zombie` Method**:
   * Every State class with `type: StateType::ACTIVE_PLAYER` (or `MULTIPLE_ACTIVE_PLAYER`) **MUST** implement:
     ```php
     public function zombie(int $playerId): string
     ```
   * Omitting this will crash table creation with a fatal setup error.

2. **`setupNewGame` Requirements**:
   * Must insert players into MySQL `player` table (`INSERT INTO player (player_id, player_color, player_name)...`).
   * Must call `$this->reloadPlayersBasicInfos()`.
   * Must initialize table and player stats with `$this->tableStats->init(...)` and `$this->playerStats->init(...)`.
   * Must activate the starting player (`$this->gamestate->changeActivePlayer($firstPlayerId)`).
   * Must return the initial state class name (`return PlayerTurn::class;`).

3. **Statistics Parameter Order**:
   * `PlayerStats::inc(string $name, int|float $delta, int $player_id)` $\rightarrow$ **Delta is 2nd, PlayerId is 3rd!**
   * Never pass `$playerId` as the 2nd argument.

4. **Preventing "Loading game art (10%)" Hangs**:
   * In `Game.js`, always use defensive wrappers for player state:
     ```javascript
     isCurrentPlayerActive() {
         if (this.bga?.players && typeof this.bga.players.isCurrentPlayerActive === 'function') {
             return this.bga.players.isCurrentPlayerActive();
         }
         if (typeof gameui !== 'undefined' && typeof gameui.isCurrentPlayerActive === 'function') {
             return gameui.isCurrentPlayerActive();
         }
         return false;
     }

     getActivePlayerId() {
         if (this.bga?.players && typeof this.bga.players.getActivePlayerId === 'function') {
             return this.bga.players.getActivePlayerId();
         }
         if (typeof gameui !== 'undefined' && typeof gameui.getActivePlayerId === 'function') {
             return gameui.getActivePlayerId();
         }
         return null;
     }
     ```

5. **Schema Persistence Across Table Restarts**:
   * In `dbmodel.sql`: Always prefix custom tables with `DROP TABLE IF EXISTS`.
   * Never use `TRUNCATE TABLE` inside PHP (rejected by BGA HAL linter); use `DELETE FROM <table>`.
   * Always implement `ensureSchema()` and `upgradeTableDb($from_version)`.
