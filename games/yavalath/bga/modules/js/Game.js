/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * yavalath implementation : © Jayadev Haddadi
 *
 * Game.js - Client Interface for Yavalath
 *
 * Invented by Cameron Browne & Ludi (Computer Program)
 * Published by nestorgames
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

    playPlace() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {}
    }

    playWin() {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.18, this.ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(this.ctx.currentTime + idx * 0.1);
                osc.stop(this.ctx.currentTime + idx * 0.1 + 0.4);
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
        if (active) {
            this.bga.statusBar.setTitle(_('${you} must place a stone (Connect 4 to WIN, avoid 3!)'));
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a placement...'));
        }
        this.game.updateBoardInteractions(active);
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.HEX_RADIUS = 4;
        this.HEX_SIZE = 30;
        this.boardData = {};
        this.playerColors = {};
        this.eliminatedPlayers = [];

        // Register State Handlers
        if (this.bga?.states && typeof this.bga.states.register === 'function') {
            this.bga.states.register('PlayerTurn', new PlayerTurn(this, bga));
        }
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

    getCurrentPlayerId() {
        if (this.bga?.players && typeof this.bga.players.getCurrentPlayerId === 'function') {
            return this.bga.players.getCurrentPlayerId();
        }
        if (typeof gameui !== 'undefined' && gameui.player_id) {
            return Number(gameui.player_id);
        }
        return 0;
    }

    setup(gamedatas) {
        this.HEX_RADIUS = gamedatas.hex_radius || 4;
        this.boardData = gamedatas.board || {};
        this.playerColors = gamedatas.player_colors || {};
        this.eliminatedPlayers = gamedatas.eliminated_players || [];

        this.initDom();
        this.renderBoard();
        this.setupNotifications();
        this.setupResponsiveScaling();
    }

    initDom() {
        const main = document.getElementById('game_play_area') || document.body;
        main.innerHTML = `
            <div id="yavalath_container">
                <div id="yavalath_header_info">
                    <span class="yavalath_rule_badge">Win: 4 in a row</span>
                    <span class="yavalath_rule_badge yavalath_lose_badge">Lose: 3 in a row</span>
                </div>
                <div id="yavalath_board_scaler">
                    <div id="yavalath_board_wrapper">
                        <svg id="yavalath_board_svg"></svg>
                    </div>
                </div>
                <div id="yavalath_attribution">
                    Invented by <strong>Cameron Browne</strong> &amp; <strong>Ludi</strong> &bull; Published by <strong>nestorgames</strong>
                </div>
            </div>
        `;
    }

    getHexCorners(cx, cy, size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
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
        const svg = document.getElementById('yavalath_board_svg');
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

        let html = '';

        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                if (q + r >= -radius && q + r <= radius) {
                    const { x, y } = this.axialToPixel(q, r, centerX, centerY, size);
                    const points = this.getHexCorners(x, y, size);
                    const key = `${q}_${r}`;
                    const cell = this.boardData[key];
                    const color = cell ? cell.color : null;

                    html += `
                        <g class="yavalath_cell" data-q="${q}" data-r="${r}">
                            <polygon class="yavalath_hex" points="${points}" />
                            <circle class="yavalath_stone ${color ? 'yavalath_stone_' + color : ''}"
                                    cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.7).toFixed(1)}"
                                    style="${color ? '' : 'display:none;'}" />
                            <circle class="yavalath_ghost_stone"
                                    cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 0.7).toFixed(1)}"
                                    style="display:none;" />
                        </g>
                    `;
                }
            }
        }

        svg.innerHTML = html;

        svg.querySelectorAll('.yavalath_cell').forEach(cellEl => {
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

        sounds.playPlace();
        this.bga.actions.performAction('actPlaceStone', { q, r });
    }

    onCellHover(cellEl, isHover) {
        if (!this.isCurrentPlayerActive()) return;

        const ghost = cellEl.querySelector('.yavalath_ghost_stone');
        const stone = cellEl.querySelector('.yavalath_stone');
        if (!ghost || (stone && stone.style.display !== 'none')) return;

        if (isHover) {
            const myId = this.getCurrentPlayerId();
            const myColor = this.playerColors[myId] || 'white';
            ghost.className = `yavalath_ghost_stone yavalath_ghost_${myColor}`;
            ghost.style.display = 'block';
        } else {
            ghost.style.display = 'none';
        }
    }

    updateBoardInteractions(active) {
        const cells = document.querySelectorAll('.yavalath_cell');
        cells.forEach(c => {
            const q = c.getAttribute('data-q');
            const r = c.getAttribute('data-r');
            const key = `${q}_${r}`;
            const occupied = this.boardData[key] && this.boardData[key].color;
            if (active && !occupied) {
                c.classList.add('yavalath_valid_target');
            } else {
                c.classList.remove('yavalath_valid_target');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.yavalath_cell').forEach(c => {
            c.classList.remove('yavalath_valid_target');
            const ghost = c.querySelector('.yavalath_ghost_stone');
            if (ghost) ghost.style.display = 'none';
        });
    }

    setupNotifications() {
        if (this.bga?.notifications?.setupPromiseNotifications) {
            this.bga.notifications.setupPromiseNotifications();
        } else if (typeof dojo !== 'undefined' && typeof dojo.subscribe === 'function') {
            dojo.subscribe('stonePlaced', this, 'notif_stonePlaced');
            dojo.subscribe('playerEliminated', this, 'notif_playerEliminated');
            dojo.subscribe('endGameScores', this, 'notif_endGameScores');
        } else if (typeof this.bga?.notifications?.subscribe === 'function') {
            this.bga.notifications.subscribe('stonePlaced', (notif) => this.notif_stonePlaced(notif));
            this.bga.notifications.subscribe('playerEliminated', (notif) => this.notif_playerEliminated(notif));
            this.bga.notifications.subscribe('endGameScores', (notif) => this.notif_endGameScores(notif));
        }
    }

    _getNotifArgs(notif) {
        if (!notif) return {};
        return (notif.args !== undefined) ? notif.args : notif;
    }

    notif_stonePlaced(notif) {
        const { q, r, color, result, line } = this._getNotifArgs(notif);
        const key = `${q}_${r}`;
        this.boardData[key] = { q, r, color };

        const cell = document.querySelector(`.yavalath_cell[data-q="${q}"][data-r="${r}"]`);
        if (cell) {
            const stone = cell.querySelector('.yavalath_stone');
            const ghost = cell.querySelector('.yavalath_ghost_stone');
            if (ghost) ghost.style.display = 'none';
            if (stone) {
                stone.className = `yavalath_stone yavalath_stone_${color}`;
                stone.style.display = 'block';
            }
        }

        // Highlight lines if win/lose
        if (result === 'win' && line && line.length) {
            sounds.playWin();
            line.forEach(pt => {
                const c = document.querySelector(`.yavalath_cell[data-q="${pt.q}"][data-r="${pt.r}"]`);
                if (c) c.classList.add('yavalath_line_win');
            });
        } else if (result === 'lose' && line && line.length) {
            line.forEach(pt => {
                const c = document.querySelector(`.yavalath_cell[data-q="${pt.q}"][data-r="${pt.r}"]`);
                if (c) c.classList.add('yavalath_line_lose');
            });
        } else {
            sounds.playPlace();
        }
    }

    notif_playerEliminated(notif) {
        sounds.playPlace();
        const args = this._getNotifArgs(notif);
        const eliminatedId = args.player_id;
        if (!this.eliminatedPlayers.includes(eliminatedId)) {
            this.eliminatedPlayers.push(eliminatedId);
        }
    }

    notif_endGameScores(notif) {
        sounds.playWin();
    }

    setupResponsiveScaling() {
        window.addEventListener('resize', () => this.updateBoardScale());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateBoardScale(), 150);
        });
        setTimeout(() => this.updateBoardScale(), 100);
    }

    updateBoardScale() {
        const container = document.getElementById('yavalath_container');
        const scaler = document.getElementById('yavalath_board_scaler');
        const wrapper = document.getElementById('yavalath_board_wrapper');
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

