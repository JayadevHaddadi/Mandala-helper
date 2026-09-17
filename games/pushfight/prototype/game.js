/**
 * Push Fight — Interactive Prototype Logic
 * Full implementation of the 26-square board, sliding movement, and chain-reaction push engine.
 */

class SoundController {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playSlide() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playThud() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playAnchor() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playWin() {
    if (!this.ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C-E-G-C
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
    });
  }
}

const sounds = new SoundController();

// Push Fight Game Engine
class PushFightGame {
  constructor() {
    this.ROWS = 4;
    this.COLS = 8;
    this.pieces = [];
    this.activePlayer = 'white'; // 'white' | 'brown'
    this.phase = 'move';         // 'move' | 'push' | 'gameover'
    this.movesLeft = 2;
    this.anchoredPieceId = null;
    this.selectedPieceId = null;
    this.turnCount = 1;
    this.turnHistory = [];       // for undoing moves made in the current turn

    this.initDOM();
    this.setupStandardGame();
  }

  // 26-Square Geometry
  isValidSquare(r, c) {
    if (r < 1 || r > 4 || c < 1 || c > 8) return false;
    if (r === 1 && c > 5) return false; // Cutout top right (Cols 6, 7, 8)
    if (r === 4 && c < 4) return false; // Cutout bottom left (Cols 1, 2, 3)
    return true;
  }

  // Check if a move or push step from (r,c) in direction (dr,dc) crosses a side rail
  crossesSideRail(r, c, dr, dc) {
    // Top Side Rail: top of Row 1, Cols 1 to 5
    if (r === 1 && dr === -1 && c >= 1 && c <= 5) return true;
    // Bottom Side Rail: bottom of Row 4, Cols 4 to 8
    if (r === 4 && dr === 1 && c >= 4 && c <= 8) return true;
    return false;
  }

  getPieceAt(r, c) {
    return this.pieces.find(p => p.r === r && p.c === c && p.alive);
  }

  getPieceById(id) {
    return this.pieces.find(p => p.id === id);
  }

  initDOM() {
    this.gridBoard = document.getElementById('gridBoard');
    this.badgeWhite = document.getElementById('badgeWhite');
    this.badgeBrown = document.getElementById('badgeBrown');
    this.phasePill = document.getElementById('phasePill');
    this.phaseInstruction = document.getElementById('phaseInstruction');
    this.dot1 = document.getElementById('dot1');
    this.dot2 = document.getElementById('dot2');
    this.btnSkipMoves = document.getElementById('btnSkipMoves');
    this.btnUndoMove = document.getElementById('btnUndoMove');
    this.btnQuickSetup = document.getElementById('btnQuickSetup');
    this.btnRestart = document.getElementById('btnRestart');
    this.btnToggle3D = document.getElementById('btnToggle3D');
    this.boardStage = document.querySelector('.board-stage');
    this.btnHelp = document.getElementById('btnHelp');
    this.rulesModal = document.getElementById('rulesModal');
    this.btnCloseRules = document.getElementById('btnCloseRules');
    this.btnGotIt = document.getElementById('btnGotIt');
    this.victoryOverlay = document.getElementById('victoryOverlay');
    this.victoryTitle = document.getElementById('victoryTitle');
    this.victoryReason = document.getElementById('victoryReason');
    this.btnPlayAgain = document.getElementById('btnPlayAgain');
    this.logMessages = document.getElementById('logMessages');
    this.logTurnCount = document.getElementById('logTurnCount');
    this.anchorText = document.getElementById('anchorText');

    // Build the 4x8 cell elements
    this.gridBoard.innerHTML = '';
    for (let r = 1; r <= this.ROWS; r++) {
      for (let c = 1; c <= this.COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.id = `cell_${r}_${c}`;

        if (!this.isValidSquare(r, c)) {
          cell.classList.add('cutout');
        } else {
          const coord = document.createElement('span');
          coord.className = 'cell-coord';
          coord.textContent = `${r},${c}`;
          cell.appendChild(coord);

          cell.addEventListener('click', () => this.onCellClick(r, c));
        }

        this.gridBoard.appendChild(cell);
      }
    }

    // Attach listeners
    this.btnToggle3D.addEventListener('click', () => {
      this.boardStage.classList.toggle('view-3d');
      const is3D = this.boardStage.classList.contains('view-3d');
      this.btnToggle3D.innerHTML = is3D ? '<span class="btn-icon">📐</span> 2D View' : '<span class="btn-icon">🎲</span> 3D View';
    });
    this.btnSkipMoves.addEventListener('click', () => this.switchToPushPhase());
    this.btnUndoMove.addEventListener('click', () => this.undoLastMove());
    this.btnQuickSetup.addEventListener('click', () => this.setupStandardGame());
    this.btnRestart.addEventListener('click', () => this.setupStandardGame());
    this.btnHelp.addEventListener('click', () => this.rulesModal.classList.add('open'));
    this.btnCloseRules.addEventListener('click', () => this.rulesModal.classList.remove('open'));
    this.btnGotIt.addEventListener('click', () => this.rulesModal.classList.remove('open'));
    this.btnPlayAgain.addEventListener('click', () => {
      this.victoryOverlay.classList.remove('open');
      this.setupStandardGame();
    });

    document.addEventListener('click', () => sounds.init(), { once: true });
  }

