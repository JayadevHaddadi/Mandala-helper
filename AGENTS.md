# Board Game Arena (BGA) Studio — Master Agent Guidelines & Gotchas

This file is the single source of truth for all AI agents working in this repository across all games. Follow these workflows, best practices, and rules strictly.

---

## 🚀 1. Deployment Workflow: Commit & Push

Every change should be committed and pushed to `main`. The GitHub Actions deployer (`.github/workflows/bga-deploy.yml`) will automatically detect modified game directories and deploy them to BGA Studio over SFTP.

* **Commit & Push**:
  ```bash
  git add .
  git commit -m "feat(<game>): description of change"
  git push origin main
  ```
* **Instant Local Fast-Lane (Optional)**: If you need instant 5-second delta-sync to Studio without waiting for the GitHub Actions runner:
  ```bash
  python tools/sync.py <target>
  ```

---

## 🎮 2. Game Target Mapping Reference

| Game | Local Directory | Remote BGA Studio Slot | Fast-Lane Sync Command |
| :--- | :--- | :--- | :--- |
| **Omega** | `games/omega/bga/` | `omegatest` | `python tools/sync.py omegatest` |
| **Yavalath** | `games/yavalath/bga/` | `yavalath` | `python tools/sync.py yavalath` |
| **Lords of Scotland** | `games/lordsofscotland/bga/` | `lordsofscotlandtest` | `python tools/sync.py lordsofscotlandtest` |
| **Push Fight** | `games/pushfight/bga/` | `pushfighttest` / `pushfight` | `python tools/sync.py pushfighttest` |
| **Mandala** | `games/mandala/bga-prod/` | `mandala` | `python tools/sync.py mandala` |

---

## ⚠️ 3. Critical Mistakes to Avoid (Lessons Learned & Gotchas)

### ❌ Mistake 1: Empty `player` table in `setupNewGame`
* **What happens**: Table creation fails with a fatal error or blank board because BGA expects the game to populate the `player` table.
* **The Rule**: `setupNewGame($players, $options = [])` **MUST**:
  1. Insert players into MySQL `player` table (`INSERT INTO player (player_id, player_color, player_name)...`).
  2. Call `$this->reloadPlayersBasicInfos()`.
  3. Initialize stats with `$this->tableStats->init(...)` and `$this->playerStats->init(...)`.
  4. Activate the first player with `$this->gamestate->changeActivePlayer($firstPlayerId)`.
  5. Return the initial state class name: `return PlayerTurn::class;`.

### ❌ Mistake 2: Missing `zombie(int $playerId)` in Active States
* **What happens**: Game crashes during table setup with:
  > `Fatal error: A zombie function is needed for state class \Bga\Games\<game>\States\<State>`
* **The Rule**: Every State class with `type: StateType::ACTIVE_PLAYER` (or `MULTIPLE_ACTIVE_PLAYER`) **MUST** implement:
  ```php
  public function zombie(int $playerId): string
  ```

### ❌ Mistake 3: Reversed `PlayerStats` Parameter Order
* **What happens**: BGA crashes with: `Unexpected error: incStat: Unknown player id: 1`.
* **The Rule**: In modern BGA framework:
  * `PlayerStats::inc(string $name, int|float $delta, int $player_id)` $\rightarrow$ **Delta is 2nd, PlayerId is 3rd!**
  * `PlayerStats::set(string $name, int|float|bool $value, int $player_id)` $\rightarrow$ **Value is 2nd, PlayerId is 3rd!**
  * Never pass `$playerId` as the 2nd argument.

### ❌ Mistake 4: Calling `playerPanels.isCurrentPlayerActive()`
* **What happens**: Uncaught `TypeError`. `playerPanels` only manages sidebar UI DOM elements.
* **The Rule**: In `Game.js`, always use defensive wrappers for player state:
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

### ❌ Mistake 5: Using `TRUNCATE TABLE` or DDL in PHP
* **What happens**: Rejected by BGA HAL automated code linter.
* **The Rule**: Always use `DELETE FROM <table>` instead of `TRUNCATE TABLE`. Prefix custom tables in `dbmodel.sql` with `DROP TABLE IF EXISTS`.

### ❌ Mistake 6: Dumping Branding Images into `img/`
* **What happens**: BGA automatically preloads all images in `img/` during table creation, causing 10% hang or slow loading.
* **The Rule**: Keep promotional/metadata images (`box.png`, `banner.jpg`, `icon.png`, `publisher.png`) in `metadata_assets/`. Only keep real gameplay sprites/textures in `img/`.

### ❌ Mistake 7: Schema Desync Across Restarts
* **The Rule**: Always implement `ensureSchema()` and `upgradeTableDb($from_version)` in `Game.php`. BGA keeps the same MySQL database instance across table restarts; column additions must be handled defensively.

---

## 📱 4. User Experience & Adaptive Design Standards

1. **Responsive Viewport Support**:
   * Minimum interface width should be set to `320px` in `gameinfos.jsonc`:
     ```json
     "game_interface_width": { "min": 320 }
     ```
   * The board container should implement dynamic auto-scaling via `transform: scale(...)` based on container width so mobile and tablet players never get horizontal scrollbars.
2. **Audio & Tactile Feedback**:
   * Use clean Web Audio API oscillators for stone clicks, placements, and win fanfares.
3. **Status Bar Guidance**:
   * Clear dynamic prompts in `this.bga.statusBar.setTitle(...)` instructing the player what action is required.
