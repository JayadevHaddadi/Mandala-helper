// Game data structure
const colors = [
    { name: 'Red', className: 'bg-red' },
    { name: 'Green', className: 'bg-green' },
    { name: 'Black', className: 'bg-black' },
    { name: 'Yellow', className: 'bg-yellow' },
    { name: 'Purple', className: 'bg-purple' },
    { name: 'Orange', className: 'bg-orange' }
];

const colorNames = colors.map(color => color.name);

// Maximum cards per color in Mandala
const MAX_CARDS = 10;

// --- Helper Maps for Parser ---
const numberWords = new Map([
    ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10]
]);

const colorAliases = new Map([
    ['red', 'Red'], ['green', 'Green'], ['black', 'Black'],
    ['yellow', 'Yellow'], ['purple', 'Purple'], ['orange', 'Orange']
]);

// --- State ---
let gameState = {
    player1: {}, // You
    player2: {}  // Opponent
};

let riverOrder = {
    player1: [],
    player2: []
};

let opponentMysteryCards = 2; // Default start
let initialCardsSelected = []; // For setup

// --- Initialization ---

function initializeGame() {
    colors.forEach(color => {
        gameState.player1[color.name] = 0;
        gameState.player2[color.name] = 0;
    });

    riverOrder.player1 = [];
    riverOrder.player2 = [];
    opponentMysteryCards = 2;
    initialCardsSelected = [];
}

// --- Rendering ---

function renderApp() {
    renderSection('player1'); // You (Bottom)
    renderSection('player2'); // Opponent (Top)
    updateScoreDisplay();
}

function renderSection(player) {
    const isOpponent = player === 'player2';
    const riverContainer = document.getElementById(`${player}-river`);
    const poolContainer = document.getElementById(`${player}-pool`);

    riverContainer.innerHTML = '';
    poolContainer.innerHTML = '';

    const currentRiver = riverOrder[player] || [];

    // Render River Slots (Always 6 slots)
    for (let i = 0; i < 6; i++) {
        const colorName = currentRiver[i]; // May be undefined
        const slotEl = document.createElement('div');
        slotEl.className = `card-slot ${colorName ? 'active' : 'empty'}`;

        // Value Label (1-6)
        const valEl = document.createElement('div');
        valEl.className = 'river-value';
        valEl.textContent = i + 1;
        slotEl.appendChild(valEl);

        if (colorName) {
            const colorData = colors.find(c => c.name === colorName);
            // Color Swatch
            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${colorData.className}`;
            swatch.textContent = colorName;
            slotEl.appendChild(swatch);

            // Controls
            const controls = document.createElement('div');
            controls.className = 'card-controls';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-circle';
            btnMinus.textContent = '−';
            btnMinus.onclick = () => updateCount(player, colorName, -1);
            if (gameState[player][colorName] <= 0) btnMinus.disabled = true;

            const countSpan = document.createElement('span');
            countSpan.className = 'card-count';
            countSpan.textContent = gameState[player][colorName];

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-circle';
            btnPlus.textContent = '+';
            btnPlus.onclick = () => updateCount(player, colorName, 1);
            if (gameState[player][colorName] >= MAX_CARDS) btnPlus.disabled = true;

            controls.append(btnMinus, countSpan, btnPlus);
            slotEl.appendChild(controls);
        } else {
            // Empty Slot placeholder
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
            const poolItem = document.createElement('div');
            poolItem.className = 'card-slot';
            poolItem.style.width = '80px';

            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${color.className}`;
            swatch.textContent = color.name;

            // In Manual mode, clicking adds to River
            poolItem.style.cursor = 'pointer';
            poolItem.onclick = () => addToRiver(player, color.name);

            poolItem.appendChild(swatch);

            // Also show cup controls even if not in river? 
            // Logic: If I have initial cup cards, I have them in cup but NOT river.
            // So I should show count here too.
            const count = gameState[player][color.name];
            if (count > 0) {
                const controls = document.createElement('div');
                controls.className = 'card-controls';
                const span = document.createElement('span');
                span.className = 'card-count';
                span.textContent = count;
                controls.appendChild(span);
                poolItem.appendChild(controls);
            }

            poolContainer.appendChild(poolItem);
        }
    });

    // Update Mystery Counter if opponent
    if (isOpponent) {
        document.getElementById('player2-mystery-count').textContent = opponentMysteryCards;
    }
}

