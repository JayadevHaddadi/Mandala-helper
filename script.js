// Game data structure
const colors = [
    { name: 'Red', className: 'color-red' },
    { name: 'Green', className: 'color-green' },
    { name: 'Blue', className: 'color-blue' },
    { name: 'Yellow', className: 'color-yellow' },
    { name: 'Purple', className: 'color-purple' },
    { name: 'Orange', className: 'color-orange' }
];

// Maximum cards per color in Mandala
const MAX_CARDS = 9;

// Player data
let gameState = {
    player1: {},
    player2: {}
};

// Initialize game state
function initializeGame() {
    colors.forEach(color => {
        gameState.player1[color.name] = 0;
        gameState.player2[color.name] = 0;
    });
}

// Create color row HTML
function createColorRow(color, player) {
    const count = gameState[player][color.name];
    
    return `
        <div class="color-row" data-color="${color.name}" data-player="${player}">
            <div class="color-info">
                <div class="color-dot ${color.className}"></div>
                <span class="color-name">${color.name}</span>
            </div>
            <div class="card-controls">
                <button class="btn-card btn-minus" data-action="minus" ${count === 0 ? 'disabled' : ''}>−</button>
                <span class="card-count">${count}</span>
                <button class="btn-card btn-plus" data-action="plus" ${count === MAX_CARDS ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;
}

// Render player colors
function renderPlayerColors(player) {
    const container = document.getElementById(`${player}-colors`);
    container.innerHTML = colors.map(color => createColorRow(color, player)).join('');
    
    // Add event listeners
    container.querySelectorAll('.btn-card').forEach(btn => {
        btn.addEventListener('click', handleCardClick);
    });
}

// Handle card button clicks
function handleCardClick(event) {
    const button = event.target;
    const row = button.closest('.color-row');
    const color = row.dataset.color;
    const player = row.dataset.player;
    const action = button.dataset.action;
    
    if (action === 'plus' && gameState[player][color] < MAX_CARDS) {
        gameState[player][color]++;
    } else if (action === 'minus' && gameState[player][color] > 0) {
        gameState[player][color]--;
    }
    
    renderPlayerColors(player);
    updateScore(player);
    saveGameState();
}

// Calculate and update score
function updateScore(player) {
    let totalScore = 0;
    colors.forEach(color => {
        totalScore += gameState[player][color.name];
    });
    
    document.getElementById(`${player}-score`).textContent = totalScore;
}

// Reset game
function resetGame() {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
        initializeGame();
        renderPlayerColors('player1');
        renderPlayerColors('player2');
        updateScore('player1');
        updateScore('player2');
        saveGameState();
    }
}

// Save game state to localStorage
function saveGameState() {
    try {
        const state = {
            gameState: gameState,
            player1Name: document.getElementById('player1-name').value,
            player2Name: document.getElementById('player2-name').value
        };
        localStorage.setItem('mandalaGameState', JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save game state:', e);
    }
}

// Load game state from localStorage
function loadGameState() {
    try {
        const saved = localStorage.getItem('mandalaGameState');
        if (saved) {
            const state = JSON.parse(saved);
            gameState = state.gameState;
            document.getElementById('player1-name').value = state.player1Name || 'Player 1';
            document.getElementById('player2-name').value = state.player2Name || 'Player 2';
            return true;
        }
    } catch (e) {
        console.error('Failed to load game state:', e);
    }
    return false;
}

// Modal functionality
function setupModal() {
    const modal = document.getElementById('help-modal');
    const btn = document.getElementById('help-btn');
    const span = modal.querySelector('.close');
    
    btn.onclick = function() {
        modal.style.display = 'block';
    }
    
    span.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Setup player name inputs
function setupPlayerNames() {
    document.getElementById('player1-name').addEventListener('input', saveGameState);
    document.getElementById('player2-name').addEventListener('input', saveGameState);
}

// Initialize the application
function init() {
    // Initialize game state
    initializeGame();
    
    // Try to load saved state
    const loaded = loadGameState();
    
    // Render UI
    renderPlayerColors('player1');
    renderPlayerColors('player2');
    updateScore('player1');
    updateScore('player2');
    
    // Setup event listeners
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    setupModal();
    setupPlayerNames();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
