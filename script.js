// Game data structure
const colors = [
    { name: 'Red', className: 'bg-red', hex: '#ff5252' },
    { name: 'Green', className: 'bg-green', hex: '#69f0ae' },
    { name: 'Black', className: 'bg-black', hex: '#424242' },
    { name: 'Yellow', className: 'bg-yellow', hex: '#ffd740' },
    { name: 'Purple', className: 'bg-purple', hex: '#e040fb' },
    { name: 'Orange', className: 'bg-orange', hex: '#ffab40' }
];

const colorNames = colors.map(color => color.name);

// Maximum cards per color in Mandala
const MAX_CARDS = 10;
const TOTAL_PER_COLOR = 18;

// Helper Maps for Parser
const numberWords = new Map([
    ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10]
]);

const colorAliases = new Map([
    ['red', 'Red'], ['green', 'Green'], ['black', 'Black'],
    ['yellow', 'Yellow'], ['purple', 'Purple'], ['orange', 'Orange']
]);

// State
let gameState = {
    player1: {}, // You (Bottom)
    player2: {}  // Opponent (Top)
};

let riverOrder = {
    player1: [],
    player2: []
};

// Tracked seen cards from board/log actions (out of 18 per color)
let seenCards = {
    Red: 0,
    Green: 0,
    Black: 0,
    Yellow: 0,
    Purple: 0,
    Orange: 0
};

// Opponent starting mystery cards
const opponentMysteryCards = 2;

// Defensive helper: Ensure valid state objects and numbers
function ensureValidState() {
    if (!gameState || typeof gameState !== 'object') gameState = {};
    if (!gameState.player1 || typeof gameState.player1 !== 'object') gameState.player1 = {};
    if (!gameState.player2 || typeof gameState.player2 !== 'object') gameState.player2 = {};

    colors.forEach(c => {
        if (typeof gameState.player1[c.name] !== 'number' || Number.isNaN(gameState.player1[c.name])) {
            gameState.player1[c.name] = 0;
        }
        if (typeof gameState.player2[c.name] !== 'number' || Number.isNaN(gameState.player2[c.name])) {
            gameState.player2[c.name] = 0;
        }
        if (typeof seenCards[c.name] !== 'number' || Number.isNaN(seenCards[c.name])) {
            seenCards[c.name] = 0;
        }
    });

    if (!riverOrder || typeof riverOrder !== 'object') riverOrder = {};
    if (!Array.isArray(riverOrder.player1)) riverOrder.player1 = [];
    if (!Array.isArray(riverOrder.player2)) riverOrder.player2 = [];
}

// Initialization
function initializeGame() {
    gameState.player1 = {};
    gameState.player2 = {};
    colors.forEach(color => {
        gameState.player1[color.name] = 0;
        gameState.player2[color.name] = 0;
        seenCards[color.name] = 0;
    });

    riverOrder.player1 = [];
    riverOrder.player2 = [];
    ensureValidState();
}

// Modal Control Functions (Exposed Globally)
window.openLogModal = function () {
    const input = document.getElementById('log-input');
    const status = document.getElementById('log-status');
    const modal = document.getElementById('log-modal');
    if (input) input.value = '';
    if (status) status.textContent = '';
    if (modal) modal.style.display = 'block';
};

window.closeLogModal = function () {
    const modal = document.getElementById('log-modal');
    if (modal) modal.style.display = 'none';
};

window.clearLogText = function () {
    const input = document.getElementById('log-input');
    const status = document.getElementById('log-status');
    if (input) input.value = '';
    if (status) status.textContent = '';
};

window.openHelpModal = function () {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'block';
};

window.closeHelpModal = function () {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
};

// Rendering
function renderApp() {
    ensureValidState();
    renderSection('player1'); // You (Bottom)
    renderSection('player2'); // Opponent (Top)
    updateScoreDisplay();
    renderCardTracker();
}