// --- Logic ---

function updateCount(player, colorName, delta) {
    const newVal = gameState[player][colorName] + delta;
    if (newVal >= 0 && newVal <= MAX_CARDS) {
        gameState[player][colorName] = newVal;
        // Note: We do NOT auto-remove from river if count hits 0 anymore.
        renderApp();
        saveGameState();
    }
}

function addToRiver(player, colorName) {
    if (!riverOrder[player].includes(colorName)) {
        if (riverOrder[player].length < 6) {
            riverOrder[player].push(colorName);
            renderApp();
            saveGameState();
        } else {
            alert("River is full!");
        }
    }
}

function updateScoreDisplay() {
    // Player 1
    const p1Score = MandalaCore.calculateTotalScore(gameState.player1, riverOrder.player1, colorNames);
    document.getElementById('player1-score').textContent = p1Score;

    // Player 2
    const p2Score = MandalaCore.calculateTotalScore(gameState.player2, riverOrder.player2, colorNames);
    document.getElementById('player2-score').textContent = p2Score;

    // Mystery calc
    // Min additional point: Each mystery card is worth at least 1 point (if it falls in slot 1) or 0 if matched with unrivered?
    // Actually, mystery cards are *Cards*. Their value depends on *where* that color is in the River.
    // If the color is NOT in the River, it's 0.
    // If it is, it's 1-6.
    // Range: 0 to 6 per card.
    // Since we don't know the color, we display + (Mystery * ?).
    // Or simpler: + (Mystery * Average) or just "Score + X cards".
    // User asked for chance/probability.
    // Let's just show "+ (2 hidden)".
    // Or better: "Score: 15 (+ 2 hidden)".
    const mysteryText = opponentMysteryCards > 0 ? `(+ ${opponentMysteryCards} hidden)` : '';
    document.getElementById('player2-mystery-score').textContent = mysteryText;
}

// --- Setup Modal for Initial Cards ---

function openSetupModal() {
    const modal = document.getElementById('setup-modal');
    const picker = document.getElementById('initial-card-picker');
    const display = document.getElementById('selected-initials-display');
    const startBtn = document.getElementById('start-game-btn');

    modal.style.display = 'block';
    picker.innerHTML = '';
    initialCardsSelected = [];
    updateSetupDisplay();

    colors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = `picker-btn ${color.className}`;
        btn.dataset.color = color.name;
        btn.onclick = () => {
            if (initialCardsSelected.length < 2) {
                initialCardsSelected.push(color.name);
                updateSetupDisplay();
            }
        };
        picker.appendChild(btn);
    });

    startBtn.onclick = () => {
        // Apply initial cards
        initialCardsSelected.forEach(color => {
            gameState.player1[color]++; // Add to Cup
        });
        // Opponent gets 2 mystery
        opponentMysteryCards = 2; // already default

        modal.style.display = 'none';
        renderApp();
        saveGameState();
    };
}

function updateSetupDisplay() {
    const display = document.getElementById('selected-initials-display');
    const btn = document.getElementById('start-game-btn');

    if (initialCardsSelected.length === 0) {
        display.textContent = "Select 2 cards...";
    } else {
        display.textContent = `Selected: ${initialCardsSelected.join(', ')}`;
    }

    btn.disabled = initialCardsSelected.length !== 2;
}

// --- Helpers for Parser (reused logic) ---
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

function assignPlayerKey(name, mapping) {
    const p1Input = document.getElementById('player1-name');
    const p2Input = document.getElementById('player2-name');
    const normalized = name.trim();
    const lower = normalized.toLowerCase();

    // Check existing mapping
    if (mapping.has(normalized)) return mapping.get(normalized);

    // Check Inputs
    if (p1Input.value.trim().toLowerCase() === lower) {
        mapping.set(normalized, 'player1');
        return 'player1';
    }
    if (p2Input.value.trim().toLowerCase() === lower) {
        mapping.set(normalized, 'player2');
        return 'player2';
    }

    // Auto-assign: "You" usually matches player1 if parsing own logs?
    // If not matched, first new name is p1 (if p1 is default "You"), or p2.
    // Let's safe-guess.
    if (!mapping.has('player1_assigned')) {
        p1Input.value = normalized;
        mapping.set(normalized, 'player1');
        mapping.set('player1_assigned', true);
        return 'player1';
    } else {
        p2Input.value = normalized;
        mapping.set(normalized, 'player2');
        return 'player2';
    }
}

