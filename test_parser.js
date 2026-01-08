const fs = require('fs');
const path = require('path');

// --- Mocking MandalaCore (since we can't easily require the browser-targeted mandala-core.js if it assumes 'self') ---
// But wait, mandala-core.js uses UMD:
// if (typeof module === 'object' && module.exports) { module.exports = factory(); }
// So we CAN require it. Use the actual updated file.
const MandalaCore = require('./mandala-core');

// --- Copied parts from script.js that we need for the test context (helper vars) ---
const numberWords = new Map([
    ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10]
]);

const colorAliases = new Map([
    ['red', 'Red'], ['green', 'Green'], ['black', 'Black'],
    ['yellow', 'Yellow'], ['purple', 'Purple'], ['orange', 'Orange']
]);

function resolveCount(rawCount) {
    const lower = rawCount.toLowerCase();
    if (numberWords.has(lower)) {
        return numberWords.get(lower);
    }
    const numeric = Number.parseInt(lower, 10);
    return Number.isNaN(numeric) ? 0 : numeric;
}

function resolveColor(rawColor) {
    const lower = rawColor.toLowerCase();
    return colorAliases.get(lower) || null;
}

// --- The NEW parseLogText Logic (mirrored from script.js update) ---
function parseLogText(logText, options) {
    const newestFirst = !options || options.newestFirst !== false;
    const lines = logText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    if (newestFirst) {
        lines.reverse();
    }

    // Regex for "adds to Cup"
    const cupRegex = /^(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+Cup/i;
    // Regex for "adds to River"
    const riverRegex = /^(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+River/i;
    // Regex for "claims" (fallback)
    const claimRegex = /^(?<player>.+?)\s+claims\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?/i;

    const events = [];
    const hasDetailedLogs = lines.some(line => cupRegex.test(line) || riverRegex.test(line));

    // Debug: Print count of lines
    console.log(`Processing ${lines.length} lines.`);

    lines.forEach(line => {
        let match;

        // Try Cup
        match = line.match(cupRegex);
        if (match && match.groups) {
            console.log(`Matched Cup: ${line}`);
            events.push({
                player: match.groups.player,
                count: resolveCount(match.groups.count),
                color: resolveColor(match.groups.color),
                type: 'cup'
            });
            return;
        }

        // Try River
        match = line.match(riverRegex);
        if (match && match.groups) {
            console.log(`Matched River: ${line}`);
            events.push({
                player: match.groups.player,
                count: resolveCount(match.groups.count),
                color: resolveColor(match.groups.color),
                type: 'river'
            });
            return;
        }

        // Fallback to Claims ONLY if no detailed logs detected
        if (!hasDetailedLogs) {
            match = line.match(claimRegex);
            if (match && match.groups) {
                events.push({
                    player: match.groups.player,
                    count: resolveCount(match.groups.count),
                    color: resolveColor(match.groups.color),
                    type: 'cup'
                });
            }
        }
    });

    return events.filter(entry => entry.count > 0 && entry.color);
}

// --- Main Test Execution ---

const logPath = path.join(__dirname, 'example-text');
const logContent = fs.readFileSync(logPath, 'utf8');

console.log(`--- Parsing ${logPath} ---`);
const result = parseLogText(logContent, { newestFirst: true });
console.log(`Found ${result.length} events.`);

// Process events to rebuild state
const gameState = {
    jayadevhaddadi: { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 },
    MoSpinach: { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 }
};
const riverOrder = {
    jayadevhaddadi: [],
    MoSpinach: []
};

// Mock mapping
const mapping = new Map();
mapping.set('jayadevhaddadi', 'jayadevhaddadi');
mapping.set('MoSpinach', 'MoSpinach');

function assignPlayerKey(name) { return mapping.get(name); }

result.forEach(entry => {
    const key = assignPlayerKey(entry.player);
    if (!key) return;

    if (entry.type === 'cup') {
        gameState[key][entry.color] += entry.count;
        if (riverOrder[key].indexOf(entry.color) === -1) {
            riverOrder[key].push(entry.color);
        }
    } else if (entry.type === 'river') {
        if (riverOrder[key].indexOf(entry.color) === -1) {
            riverOrder[key].push(entry.color);
        }
    }
});

console.log('\n--- Final Scores ---');
['jayadevhaddadi', 'MoSpinach'].forEach(player => {
    const score = MandalaCore.calculateTotalScore(gameState[player], riverOrder[player], Object.keys(gameState[player]));
    console.log(`${player}: ${score} points`);
    console.log(`  River: ${JSON.stringify(riverOrder[player])}`);
    console.log(`  Cup:   ${JSON.stringify(gameState[player])}`);
});

// We expect specific river orders and scores.
// Based on log analysis (previous turn):
// jayadevhaddadi River should include colors added even if not in cup.
// From manual review of log:
// jayadevhaddadi adds green to Cup, green to River.
// jayadevhaddadi adds black to Cup.
// jayadevhaddadi adds orange to Cup.
// jayadevhaddadi adds black to River.
// jayadevhaddadi adds orange to River.
// jayadevhaddadi adds purple to River.
// jayadevhaddadi adds yellow to Cup, yellow to River.
// ... wait, the log is chronological if we reversed it?
// "MoSpinach adds one black card to the River" (11:02 PM)
// "jayadevhaddadi adds 1 yellow card(s) to the Cup" (09:49 PM)
// The log has dates.
// If the script reverses (newestFirst=true), it goes Old -> New.
// So we should see accurate replay.

console.log("\n--- Verification ---");
// Check logic: Can we have a river item with 0 cup items?
const testRiverOnly = riverOrder['MoSpinach'].filter(c => gameState['MoSpinach'][c] === 0);
if (testRiverOnly.length > 0) {
    console.log(`PASS: Found colors in River with 0 Cup count: ${testRiverOnly.join(', ')}`);
} else {
    // If none found, maybe the sample game just happened to always have cup cards?
    // Let's force a test case.
    console.log("INFO: No natural 0-cup River items in this specific game end state.");
}

// Force test the Core Logic fix
console.log("\n--- Testing Core Logic Fix ---");
const mockOrder = [];
const mockCounts = { Red: 0 };
// Add Red to river with 0 count
const updatedOrder = MandalaCore.syncRiverOrder(mockOrder, mockCounts, 'Red');
// Wait, syncRiverOrder usage in my fix:
// if (count > 0 && index === -1) push
// if (count === 0) do nothing (don't remove)
// So calling it with count=0 on empty list won't add it.
// That's correct for "syncRiverOrder" used by +/- buttons.
// BUT for parser, we manually pushed.
// Testing "Don't Remove":
const orderWithRed = ['Red'];
const finalOrder = MandalaCore.syncRiverOrder(orderWithRed, mockCounts, 'Red'); // count is 0
if (finalOrder.includes('Red')) {
    console.log("PASS: syncRiverOrder did NOT remove Red when count is 0.");
} else {
    console.log("FAIL: syncRiverOrder removed Red when count is 0.");
}