function renderSection(player) {
    const riverContainer = document.getElementById(`${player}-river`);
    const poolContainer = document.getElementById(`${player}-pool`);

    if (!riverContainer || !poolContainer) return;

    riverContainer.innerHTML = '';
    poolContainer.innerHTML = '';

    const currentRiver = riverOrder[player] || [];

    // Render River Slots (Always 6 slots)
    for (let i = 0; i < 6; i++) {
        const colorName = currentRiver[i];
        const slotEl = document.createElement('div');
        slotEl.className = `card-slot ${colorName ? 'active' : 'empty'}`;

        // Value Label (1-6)
        const valEl = document.createElement('div');
        valEl.className = 'river-value';
        valEl.textContent = i + 1;
        slotEl.appendChild(valEl);

        if (colorName) {
            const colorData = colors.find(c => c.name === colorName);
            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${colorData ? colorData.className : ''}`;
            swatch.textContent = colorName;
            slotEl.appendChild(swatch);

            // Controls
            const controls = document.createElement('div');
            controls.className = 'card-controls';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-circle';
            btnMinus.textContent = '−';
            btnMinus.onclick = () => updateCount(player, colorName, -1);
            if ((gameState[player][colorName] || 0) <= 0) btnMinus.disabled = true;

            const countSpan = document.createElement('span');
            countSpan.className = 'card-count';
            countSpan.textContent = gameState[player][colorName] || 0;

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-circle';
            btnPlus.textContent = '+';
            btnPlus.onclick = () => updateCount(player, colorName, 1);
            if ((gameState[player][colorName] || 0) >= MAX_CARDS) btnPlus.disabled = true;

            controls.append(btnMinus, countSpan, btnPlus);
            slotEl.appendChild(controls);
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#555';
            placeholder.textContent = 'Empty';
            slotEl.appendChild(placeholder);
        }

        riverContainer.appendChild(slotEl);
    }

    // Render Pool (Unassigned colors)
    const assignedColors = new Set(currentRiver);
    colors.forEach(color => {
        if (!assignedColors.has(color.name)) {
            const count = (gameState[player] && gameState[player][color.name]) ? gameState[player][color.name] : 0;
            const poolItem = document.createElement('div');
            poolItem.className = `card-slot pool-card ${count > 0 ? 'active' : ''}`;
            poolItem.style.width = '75px';

            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${color.className}`;
            swatch.textContent = color.name;
            poolItem.appendChild(swatch);

            // Display count indicator for unassigned colors in cup
            const countDiv = document.createElement('div');
            countDiv.className = 'pool-card-count';
            if (count > 0) {
                countDiv.innerHTML = `<span class="pool-badge">${count}</span>`;
            } else {
                countDiv.innerHTML = `<span class="pool-badge-zero">0</span>`;
            }
            poolItem.appendChild(countDiv);

            // Clicking unassigned color adds to River
            poolItem.style.cursor = 'pointer';
            poolItem.title = `Click to add ${color.name} to River`;
            poolItem.onclick = () => addToRiver(player, color.name);

            poolContainer.appendChild(poolItem);
        }
    });
}

// Logic
function updateCount(player, colorName, delta) {
    ensureValidState();
    const newVal = (gameState[player][colorName] || 0) + delta;
    if (newVal >= 0 && newVal <= MAX_CARDS) {
        gameState[player][colorName] = newVal;
        seenCards[colorName] = Math.max(seenCards[colorName], (gameState.player1[colorName] || 0) + (gameState.player2[colorName] || 0));
        renderApp();
        saveGameState();
    }
}

function addToRiver(player, colorName) {
    ensureValidState();
    if (!riverOrder[player].includes(colorName)) {
        if (riverOrder[player].length < 6) {
            riverOrder[player].push(colorName);
            renderApp();
            saveGameState();
        } else {
            alert("River is full (maximum 6 colors)!");
        }
    }
}