function parseLogText(logText, options) {
    const newestFirst = !options || options.newestFirst !== false;
    const lines = logText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (newestFirst) lines.reverse();

    const cupRegex = /^(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+Cup/i;
    const riverRegex = /^(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+River/i;

    const events = [];
    lines.forEach(line => {
        let match = line.match(cupRegex);
        if (match && match.groups) {
            events.push({ player: match.groups.player, count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'cup' });
            return;
        }
        match = line.match(riverRegex);
        if (match && match.groups) {
            events.push({ player: match.groups.player, count: resolveCount(match.groups.count), color: resolveColor(match.groups.color), type: 'river' });
        }
    });
    return events;
}

function parseLogAndUpdate() {
    const logInput = document.getElementById('log-input');
    const status = document.getElementById('log-status');
    const newestFirst = document.getElementById('log-newest-first').checked;

    const events = parseLogText(logInput.value, { newestFirst });

    // Reset but keep names if possible? No, full reset is safer.
    initializeGame();

    const mapping = new Map();
    let cupAdded = 0;

    events.forEach(entry => {
        const pKey = assignPlayerKey(entry.player, mapping);
        if (!pKey) return;

        if (entry.type === 'cup') {
            gameState[pKey][entry.color] += entry.count;
            cupAdded += entry.count;
            if (!riverOrder[pKey].includes(entry.color)) riverOrder[pKey].push(entry.color);
        } else if (entry.type === 'river') {
            if (!riverOrder[pKey].includes(entry.color)) riverOrder[pKey].push(entry.color);
        }
    });

    renderApp();
    saveGameState();

    // Close modal if success
    if (events.length > 0) {
        document.getElementById('log-modal').style.display = 'none';
        status.textContent = '';
    } else {
        status.textContent = "No log entries found.";
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm("Reset game?")) openSetupModal();
    });

    document.getElementById('parse-log-btn').addEventListener('click', () => {
        document.getElementById('log-input').value = '';
        document.getElementById('log-modal').style.display = 'block';
    });

    document.getElementById('process-log-btn').addEventListener('click', parseLogAndUpdate);
    document.getElementById('clear-log-btn').addEventListener('click', () => document.getElementById('log-input').value = '');

    document.getElementById('help-btn').addEventListener('click', () => document.getElementById('help-modal').style.display = 'block');

    // Mystery Controls
    document.querySelector('button[data-action="mystery-plus"]').addEventListener('click', () => {
        opponentMysteryCards++;
        renderApp();
        saveGameState();
    });
    document.querySelector('button[data-action="mystery-minus"]').addEventListener('click', () => {
        if (opponentMysteryCards > 0) {
            opponentMysteryCards--;
            renderApp();
            saveGameState();
        }
    });

    // Modals Close
    document.querySelectorAll('.close').forEach(span => {
        span.onclick = function () {
            this.closest('.modal').style.display = 'none';
        }
    });

    // Load or Init
    if (loadGameState()) {
        renderApp();
    } else {
        openSetupModal();
    }
});

function saveGameState() {
    const state = {
        gameState, riverOrder, opponentMysteryCards,
        p1Name: document.getElementById('player1-name').value,
        p2Name: document.getElementById('player2-name').value
    };
    localStorage.setItem('mandalaStateV2', JSON.stringify(state));
}

function loadGameState() {
    try {
        const saved = localStorage.getItem('mandalaStateV2');
        if (saved) {
            const parsed = JSON.parse(saved);
            gameState = parsed.gameState || gameState;
            riverOrder = parsed.riverOrder || riverOrder;
            opponentMysteryCards = parsed.opponentMysteryCards || 0;
            document.getElementById('player1-name').value = parsed.p1Name || 'You';
            document.getElementById('player2-name').value = parsed.p2Name || 'Opponent';
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
}
