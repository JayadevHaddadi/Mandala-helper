const fs = require('fs');
const path = require('path');
const MandalaCore = require('./mandala-core');

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

function parseLogText(logText, options) {
    const newestFirst = !options || options.newestFirst !== false;
    const lines = logText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    if (newestFirst) {
        lines.reverse();
    }

    const cupRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+Cup/i;
    const riverRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+River/i;
    const mountainRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+builds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Mountain/i;
    const fieldRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+grows\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Field/i;
    const discardRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+discards\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card/i;

    const events = [];
    lines.forEach(line => {
        let m = line.match(cupRegex);
        if (m && m.groups) {
            events.push({ player: m.groups.player.trim(), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'cup' });
            return;
        }
        m = line.match(riverRegex);
        if (m && m.groups) {
            events.push({ player: m.groups.player.trim(), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'river' });
            return;
        }
        m = line.match(mountainRegex);
        if (m && m.groups) {
            events.push({ player: m.groups.player.trim(), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'mountain' });
            return;
        }
        m = line.match(fieldRegex);
        if (m && m.groups) {
            events.push({ player: m.groups.player.trim(), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'field' });
            return;
        }
        m = line.match(discardRegex);
        if (m && m.groups) {
            events.push({ player: m.groups.player.trim(), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'discard' });
        }
    });

    return events.filter(entry => entry.count > 0 && entry.color);
}

const logPath = path.join(__dirname, 'example-text');
const logContent = fs.readFileSync(logPath, 'utf8');

console.log(`--- Parsing ${logPath} ---`);
const result = parseLogText(logContent, { newestFirst: true });
console.log(`Found ${result.length} events across cup, river, mountain, field, and discards.`);

const gameState = {
    jayadevhaddadi: { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 },
    MoSpinach: { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 }
};
const riverOrder = {
    jayadevhaddadi: [],
    MoSpinach: []
};
const seenMap = { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 };

result.forEach(entry => {
    if (entry.type === 'cup') {
        gameState[entry.player][entry.color] += entry.count;
        if (!riverOrder[entry.player].includes(entry.color)) {
            riverOrder[entry.player].push(entry.color);
        }
    } else if (entry.type === 'river') {
        if (!riverOrder[entry.player].includes(entry.color)) {
            riverOrder[entry.player].push(entry.color);
        }
    } else if (entry.type === 'mountain' || entry.type === 'field' || entry.type === 'discard') {
        seenMap[entry.color] += entry.count;
    }
});

// Add your cup counts to seenMap
// (from example-text: Black 4, Green 1, Purple 0, Yellow 1, Orange 2, Red 0)
const yourCup = { Black: 4, Green: 1, Purple: 0, Yellow: 1, Orange: 2, Red: 0 };
Object.entries(yourCup).forEach(([c, cnt]) => {
    gameState.jayadevhaddadi[c] = cnt;
    seenMap[c] += cnt;
});

console.log('\n--- Final Scores ---');
['jayadevhaddadi', 'MoSpinach'].forEach(player => {
    const score = MandalaCore.calculateTotalScore(gameState[player], riverOrder[player], Object.keys(gameState[player]));
    console.log(`${player}: ${score} points`);
    console.log(`  River: ${JSON.stringify(riverOrder[player])}`);
    console.log(`  Cup:   ${JSON.stringify(gameState[player])}`);
});

console.log('\n--- Card Counting & Probabilities (18 Cards / Color) ---');
const stats = MandalaCore.calculateCardCountsAndProbabilities({ seenMap });
console.log(`Total Seen: ${stats.totalSeen} / 108 | Total Unseen: ${stats.totalUnseen} / 108`);
Object.keys(seenMap).forEach(c => {
    console.log(`${c.padEnd(8)}: Seen ${stats.seen[c]}/18 | Left: ${stats.remaining[c]} | Next Draw: ${stats.drawProbability[c]}% | In Opp. 2-Hidden: ${stats.hiddenOdds[c]}%`);
});

if (stats.totalUnseen === 62) {
    console.log('\nPASS: Accurately calculated 62 unseen cards from example-text match!');
} else {
    console.log(`\nFAIL: Expected 62 unseen cards, got ${stats.totalUnseen}`);
}