function updateScoreDisplay() {
    ensureValidState();

    // Player 1 (Bottom - You)
    const p1Score = MandalaCore.calculateTotalScore(gameState.player1, riverOrder.player1, colorNames);
    const p1TotalCards = Object.values(gameState.player1).reduce((sum, val) => sum + (val || 0), 0);
    const p1ScoreEl = document.getElementById('player1-score');
    const p1CardsEl = document.getElementById('player1-cards');
    if (p1ScoreEl) p1ScoreEl.textContent = p1Score;
    if (p1CardsEl) p1CardsEl.textContent = p1TotalCards;

    // Player 2 (Top - Opponent)
    const p2Score = MandalaCore.calculateTotalScore(gameState.player2, riverOrder.player2, colorNames);
    const p2LoggedCards = Object.values(gameState.player2).reduce((sum, val) => sum + (val || 0), 0);
    const p2TotalCards = p2LoggedCards + opponentMysteryCards;
    const p2ScoreEl = document.getElementById('player2-score');
    const p2CardsEl = document.getElementById('player2-cards');
    if (p2ScoreEl) p2ScoreEl.textContent = p2Score;
    if (p2CardsEl) p2CardsEl.textContent = p2TotalCards;

    const mysteryEl = document.getElementById('player2-mystery-score');
    if (mysteryEl) {
        mysteryEl.textContent = ` (+${opponentMysteryCards * 6} points max)`;
    }
}

function renderCardTracker() {
    const listEl = document.getElementById('tracker-list');
    const unseenHeaderEl = document.getElementById('tracker-unseen-count');
    if (!listEl) return;

    const effectiveSeen = {};
    colors.forEach(c => {
        const p1CupCount = (gameState.player1 && gameState.player1[c.name]) || 0;
        const p2CupCount = (gameState.player2 && gameState.player2[c.name]) || 0;
        const loggedSeen = seenCards[c.name] || 0;
        effectiveSeen[c.name] = Math.min(TOTAL_PER_COLOR, Math.max(loggedSeen, p1CupCount + p2CupCount));
    });

    const stats = MandalaCore.calculateCardCountsAndProbabilities({
        seenMap: effectiveSeen,
        colors: colorNames
    });

    if (unseenHeaderEl) {
        unseenHeaderEl.textContent = stats.totalUnseen;
    }

    listEl.innerHTML = '';

    colors.forEach(color => {
        const cName = color.name;
        const seenCount = stats.seen[cName] || 0;
        const remainingCount = stats.remaining[cName] || 0;
        const drawPct = stats.drawProbability[cName] || 0;
        const hiddenPct = stats.hiddenOdds[cName] || 0;
        const barPct = Math.round((seenCount / TOTAL_PER_COLOR) * 100);

        const row = document.createElement('div');
        row.className = 'tracker-row';

        row.innerHTML = `
            <div class="tracker-row-header">
                <div class="tracker-color-pill">
                    <div class="tracker-dot" style="background-color: ${color.hex};"></div>
                    <span>${cName}</span>
                </div>
                <div class="tracker-counts">
                    <strong>${seenCount}</strong> / 18 seen (<span style="color:${remainingCount > 0 ? '#fff' : '#666'}">${remainingCount} left</span>)
                </div>
            </div>
            <div class="tracker-bar-bg">
                <div class="tracker-bar-fill" style="width: ${barPct}%; background-color: ${color.hex};"></div>
            </div>
            <div class="tracker-stats">
                <span>🎯 Draw next: <strong class="tracker-stat-highlight">${drawPct}%</strong></span>
                <span>🕵️ In Opp. 2 hidden: <strong>${hiddenPct}%</strong></span>
            </div>
        `;

        listEl.appendChild(row);
    });
}

// Helpers for Parser
function resolveCount(rawCount) {
    const lower = rawCount.toLowerCase();
    if (numberWords.has(lower)) return numberWords.get(lower);
    const numeric = Number.parseInt(lower, 10);
    return Number.isNaN(numeric) ? 0 : numeric;
}

function resolveColor(rawColor) {
    const lower = rawColor.toLowerCase();
    return colorAliases.get(lower) || null;
}

function isTimerOrMetric(line) {
    if (!line) return true;
    if (/^\d+$/.test(line)) return true;
    if (/^\d+\s*:\s*\d+/.test(line)) return true;
    if (/^\d+\s+\d+/i.test(line)) return true;
    if (/\b(?:days?|hours?|min(?:utes?)?|sec(?:onds?)?|mn)\b/i.test(line)) return true;
    if (/^\d+\s*(?:h|m|s)\s*\d*/i.test(line)) return true;
    return false;
}

