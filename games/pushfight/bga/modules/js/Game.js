/**
 * Push Fight — Board Game Arena Client Implementation
 * Modern OOP Template
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
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playThud() {
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.18);
        } catch (e) {}
    }

    playAnchor() {
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.35);
        } catch (e) {}
    }

    playWin() {
        try {
            this.init();
            if (!this.ctx) return;
            const notes = [261.63, 329.63, 392.00, 523.25]; // C-E-G-C
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(this.ctx.currentTime + idx * 0.12);
                osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
            });
        } catch (e) {}
    }
}

const sounds = new SoundController();

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentArgs = args;
        this.game.selectedPieceId = null;
        this.game.clearHighlights();

        const phase = args.phase || 'move';
        const movesRemaining = args.moves_remaining ?? 2;

        if (isCurrentPlayerActive) {
            if (phase === 'move' && movesRemaining > 0) {
                this.bga.statusBar.setTitle(_('${you} may move up to ${moves} piece(s), or Skip to Push').replace('${moves}', movesRemaining));
                if (args.can_skip_move) {
                    this.bga.statusBar.addActionButton(_('Skip to Mandatory Push'), () => {
                        this.bga.actions.performAction('actSkipToPush');
                    }, { color: 'secondary' });
                }
            } else {
                this.bga.statusBar.setTitle(_('${you} must execute a mandatory push with a square King!'));
            }

            if (args.can_undo) {
                this.bga.statusBar.addActionButton(_('↺ Undo Moves / Restart Turn'), () => {
                    this.bga.actions.performAction('actUndo');
                }, { color: 'warning' });
            }
        } else {
            if (phase === 'move') {
                this.bga.statusBar.setTitle(_('${actplayer} is planning their moves...'));
            } else {
                this.bga.statusBar.setTitle(_('${actplayer} is executing a mandatory push...'));
            }
        }

        this.game.updateBoardInteractions(isCurrentPlayerActive);
    }

    onLeavingState(args, isCurrentPlayerActive) {
        this.game.clearHighlights();
        this.game.selectedPieceId = null;
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.selectedPieceId = null;
        this.currentArgs = null;
        this.ROWS = 4;
        this.COLS = 8;

        this.playerTurn = new PlayerTurn(this, bga);
        this.bga.states.register('PlayerTurn', this.playerTurn);
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;

        // Build game container
        const gameArea = this.bga.gameArea.getElement();
        gameArea.innerHTML = `
            <div id="pft_container" class="pft-container">
                <div class="pft-board-wrapper">
                    <!-- Top Side Rail (Row 1, Cols 3..7) -->
                    <div class="pft-rail pft-rail-top" title="${_('Top Side Rail: Pieces cannot be pushed off here (Cols 3-7)')}">
                        <span class="pft-rail-label">RAIL</span>
                    </div>

                    <!-- 26-Square Board Grid -->
                    <div id="pft_board" class="pft-board"></div>

                    <!-- Bottom Side Rail (Row 4, Cols 2..6) -->
                    <div class="pft-rail pft-rail-bottom" title="${_('Bottom Side Rail: Pieces cannot be pushed off here (Cols 2-6)')}">
                        <span class="pft-rail-label">RAIL</span>
                    </div>
                </div>

                <!-- Info Bar -->
                <div id="pft_info_bar" class="pft-info-bar">
                    <span id="pft_turn_pill" class="pft-pill">Turn ${gamedatas.turn_count || 1}</span>
                    <span id="pft_phase_pill" class="pft-pill pft-pill-phase">Phase: ${gamedatas.turn_phase?.toUpperCase() || 'MOVE'}</span>
                    <span id="pft_anchor_pill" class="pft-pill pft-pill-anchor">Anchor Locked: ${gamedatas.anchored_piece_id ? '#' + gamedatas.anchored_piece_id : 'None'}</span>
                </div>
            </div>
        `;

        this.buildBoardGrid();
        this.renderPieces();
        this.setupNotifications();
    }

    isValidSquare(r, c) {
        if (r < 1 || r > this.ROWS || c < 1 || c > this.COLS) return false;
        if (r === 1 && (c < 3 || c > 7)) return false; // Row 1 has cols 3..7
        if (r === 4 && (c < 2 || c > 6)) return false; // Row 4 has cols 2..6
        return true;
    }

    buildBoardGrid() {
        const board = document.getElementById('pft_board');
        board.innerHTML = '';

        for (let r = 1; r <= this.ROWS; r++) {
            for (let c = 1; c <= this.COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'pft-cell';
                cell.id = `pft_cell_${r}_${c}`;
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (!this.isValidSquare(r, c)) {
                    cell.classList.add('pft-cutout');
                } else {
                    const coord = document.createElement('span');
                    coord.className = 'pft-cell-coord';
                    coord.textContent = `${r},${c}`;
                    cell.appendChild(coord);

                    cell.addEventListener('click', () => this.onCellClicked(r, c));
                }

                board.appendChild(cell);
            }
        }
    }

    renderPieces() {
        // Clear all existing pieces from cells
        document.querySelectorAll('.pft-piece').forEach(el => el.remove());

        const pieces = this.gamedatas.pieces || [];
        const anchoredId = this.gamedatas.anchored_piece_id;

        pieces.forEach(p => {
            if (!p.is_alive || p.pos_x === null || p.pos_y === null) return;

            const r = parseInt(p.pos_y, 10);
            const c = parseInt(p.pos_x, 10);
            const cell = document.getElementById(`pft_cell_${r}_${c}`);
            if (!cell) return;

            const pieceEl = document.createElement('div');
            const isWhite = this.isWhitePlayer(p.player_id);
            const teamClass = isWhite ? 'team-white' : 'team-brown';
            const typeClass = p.piece_type === 'king' ? 'type-king' : 'type-pawn';

            pieceEl.className = `pft-piece ${teamClass} ${typeClass}`;
            pieceEl.id = `pft_piece_${p.id}`;
            pieceEl.dataset.id = p.id;
            pieceEl.dataset.playerId = p.player_id;
            pieceEl.dataset.type = p.piece_type;

            // Icon inside piece
            const icon = document.createElement('div');
            icon.className = 'pft-piece-icon';
            if (p.piece_type === 'king') {
                icon.innerHTML = `<span class="piece-symbol">♚</span>`;
            } else {
                icon.innerHTML = `<span class="piece-symbol">●</span>`;
            }
            pieceEl.appendChild(icon);

            // Anchor badge
            if (parseInt(p.id, 10) === parseInt(anchoredId, 10)) {
                const anchorBadge = document.createElement('div');
                anchorBadge.className = 'pft-anchor-badge';
                anchorBadge.textContent = '⚓';
                anchorBadge.title = _('Anchored piece: Locked and cannot be moved or pushed this turn');
                pieceEl.appendChild(anchorBadge);
            }

            pieceEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onPieceClicked(parseInt(p.id, 10));
            });

            cell.appendChild(pieceEl);
        });
    }

    isWhitePlayer(playerId) {
        const player = this.gamedatas.players?.[playerId];
        if (player) {
            const color = (player.color || player.player_color || '').toLowerCase().replace('#', '');
            // White / Ivory color starts with 'f' (e.g. 'f5eedc', 'ffffff') or is lighter
            if (color === 'f5eedc' || color === 'ffffff' || color.startsWith('f') || color.startsWith('e')) {
                return true;
            }
            if (color === '4a2c11' || color.startsWith('4') || color.startsWith('2') || color.startsWith('0')) {
                return false;
            }
        }
        // Fallback: check first player defined in player table or natural ID
        return false;
    }

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

    updateBoardInteractions(isCurrentPlayerActive) {
        document.querySelectorAll('.pft-piece').forEach(el => el.classList.remove('selectable', 'selected'));
        if (!isCurrentPlayerActive || !this.currentArgs) return;

        const phase = this.currentArgs.phase || 'move';
        const activePlayerId = this.getActivePlayerId();

        if (phase === 'move' && this.currentArgs.moves_remaining > 0) {
            const validMoves = this.currentArgs.valid_moves || {};
            Object.keys(validMoves).forEach(pieceId => {
                const pieceEl = document.getElementById(`pft_piece_${pieceId}`);
                if (pieceEl) pieceEl.classList.add('selectable');
            });
        } else {
            // Push phase
            const validPushes = this.currentArgs.valid_pushes || {};
            Object.keys(validPushes).forEach(kingId => {
                const kingEl = document.getElementById(`pft_piece_${kingId}`);
                if (kingEl) kingEl.classList.add('selectable');
            });
        }
    }

    onPieceClicked(pieceId) {
        if (!this.isCurrentPlayerActive() || !this.currentArgs) return;

        const phase = this.currentArgs.phase || 'move';
        const movesRemaining = this.currentArgs.moves_remaining ?? 2;

        if (phase === 'move' && movesRemaining > 0) {
            const validMoves = this.currentArgs.valid_moves || {};
            if (!validMoves[pieceId]) return;

            this.clearHighlights();
            this.selectedPieceId = pieceId;

            const pieceEl = document.getElementById(`pft_piece_${pieceId}`);
            if (pieceEl) pieceEl.classList.add('selected');

            // Highlight destination squares
            validMoves[pieceId].forEach(({ r, c }) => {
                const cell = document.getElementById(`pft_cell_${r}_${c}`);
                if (cell) cell.classList.add('pft-valid-move');
            });
        } else {
            // Push phase: select King and show directional push arrows
            const validPushes = this.currentArgs.valid_pushes || {};
            if (!validPushes[pieceId]) return;

            this.clearHighlights();
            this.selectedPieceId = pieceId;

            const kingEl = document.getElementById(`pft_piece_${pieceId}`);
            if (kingEl) {
                kingEl.classList.add('selected');
                this.renderPushArrows(pieceId, validPushes[pieceId]);
            }
        }
    }

    renderPushArrows(kingId, directions) {
        const kingEl = document.getElementById(`pft_piece_${kingId}`);
        if (!kingEl) return;

        const arrowSymbols = {
            up: '▲',
            down: '▼',
            left: '◀',
            right: '▶'
        };

        directions.forEach(dir => {
            const arrow = document.createElement('button');
            arrow.className = `pft-push-arrow pft-arrow-${dir}`;
            arrow.textContent = arrowSymbols[dir];
            arrow.title = _('Push ${direction}').replace('${direction}', dir.toUpperCase());
            arrow.addEventListener('click', (e) => {
                e.stopPropagation();
                this.bga.actions.performAction('actPush', {
                    king_id: kingId,
                    direction: dir
                });
            });
            kingEl.appendChild(arrow);
        });
    }

    onCellClicked(r, c) {
        if (!this.selectedPieceId || !this.currentArgs) return;

        const cell = document.getElementById(`pft_cell_${r}_${c}`);
        if (!cell || !cell.classList.contains('pft-valid-move')) return;

        this.bga.actions.performAction('actMovePiece', {
            piece_id: this.selectedPieceId,
            target_r: r,
            target_c: c
        });
    }

    clearHighlights() {
        document.querySelectorAll('.pft-valid-move').forEach(el => el.classList.remove('pft-valid-move'));
        document.querySelectorAll('.pft-piece.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.pft-push-arrow').forEach(el => el.remove());
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }

    async notif_pieceMoved(args) {
        sounds.playSlide();
        const pieceEl = document.getElementById(`pft_piece_${args.piece_id}`);
        const targetCell = document.getElementById(`pft_cell_${args.to_r}_${args.to_c}`);

        if (pieceEl && targetCell) {
            targetCell.appendChild(pieceEl);
        }

        const p = (this.gamedatas.pieces || []).find(x => parseInt(x.id, 10) === parseInt(args.piece_id, 10));
        if (p) {
            p.pos_x = args.to_c;
            p.pos_y = args.to_r;
        }

        this.clearHighlights();
        this.selectedPieceId = null;
    }

    async notif_phaseChanged(args) {
        this.gamedatas.turn_phase = args.phase;
        const phasePill = document.getElementById('pft_phase_pill');
        if (phasePill) {
            phasePill.textContent = `Phase: ${args.phase.toUpperCase()}`;
        }
        this.clearHighlights();
        this.selectedPieceId = null;
    }

    async notif_pushExecuted(args) {
        sounds.playThud();
        setTimeout(() => sounds.playAnchor(), 220);

        // Shift pieces
        const shifted = args.shifted_pieces || [];
        shifted.forEach(s => {
            const pieceEl = document.getElementById(`pft_piece_${s.id}`);
            if (!pieceEl) return;

            if (s.falls_off) {
                pieceEl.classList.add('falling-off');
                setTimeout(() => pieceEl.remove(), 600);
            } else {
                const targetCell = document.getElementById(`pft_cell_${s.to_r}_${s.to_c}`);
                if (targetCell) targetCell.appendChild(pieceEl);
            }
        });

        // Update anchor badge
        document.querySelectorAll('.pft-anchor-badge').forEach(b => b.remove());
        const newAnchorEl = document.getElementById(`pft_piece_${args.anchored_piece_id}`);
        if (newAnchorEl) {
            const b = document.createElement('div');
            b.className = 'pft-anchor-badge';
            b.textContent = '⚓';
            newAnchorEl.appendChild(b);
        }

        const anchorPill = document.getElementById('pft_anchor_pill');
        if (anchorPill) {
            anchorPill.textContent = `Anchor Locked: #${args.anchored_piece_id}`;
        }

        this.clearHighlights();
        this.selectedPieceId = null;
    }

    async notif_newTurn(args) {
        this.gamedatas.turn_count = args.turn_count;
        this.gamedatas.turn_phase = args.turn_phase;
        this.gamedatas.anchored_piece_id = args.anchored_piece_id;

        const turnPill = document.getElementById('pft_turn_pill');
        if (turnPill) turnPill.textContent = `Turn ${args.turn_count}`;

        const phasePill = document.getElementById('pft_phase_pill');
        if (phasePill) phasePill.textContent = `Phase: ${args.turn_phase.toUpperCase()}`;

        this.clearHighlights();
        this.selectedPieceId = null;
    }

    async notif_turnUndone(args) {
        sounds.playSlide();
        this.gamedatas.turn_phase = args.turn_phase;
        this.gamedatas.pieces = args.pieces;

        const phasePill = document.getElementById('pft_phase_pill');
        if (phasePill) {
            phasePill.textContent = `Phase: ${args.turn_phase.toUpperCase()}`;
        }

        // Re-render pieces into restored positions
        this.renderPieces();
        this.clearHighlights();
        this.selectedPieceId = null;
    }

    async notif_gameWon(args) {
        sounds.playWin();
        this.bga.gameArea.getElement().insertAdjacentHTML('afterbegin', `
            <div class="pft-victory-banner">
                <h2>🏆 ${args.winner_name} WINS!</h2>
            </div>
        `);
    }
}
