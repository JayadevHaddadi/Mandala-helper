/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * omegatest implementation : © Jayadev Haddadi
 *
 * Game.js - Client Interface for Omega
 *------
 */

class SoundController {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    }

    playClick() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
    }

    playPlace() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playReset() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playChime() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(this.ctx.currentTime + idx * 0.1);
                osc.stop(this.ctx.currentTime + idx * 0.1 + 0.3);
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
        args = args || {};
        this.game.currentArgs = args;
        this.game.clearHighlights();

        const active = (isCurrentPlayerActive !== undefined) ? isCurrentPlayerActive : this.game.isCurrentPlayerActive();
        this.updateControls(args, active);
        this.game.updateBoardInteractions(active);
    }

    updateControls(args, active) {
        this.game.clearActionButtons();

        if (active) {
            const remaining = args.remaining_colors || ['white', 'black'];
            const placed = args.placed_this_turn || [];

            if (remaining.length > 0) {
                const currentColor = remaining[0];
                const stepNum = placed.length + 1;
                const totalSteps = stepNum + remaining.length - 1;

                this.bga.statusBar.setTitle(
                    _('${you} must place a <b>${color}</b> stone (${step}/${total})'),
                    {
                        color: currentColor.toUpperCase(),
                        step: stepNum,
                        total: totalSteps,
                        i18n: ['color']
                    }
                );
            }

            // Pie Rule swap button (only on turn 2 before any stones placed)
            if (args.pie_rule_available) {
                this.game.addActionButton('btnSwapColors', _('Swap Colors (Pie Rule)'), () => {
                    this.bga.actions.performAction('actSwapColors', {});
                }, 'secondary');
            }

            // Reset turn placements button
            if (placed.length > 0) {
                this.game.addActionButton('btnUndoTurn', _('↺ Reset Turn'), () => {
                    this.bga.actions.performAction('actUndoTurn', {});
                }, 'danger');
            }
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is placing stones...'));
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
        this.game.clearActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.HEX_RADIUS = 4;
        this.HEX_SIZE = 30; // pixels
        this.currentArgs = null;
        this.boardData = {};
        this.playerColors = {};
        this.activeColors = ['white', 'black'];

        // Register State Handlers
        this.playerTurn = new PlayerTurn(this, bga);
        this.bga.states.register('PlayerTurn', this.playerTurn);
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

    addActionButton(id, text, callback, color = 'primary') {
        if (!this.bga?.statusBar?.addActionButton) return;
        try {
            this.bga.statusBar.addActionButton(text, callback, { color: color, id: id });
        } catch (e) {
            try {
                this.bga.statusBar.addActionButton(id, text, callback, color);
            } catch (e2) {
                console.warn('Could not add action button:', e2);
            }
        }
    }

    setup(gamedatas) {
        this.HEX_RADIUS = gamedatas.hex_radius || 4;
        this.boardData = gamedatas.board || {};
        this.playerColors = gamedatas.player_colors || {};
        this.activeColors = gamedatas.active_colors || ['white', 'black'];
        this.currentArgs = {
            placed_this_turn: gamedatas.placed_this_turn || [],
            remaining_colors: this.getRemainingColors(gamedatas.placed_this_turn || []),
            scores: gamedatas.scores || {},
            pie_rule_available: gamedatas.pie_rule_available || false,
        };

        this.initDom();
        this.renderBoard();
        this.updateScoresDisplay(gamedatas.scores || {});
        this.setupNotifications();
        this.setupResponsiveScaling();
    }

    getRemainingColors(placed) {
        placed = placed || [];
        return this.activeColors.filter(c => !placed.includes(c));
    }

    initDom() {
        const main = (this.bga?.gameArea?.getElement && this.bga.gameArea.getElement()) ||
                     document.getElementById('game_play_area') ||
                     document.body;

        main.innerHTML = `
            <div id="omega_container">
                <div id="omega_score_bar"></div>
                <div id="omega_board_scaler">
                    <div id="omega_board_wrapper">
                        <svg id="omega_board_svg"></svg>
                    </div>
                </div>
                <div id="omega_attribution">
                    Designed by <strong>Néstor Romeral Andrés</strong> &bull; Published by <strong>nestorgames</strong>
                </div>
            </div>
        `;
    }

    getHexCorners(cx, cy, size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30); // pointy-topped
            const x = cx + size * Math.cos(angle);
            const y = cy + size * Math.sin(angle);
            points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return points.join(' ');
    }

    axialToPixel(q, r, cx, cy, size) {
        const x = cx + size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
        const y = cy + size * (3 / 2 * r);
        return { x, y };
    }

    renderBoard() {
        const svg = document.getElementById('omega_board_svg');
        if (!svg) return;

        const radius = this.HEX_RADIUS;
        const size = this.HEX_SIZE;
        const svgWidth = 620;
        const svgHeight = 620;
        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2;

        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute('width', `${svgWidth}`);
        svg.setAttribute('height', `${svgHeight}`);

        // Define 3D radial gradients for all stones
        let html = `
            <defs>
                <radialGradient id="omega_grad_white" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="70%" stop-color="#e0e0e0"/>
                    <stop offset="100%" stop-color="#9e9e9e"/>
                </radialGradient>
                <radialGradient id="omega_grad_black" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#555555"/>
                    <stop offset="70%" stop-color="#212121"/>
                    <stop offset="100%" stop-color="#000000"/>
                </radialGradient>
                <radialGradient id="omega_grad_red" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#ff7b7b"/>
                    <stop offset="70%" stop-color="#d32f2f"/>
                    <stop offset="100%" stop-color="#7f0000"/>
                </radialGradient>
                <radialGradient id="omega_grad_blue" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#64b5f6"/>
                    <stop offset="70%" stop-color="#1976d2"/>
                    <stop offset="100%" stop-color="#0d47a1"/>
                </radialGradient>
            </defs>
        `;

        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                if (q + r >= -radius && q + r <= radius) {
                    const { x, y } = this.axialToPixel(q, r, centerX, centerY, size);
                    const points = this.getHexCorners(x, y, size);
                    const key = `${q}_${r}`;
                    const cell = this.boardData[key];
                    const color = cell ? cell.color : null;

                    html += `
                        <g class="omega_cell" data-q="${q}" data-r="${r}">
                            <polygon class="omega_hex" points="${points}" />
                            <circle class="omega_stone ${color ? 'omega_stone_' + color : ''}"
                                    cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.68).toFixed(1)}"
                                    style="${color ? '' : 'display:none;'}" />
                            <circle class="omega_ghost_stone"
                                    cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.68).toFixed(1)}"
                                    style="display:none;" />
                        </g>
                    `;
                }
            }
        }

        svg.innerHTML = html;

        // Add event listeners to cells
        svg.querySelectorAll('.omega_cell').forEach(cellEl => {
            cellEl.addEventListener('click', () => {
                const q = parseInt(cellEl.getAttribute('data-q'), 10);
                const r = parseInt(cellEl.getAttribute('data-r'), 10);
                this.onCellClick(q, r);
            });
            cellEl.addEventListener('mouseenter', () => {
                this.onCellHover(cellEl, true);
            });
            cellEl.addEventListener('mouseleave', () => {
                this.onCellHover(cellEl, false);
            });
        });
    }

    onCellClick(q, r) {
        if (!this.isCurrentPlayerActive()) return;

        const key = `${q}_${r}`;
        if (this.boardData[key] && this.boardData[key].color) return;

        const remaining = this.currentArgs?.remaining_colors || this.activeColors;
        if (!remaining.length) return;

        const colorToPlace = remaining[0];
        sounds.playPlace();

        this.bga.actions.performAction('actPlaceStone', {
            q: q,
            r: r,
            color: colorToPlace
        });
    }

    onCellHover(cellEl, isHover) {
        if (!this.isCurrentPlayerActive()) return;

        const ghost = cellEl.querySelector('.omega_ghost_stone');
        const stone = cellEl.querySelector('.omega_stone');
        if (!ghost || (stone && stone.style.display !== 'none')) return;

        if (isHover) {
            const remaining = this.currentArgs?.remaining_colors || this.activeColors;
            if (remaining.length) {
                const nextColor = remaining[0];
                ghost.className = `omega_ghost_stone omega_ghost_${nextColor}`;
                ghost.style.display = 'block';
                sounds.playClick();
            }
        } else {
            ghost.style.display = 'none';
        }
    }

    updateBoardInteractions(active) {
        const cells = document.querySelectorAll('.omega_cell');
        cells.forEach(c => {
            const q = c.getAttribute('data-q');
            const r = c.getAttribute('data-r');
            const key = `${q}_${r}`;
            const occupied = this.boardData[key] && this.boardData[key].color;
            if (active && !occupied) {
                c.classList.add('omega_valid_target');
            } else {
                c.classList.remove('omega_valid_target');
            }
        });
    }

    updateScoresDisplay(scores) {
        const bar = document.getElementById('omega_score_bar');
        if (!bar) return;

        let html = '';
        for (const [playerId, data] of Object.entries(scores)) {
            const pInfo = this.bga?.players?.getPlayer?.(playerId) || {};
            const pName = pInfo.name || `Player ${playerId}`;
            const color = data.color || 'white';
            const groupsStr = data.groups?.length ? data.groups.join(' × ') : '0';
            html += `
                <div class="omega_score_item omega_score_${color}">
                    <span class="omega_color_pip omega_pip_${color}"></span>
                    <strong class="omega_player_name">${pName}</strong>:
                    <span class="omega_score_val">${data.score}</span>
                    <span class="omega_score_breakdown">(${groupsStr})</span>
                </div>
            `;
        }
        bar.innerHTML = html;
    }

    clearHighlights() {
        document.querySelectorAll('.omega_cell').forEach(c => {
            c.classList.remove('omega_valid_target');
            const ghost = c.querySelector('.omega_ghost_stone');
            if (ghost) ghost.style.display = 'none';
        });
    }

    clearActionButtons() {
        if (typeof this.bga?.statusBar?.clearActionButtons === 'function') {
            this.bga.statusBar.clearActionButtons();
        }
    }

    setupNotifications() {
        if (!this.bga?.notifications) return;

        this.bga.notifications.subscribe('stonePlaced', (notif) => {
            const { q, r, color, placed_this_turn, remaining_colors, scores } = notif.args;
            const key = `${q}_${r}`;
            this.boardData[key] = { q, r, color };

            // Update DOM cell
            const cell = document.querySelector(`.omega_cell[data-q="${q}"][data-r="${r}"]`);
            if (cell) {
                const stone = cell.querySelector('.omega_stone');
                const ghost = cell.querySelector('.omega_ghost_stone');
                if (ghost) ghost.style.display = 'none';
                if (stone) {
                    stone.className = `omega_stone omega_stone_${color}`;
                    stone.style.display = 'block';
                }
            }

            if (this.currentArgs) {
                this.currentArgs.placed_this_turn = placed_this_turn || [];
                this.currentArgs.remaining_colors = remaining_colors || this.getRemainingColors(placed_this_turn);
                if (this.isCurrentPlayerActive()) {
                    this.playerTurn.updateControls(this.currentArgs, true);
                    this.updateBoardInteractions(true);
                }
            }

            sounds.playPlace();
            this.updateScoresDisplay(scores);
        });

        this.bga.notifications.subscribe('turnReset', (notif) => {
            const { cleared, remaining_colors, placed_this_turn, scores } = notif.args;
            (cleared || []).forEach(pt => {
                const key = `${pt.q}_${pt.r}`;
                if (this.boardData[key]) {
                    this.boardData[key].color = null;
                }
                const cell = document.querySelector(`.omega_cell[data-q="${pt.q}"][data-r="${pt.r}"]`);
                if (cell) {
                    const stone = cell.querySelector('.omega_stone');
                    if (stone) {
                        stone.style.display = 'none';
                        stone.className = 'omega_stone';
                    }
                }
            });

            if (this.currentArgs) {
                this.currentArgs.placed_this_turn = placed_this_turn || [];
                this.currentArgs.remaining_colors = remaining_colors || this.activeColors;
                if (this.isCurrentPlayerActive()) {
                    this.playerTurn.updateControls(this.currentArgs, true);
                    this.updateBoardInteractions(true);
                }
            }

            sounds.playReset();
            this.updateScoresDisplay(scores);
        });

        this.bga.notifications.subscribe('colorsSwapped', (notif) => {
            this.playerColors = notif.args.player_colors;
            sounds.playChime();
            this.updateScoresDisplay(notif.args.scores);
        });

        this.bga.notifications.subscribe('endGameScores', (notif) => {
            sounds.playChime();
            this.updateScoresDisplay(notif.args.scores);
        });
    }

    setupResponsiveScaling() {
        window.addEventListener('resize', () => this.updateBoardScale());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateBoardScale(), 150);
        });
        setTimeout(() => this.updateBoardScale(), 100);
    }

    updateBoardScale() {
        const container = document.getElementById('omega_container');
        const scaler = document.getElementById('omega_board_scaler');
        const wrapper = document.getElementById('omega_board_wrapper');
        if (!container || !scaler || !wrapper) return;

        const baseWidth = 620;
        const baseHeight = 620;
        const containerWidth = container.clientWidth || window.innerWidth;
        const availableWidth = Math.max(280, containerWidth - 16);

        let scale = Math.min(1.0, availableWidth / baseWidth);
        const scaledW = Math.round(baseWidth * scale);
        const scaledH = Math.round(baseHeight * scale);

        scaler.style.width = `${scaledW}px`;
        scaler.style.height = `${scaledH}px`;
        wrapper.style.transform = `scale(${scale})`;
    }
}

export default Game;