function isUiNoise(line) {
    if (!line) return true;
    return /^(it'?s your turn|you must take|how to play|\?|deck|discarded|mandala|options|credits|table|move|progression|logo|mountain|field|discard|chat at this table|two cards are added|both players receive|the color of)/i.test(line);
}

function cleanPlayerName(line) {
    if (!line) return '';
    const linkMatch = line.match(/^\[(.*?)\]\(.*?\)$/);
    if (linkMatch) return linkMatch[1].trim();
    return line.replace(/^\[(.*?)\]/, "$1").trim();
}

function parseBgaHeader(text) {
    if (!text) return null;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const cupIndex = lines.findIndex(l => /^your cup:?$/i.test(l));
    if (cupIndex === -1) return null;

    let yourName = '';
    for (let i = cupIndex - 1; i >= 0; i--) {
        const line = lines[i];
        if (isTimerOrMetric(line) || isUiNoise(line)) continue;
        yourName = cleanPlayerName(line);
        break;
    }

    const counts = {};
    const cupColors = ['Black', 'Green', 'Purple', 'Yellow', 'Orange', 'Red'];
    let numbersFound = 0;
    let afterCupIndex = cupIndex + 1;
    for (let i = cupIndex + 1; i < lines.length && numbersFound < 6; i++) {
        const num = Number.parseInt(lines[i], 10);
        if (!Number.isNaN(num)) {
            counts[cupColors[numbersFound]] = num;
            numbersFound++;
            afterCupIndex = i + 1;
        } else {
            break;
        }
    }

    let opponentName = '';
    for (let i = afterCupIndex; i < lines.length; i++) {
        const line = lines[i];
        if (/^(?:move\s+\d+|[a-zA-Z0-9_\-]+\s+adds)/i.test(line)) break;
        if (isTimerOrMetric(line) || isUiNoise(line)) continue;
        opponentName = cleanPlayerName(line);
        break;
    }

    return {
        yourName,
        opponentName,
        counts: numbersFound === 6 ? counts : null
    };
}

function parseLogText(logText, options) {
    const newestFirst = !options || options.newestFirst !== false;
    const lines = logText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (newestFirst) lines.reverse();

    const cupRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+Cup/i;
    const riverRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+River/i;
    const mountainRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+builds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Mountain/i;
    const fieldRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+grows\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Field/i;
    const discardRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+discards\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card/i;

    const events = [];
    lines.forEach(line => {
        const cleanLine = line.replace(/^\d{1,2}:\d{2}(?:\s*(?:AM|PM))?\s*/i, '').trim();

        let match = cleanLine.match(cupRegex);
        if (match && match.groups) {
            events.push({ player: cleanPlayerName(match.groups.player), count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'cup' });
            return;
        }
        match = cleanLine.match(riverRegex);
        if (match && match.groups) {
            events.push({ player: cleanPlayerName(match.groups.player), count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'river' });
            return;
        }
        match = cleanLine.match(mountainRegex);
        if (match && match.groups) {
            events.push({ player: cleanPlayerName(match.groups.player), count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'mountain' });
            return;
        }
        match = cleanLine.match(fieldRegex);
        if (match && match.groups) {
            events.push({ player: cleanPlayerName(match.groups.player), count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'field' });
            return;
        }
        match = cleanLine.match(discardRegex);
        if (match && match.groups) {
            events.push({ player: cleanPlayerName(match.groups.player), count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'discard' });
        }
    });
    return events;
}

window.parseLogAndUpdate = function () {
    const logInput = document.getElementById('log-input');
    const status = document.getElementById('log-status');
    const newestFirstEl = document.getElementById('log-newest-first');
    const newestFirst = newestFirstEl ? newestFirstEl.checked : true;
    const rawText = logInput ? logInput.value : '';

    const headerData = parseBgaHeader(rawText);
    const events = parseLogText(rawText, { newestFirst });

    if (!headerData && events.length === 0) {
        if (status) status.textContent = 'No valid game actions or cup data found in the pasted text.';
        return;
    }

    initializeGame();

    const p1Input = document.getElementById('player1-name');
    const p2Input = document.getElementById('player2-name');

    let yourPlayerName = headerData && headerData.yourName ? headerData.yourName : '';
    let oppPlayerName = headerData && headerData.opponentName ? headerData.opponentName : '';

    const uniqueLogPlayers = [];
    events.forEach(e => {
        if (!uniqueLogPlayers.includes(e.player)) {
            uniqueLogPlayers.push(e.player);
        }
    });

    if (!yourPlayerName) {
        const currentP1 = p1Input ? p1Input.value.trim() : '';
        if (currentP1 && currentP1.toLowerCase() !== 'you' && uniqueLogPlayers.map(p => p.toLowerCase()).includes(currentP1.toLowerCase())) {
            yourPlayerName = uniqueLogPlayers.find(p => p.toLowerCase() === currentP1.toLowerCase());
            oppPlayerName = uniqueLogPlayers.find(p => p !== yourPlayerName) || '';
        } else if (uniqueLogPlayers.length > 0) {
            yourPlayerName = uniqueLogPlayers[0];
            oppPlayerName = uniqueLogPlayers[1] || '';
        }
    } else if (!oppPlayerName) {
        oppPlayerName = uniqueLogPlayers.find(p => p.toLowerCase() !== yourPlayerName.toLowerCase()) || '';
    }

    if (yourPlayerName && p1Input) p1Input.value = yourPlayerName;
    if (oppPlayerName && p2Input) p2Input.value = oppPlayerName;

    const mapping = new Map();
    if (yourPlayerName) mapping.set(yourPlayerName.toLowerCase(), 'player1');
    if (oppPlayerName) mapping.set(oppPlayerName.toLowerCase(), 'player2');

    events.forEach(entry => {
        const playerKey = mapping.get(entry.player.toLowerCase());
        if (!entry.color) return;

        if (entry.type === 'cup') {
            if (playerKey) {
                if (playerKey === 'player2' || !headerData || !headerData.counts) {
                    gameState[playerKey][entry.color] = (gameState[playerKey][entry.color] || 0) + entry.count;
                }
                if (!riverOrder[playerKey].includes(entry.color)) {
                    riverOrder[playerKey].push(entry.color);
                }
            }
        } else if (entry.type === 'river') {
            if (playerKey) {
                if (!riverOrder[playerKey].includes(entry.color)) {
                    riverOrder[playerKey].push(entry.color);
                }
            }
        } else if (entry.type === 'field' || entry.type === 'mountain' || entry.type === 'discard') {
            seenCards[entry.color] = (seenCards[entry.color] || 0) + entry.count;
        }
    });

    if (headerData && headerData.counts) {
        Object.entries(headerData.counts).forEach(([col, count]) => {
            gameState.player1[col] = count;
            seenCards[col] = (seenCards[col] || 0) + count;
        });
    }

    renderApp();
    saveGameState();

    const modal = document.getElementById('log-modal');
    if (modal) modal.style.display = 'none';
    if (status) status.textContent = '';
};

function saveGameState() {
    ensureValidState();
    const p1Input = document.getElementById('player1-name');
    const p2Input = document.getElementById('player2-name');
    const state = {
        gameState,
        riverOrder,
        seenCards,
        p1Name: p1Input ? p1Input.value : 'You',
        p2Name: p2Input ? p2Input.value : 'Opponent'
    };
    try {
        localStorage.setItem('mandalaStateV2', JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state:", e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem('mandalaStateV2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                if (parsed.gameState && typeof parsed.gameState === 'object') {
                    gameState = parsed.gameState;
                }
                if (parsed.riverOrder && typeof parsed.riverOrder === 'object') {
                    riverOrder = parsed.riverOrder;
                }
                if (parsed.seenCards && typeof parsed.seenCards === 'object') {
                    seenCards = parsed.seenCards;
                }
                const p1Input = document.getElementById('player1-name');
                const p2Input = document.getElementById('player2-name');
                if (p1Input && parsed.p1Name) p1Input.value = parsed.p1Name;
                if (p2Input && parsed.p2Name) p2Input.value = parsed.p2Name;
                ensureValidState();
                return true;
            }
        }
    } catch (e) {
        console.error("Failed to load state:", e);
    }
    ensureValidState();
    return false;
}

function initApp() {
    if (!loadGameState()) {
        initializeGame();
    }
    renderApp();

    const p1Input = document.getElementById('player1-name');
    const p2Input = document.getElementById('player2-name');
    if (p1Input) p1Input.addEventListener('input', saveGameState);
    if (p2Input) p2Input.addEventListener('input', saveGameState);

    window.onclick = function (event) {
        if (event.target && event.target.classList && event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