  setupStandardGame() {
    this.pieces = [
      // White Team (Cols 1-4, Left Half)
      { id: 'w_k1', team: 'white', type: 'king', r: 2, c: 4, alive: true },
      { id: 'w_k2', team: 'white', type: 'king', r: 3, c: 4, alive: true },
      { id: 'w_k3', team: 'white', type: 'king', r: 1, c: 4, alive: true },
      { id: 'w_p1', team: 'white', type: 'pawn', r: 2, c: 3, alive: true },
      { id: 'w_p2', team: 'white', type: 'pawn', r: 3, c: 3, alive: true },

      // Brown Team (Cols 5-8, Right Half)
      { id: 'b_k1', team: 'brown', type: 'king', r: 2, c: 5, alive: true },
      { id: 'b_k2', team: 'brown', type: 'king', r: 3, c: 5, alive: true },
      { id: 'b_k3', team: 'brown', type: 'king', r: 4, c: 5, alive: true },
      { id: 'b_p1', team: 'brown', type: 'pawn', r: 2, c: 6, alive: true },
      { id: 'b_p2', team: 'brown', type: 'pawn', r: 3, c: 6, alive: true }
    ];

    this.activePlayer = 'white';
    this.phase = 'move';
    this.movesLeft = 2;
    this.anchoredPieceId = null;
    this.selectedPieceId = null;
    this.turnCount = 1;
    this.turnHistory = [];

    this.logMessages.innerHTML = '';
    this.log(`Game started. Standard layout initialized. White plays first!`, 'system-msg');

    this.render();
  }

  log(msg, className = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.textContent = msg;
    this.logMessages.appendChild(entry);
    this.logMessages.scrollTop = this.logMessages.scrollHeight;
  }

  // Phase & Turn Navigation
  switchToPushPhase() {
    if (this.phase === 'gameover') return;
    this.phase = 'push';
    this.selectedPieceId = null;
    this.log(`[${this.activePlayer.toUpperCase()}] Ready for Mandatory Push. Select a Square King!`);
    this.render();
  }

  nextTurn(pushingKingId) {
    this.anchoredPieceId = pushingKingId;
    this.activePlayer = this.activePlayer === 'white' ? 'brown' : 'white';
    this.phase = 'move';
    this.movesLeft = 2;
    this.selectedPieceId = null;
    this.turnHistory = [];
    this.turnCount++;

    const anchorOwner = this.getPieceById(this.anchoredPieceId);
    this.log(`[${this.activePlayer.toUpperCase()}] Turn begins. 2 moves available. (Anchor is on ${anchorOwner.team} King at ${anchorOwner.r},${anchorOwner.c})`);

    // Check if active player has any legal moves or legal pushes
    if (!this.playerHasAnyLegalPush(this.activePlayer)) {
      this.triggerWin(
        this.activePlayer === 'white' ? 'brown' : 'white',
        `${this.activePlayer.toUpperCase()} is trapped and has no legal push!`
      );
      return;
    }

    this.render();
  }

  // Orthogonal Connected-Path Movement (BFS Flood Fill)
  // Rule: "Travel as far as you want on empty spaces as long as the spaces are connected (have sides that touch). Move all over the board if you like."
  getValidMovesForPiece(piece) {
    if (!piece || !piece.alive) return [];
    const validMoves = [];
    const visited = new Set();
    const startKey = `${piece.r},${piece.c}`;
    visited.add(startKey);

    const queue = [{ r: piece.r, c: piece.c }];
    const directions = [
      { dr: -1, dc: 0 }, // Up
      { dr: 1, dc: 0 },  // Down
      { dr: 0, dc: -1 }, // Left
      { dr: 0, dc: 1 }   // Right
    ];

    while (queue.length > 0) {
      const curr = queue.shift();

      for (const { dr, dc } of directions) {
        const nr = curr.r + dr;
        const nc = curr.c + dc;
        const key = `${nr},${nc}`;

        if (this.isValidSquare(nr, nc) && !visited.has(key)) {
          visited.add(key);
          // Can only travel onto and through empty spaces
          if (!this.getPieceAt(nr, nc)) {
            validMoves.push({ r: nr, c: nc });
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    return validMoves;
  }

  // Push Calculation Engine
  evaluatePush(kingId, direction) {
    const king = this.getPieceById(kingId);
    if (!king || king.type !== 'king' || !king.alive) {
      return { valid: false, reason: 'Only active square kings can push.' };
    }

    const dirMap = {
      up: { dr: -1, dc: 0, label: 'Up' },
      down: { dr: 1, dc: 0, label: 'Down' },
      left: { dr: 0, dc: -1, label: 'Left' },
      right: { dr: 0, dc: 1, label: 'Right' }
    };
    const { dr, dc } = dirMap[direction];

    const adjR = king.r + dr;
    const adjC = king.c + dc;

    // Check if there is an adjacent piece
    const adjPiece = this.getPieceAt(adjR, adjC);
    if (!adjPiece) {
      return { valid: false, reason: 'Pushes must target an adjacent piece.' };
    }

    // Trace contiguous line of pieces
    const line = [];
    let r = adjR;
    let c = adjC;
    while (true) {
      const p = this.getPieceAt(r, c);
      if (!p) break;
      line.push(p);
      r += dr;
      c += dc;
    }

    // 1. Anchor Check: Can never push the anchored King
    const hasAnchored = line.some(p => p.id === this.anchoredPieceId);
    if (hasAnchored) {
      return { valid: false, reason: 'Line contains the anchored King (protected from pushes).' };
    }

    // 2. Rail Check: Does any piece in {king} + line push across a side rail?
    const allMoving = [king, ...line];
    for (const p of allMoving) {
      if (this.crossesSideRail(p.r, p.c, dr, dc)) {
        return { valid: false, reason: 'Cannot push into or over a side rail.' };
      }
    }

    // 3. Destination Check for the leading piece
    const destR = r;
    const destC = c;

    if (this.isValidSquare(destR, destC)) {
      // Pushing into an empty board square
      return {
        valid: true,
        fallsOff: false,
        fallenPiece: null,
        king,
        line,
        dr,
        dc
      };
    } else {
      // Pushing off the edge of the board!
      const fallenPiece = line[line.length - 1];
      return {
        valid: true,
        fallsOff: true,
        fallenPiece,
        king,
        line,
        dr,
        dc
      };
    }
  }

  getLegalPushDirectionsForKing(kingId) {
    const directions = ['up', 'down', 'left', 'right'];
    return directions.filter(dir => this.evaluatePush(kingId, dir).valid);
  }

  playerHasAnyLegalPush(playerTeam) {
    const kings = this.pieces.filter(p => p.team === playerTeam && p.type === 'king' && p.alive);
    return kings.some(k => this.getLegalPushDirectionsForKing(k.id).length > 0);
  }

  executePush(kingId, direction) {
    const evalResult = this.evaluatePush(kingId, direction);
    if (!evalResult.valid) {
      this.log(`Illegal Push: ${evalResult.reason}`, 'system-msg');
      return;
    }

    const { king, line, dr, dc, fallsOff, fallenPiece } = evalResult;

    sounds.playThud();

    // Push each piece in line 1 space forward (process backwards from front to back)
    for (let i = line.length - 1; i >= 0; i--) {
      const p = line[i];
      if (fallsOff && p.id === fallenPiece.id) {
        p.alive = false;
        p.r = -1;
        p.c = -1;
      } else {
        p.r += dr;
        p.c += dc;
      }
    }

    // Move King into adjacent spot
    king.r += dr;
    king.c += dc;

    sounds.playAnchor();

    if (fallsOff) {
      this.log(`💥 ${king.team.toUpperCase()} PUSHED ${fallenPiece.team.toUpperCase()} ${fallenPiece.type.toUpperCase()} OFF THE BOARD!`, 'win-log');
      if (fallenPiece.team !== king.team) {
        this.triggerWin(king.team, `${fallenPiece.team.toUpperCase()} piece was pushed off the edge!`);
      } else {
        // Pushed own piece off -> opponent wins
        const opponent = king.team === 'white' ? 'brown' : 'white';
        this.triggerWin(opponent, `${king.team.toUpperCase()} pushed their own piece off!`);
      }
      return;
    }

    this.log(`[PUSH] ${king.team.toUpperCase()} King pushed ${line.length} piece(s) ${direction.toUpperCase()}. Anchor placed.`, 'push-log');
    this.nextTurn(king.id);
  }

  triggerWin(winningTeam, reason) {
    this.phase = 'gameover';
    sounds.playWin();
    this.victoryTitle.textContent = `${winningTeam.toUpperCase()} TEAM WINS!`;
    this.victoryReason.textContent = reason;
    this.victoryOverlay.classList.add('open');
    this.render();
  }

  // Click Handlers
  onPieceClick(piece) {
    if (this.phase === 'gameover') return;

    if (this.phase === 'move') {
      // In move phase, only active player's pieces can be selected to move
      if (piece.team !== this.activePlayer) return;

      if (this.selectedPieceId === piece.id) {
        this.selectedPieceId = null;
      } else {
        this.selectedPieceId = piece.id;
        sounds.playSlide();
      }
      this.render();
    } else if (this.phase === 'push') {
      // In push phase, only active player's Kings can push
      if (piece.team !== this.activePlayer || piece.type !== 'king') return;

      if (this.selectedPieceId === piece.id) {
        this.selectedPieceId = null;
      } else {
        this.selectedPieceId = piece.id;
        sounds.playSlide();
      }
      this.render();
    }
  }

  onCellClick(r, c) {
    if (this.phase !== 'move' || !this.selectedPieceId) return;

    const piece = this.getPieceById(this.selectedPieceId);
    if (!piece) return;

    const validMoves = this.getValidMovesForPiece(piece);
    const isValid = validMoves.some(m => m.r === r && m.c === c);

    if (isValid) {
      // Save state to turn history for Undo
      this.turnHistory.push({
        pieceId: piece.id,
        fromR: piece.r,
        fromC: piece.c
      });

      piece.r = r;
      piece.c = c;
      this.movesLeft--;
      this.selectedPieceId = null;
      sounds.playSlide();

      this.log(`[MOVE] ${piece.team} ${piece.type} moved to (${r},${c}). ${this.movesLeft} move(s) left.`, 'move-log');

      if (this.movesLeft === 0) {
        this.switchToPushPhase();
      } else {
        this.render();
      }
    }
  }

  undoLastMove() {
    if (this.turnHistory.length === 0 || this.phase === 'gameover') return;

    const last = this.turnHistory.pop();
    const piece = this.getPieceById(last.pieceId);
    if (piece) {
      piece.r = last.fromR;
      piece.c = last.fromC;
      this.movesLeft++;
      this.phase = 'move';
      this.selectedPieceId = null;
      this.log(`Undo: ${piece.team} ${piece.type} returned to (${last.fromR},${last.fromC}).`);
      this.render();
    }
  }

  // Rendering
  render() {
    // 1. Update Player Badges
    this.badgeWhite.classList.toggle('active', this.activePlayer === 'white');
    this.badgeBrown.classList.toggle('active', this.activePlayer === 'brown');

    // 2. Update Banner & Instructions
    if (this.phase === 'move') {
      this.phasePill.textContent = 'Move Phase';
      this.phasePill.classList.remove('push-phase');
      this.phaseInstruction.textContent = `${this.capitalize(this.activePlayer)}: Slide up to 2 pieces orthogonally, or proceed to push.`;
      this.dot1.classList.toggle('active', this.movesLeft >= 1);
      this.dot2.classList.toggle('active', this.movesLeft >= 2);
      this.btnSkipMoves.disabled = false;
      this.btnUndoMove.disabled = this.turnHistory.length === 0;
    } else if (this.phase === 'push') {
      this.phasePill.textContent = 'Mandatory Push';
      this.phasePill.classList.add('push-phase');
      this.phaseInstruction.textContent = `${this.capitalize(this.activePlayer)}: Select a Square King to execute a push!`;
      this.dot1.classList.remove('active');
      this.dot2.classList.remove('active');
      this.btnSkipMoves.disabled = true;
      this.btnUndoMove.disabled = true;
    }

    // Anchor status text
    if (this.anchoredPieceId) {
      const aPiece = this.getPieceById(this.anchoredPieceId);
      this.anchorText.textContent = `Anchor: ${this.capitalize(aPiece.team)} King at (${aPiece.r},${aPiece.c})`;
    } else {
      this.anchorText.textContent = 'Anchor: None (First turn)';
    }

    this.logTurnCount.textContent = `Turn ${this.turnCount}`;

    // 3. Clear existing pieces, targets, and push overlays
    document.querySelectorAll('.cell').forEach(cell => {
      cell.classList.remove('move-target');
      const p = cell.querySelector('.piece');
      if (p) p.remove();
      const arr = cell.querySelector('.push-arrows-overlay');
      if (arr) arr.remove();
    });

    // 4. Render Pieces
    this.pieces.forEach(p => {
      if (!p.alive) return;
      const cell = document.getElementById(`cell_${p.r}_${p.c}`);
      if (!cell) return;

      const pieceEl = document.createElement('div');
      pieceEl.className = `piece ${p.team} ${p.type}`;
      if (this.selectedPieceId === p.id) {
        pieceEl.classList.add('selected');
      }

      // Inner icon or mark
      const inner = document.createElement('span');
      inner.className = 'piece-inner';
      inner.textContent = p.type === 'king' ? '■' : '●';
      pieceEl.appendChild(inner);

      // Anchor token
      if (p.id === this.anchoredPieceId) {
        const anchorEl = document.createElement('div');
        anchorEl.className = 'anchor-token';
        anchorEl.textContent = '⚓';
        anchorEl.title = 'Anchored King (Protected from pushes)';
        pieceEl.appendChild(anchorEl);
      }

      pieceEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onPieceClick(p);
      });

      cell.appendChild(pieceEl);
    });

    // 5. Render Move Targets (if a piece is selected in move phase)
    if (this.phase === 'move' && this.selectedPieceId) {
      const selPiece = this.getPieceById(this.selectedPieceId);
      const moves = this.getValidMovesForPiece(selPiece);
      moves.forEach(({ r, c }) => {
        const targetCell = document.getElementById(`cell_${r}_${c}`);
        if (targetCell) {
          targetCell.classList.add('move-target');
        }
      });
    }

    // 6. Render Push Arrows (if a King is selected in push phase)
    if (this.phase === 'push' && this.selectedPieceId) {
      const king = this.getPieceById(this.selectedPieceId);
      if (king && king.type === 'king') {
        const legalDirs = this.getLegalPushDirectionsForKing(king.id);
        const cell = document.getElementById(`cell_${king.r}_${king.c}`);

        if (cell && legalDirs.length > 0) {
          const overlay = document.createElement('div');
          overlay.className = 'push-arrows-overlay';

          const arrowConfig = {
            up: { symbol: '▲', top: '-36px', left: '16px' },
            down: { symbol: '▼', top: '56px', left: '16px' },
            left: { symbol: '◀', top: '16px', left: '-36px' },
            right: { symbol: '▶', top: '16px', left: '56px' }
          };

          legalDirs.forEach(dir => {
            const btn = document.createElement('button');
            btn.className = 'push-arrow-btn';
            btn.innerHTML = arrowConfig[dir].symbol;
            btn.style.top = arrowConfig[dir].top;
            btn.style.left = arrowConfig[dir].left;
            btn.title = `Push ${dir.toUpperCase()}`;

            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.executePush(king.id, dir);
            });

            overlay.appendChild(btn);
          });

          cell.appendChild(overlay);
        }
      }
    }
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new PushFightGame();
});
