const assert = require('assert');
const MandalaCore = require('./mandala-core');

function runTest(name, fn) {
    try {
        fn();
        process.stdout.write(`✓ ${name}\n`);
    } catch (error) {
        process.stderr.write(`✗ ${name}\n`);
        throw error;
    }
}

function createCounts(colorNames) {
    const counts = {};
    colorNames.forEach(name => {
        counts[name] = 0;
    });
    return counts;
}

function changeCount(counts, order, colorName, delta) {
    counts[colorName] = (counts[colorName] || 0) + delta;
    if (counts[colorName] < 0) {
        counts[colorName] = 0;
    }
    const nextOrder = MandalaCore.syncRiverOrder(order, counts, colorName);
    return { counts, order: nextOrder };
}

const colorNames = ['Red', 'Green', 'Black', 'Yellow', 'Purple', 'Orange'];

runTest('River order follows first acquisition', () => {
    const counts = createCounts(colorNames);
    let order = [];

    ({ order } = changeCount(counts, order, 'Red', 1));
    assert.deepStrictEqual(order, ['Red']);
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 1);

    ({ order } = changeCount(counts, order, 'Yellow', 2));
    assert.deepStrictEqual(order, ['Red', 'Yellow']);
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 1 * 1 + 2 * 2);

    ({ order } = changeCount(counts, order, 'Red', 1));
    assert.deepStrictEqual(order, ['Red', 'Yellow']);
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 2 * 1 + 2 * 2);

    ({ order } = changeCount(counts, order, 'Black', 3));
    assert.deepStrictEqual(order, ['Red', 'Yellow', 'Black']);
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 2 * 1 + 2 * 2 + 3 * 3);
});

runTest('Removing a color to zero keeps it in river order (zero-cup river)', () => {
    const counts = createCounts(colorNames);
    let order = [];

    ({ order } = changeCount(counts, order, 'Red', 2));
    ({ order } = changeCount(counts, order, 'Yellow', 2));
    ({ order } = changeCount(counts, order, 'Black', 3));
    assert.deepStrictEqual(order, ['Red', 'Yellow', 'Black']);

    ({ order } = changeCount(counts, order, 'Yellow', -2));
    assert.deepStrictEqual(order, ['Red', 'Yellow', 'Black']);
    // Red: 2 * 1, Yellow: 0 * 2, Black: 3 * 3 = 11
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 2 * 1 + 0 * 2 + 3 * 3);
});

runTest('sanitizeRiverOrder de-dupes and preserves colors in order', () => {
    const counts = createCounts(colorNames);
    counts.Black = 2;
    counts.Red = 1;
    counts.Green = 0;
    const sanitized = MandalaCore.sanitizeRiverOrder(['Blue', 'Red', 'Red', 'Green'], counts, colorNames);
    assert.deepStrictEqual(sanitized, ['Black', 'Red', 'Green']);
});

runTest('calculateTotalScore ignores unknown colors when colorNames provided', () => {
    const counts = createCounts(colorNames);
    counts.Red = 1;
    counts.SomeOther = 100;
    const order = ['Red'];
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 1);
});

runTest('calculateCardCountsAndProbabilities initial state has 18 per color and equal draw probability', () => {
    const result = MandalaCore.calculateCardCountsAndProbabilities({
        colors: colorNames,
        seenMap: { Red: 0, Green: 0, Black: 0, Yellow: 0, Purple: 0, Orange: 0 }
    });

    assert.strictEqual(result.totalSeen, 0);
    assert.strictEqual(result.totalUnseen, 108);
    colorNames.forEach(c => {
        assert.strictEqual(result.seen[c], 0);
        assert.strictEqual(result.remaining[c], 18);
        assert.strictEqual(result.drawProbability[c], 16.7); // 18/108 = 16.666...%
    });
});

runTest('calculateCardCountsAndProbabilities correctly calculates probabilities and unseen total', () => {
    const result = MandalaCore.calculateCardCountsAndProbabilities({
        colors: colorNames,
        seenMap: { Red: 8, Green: 5, Black: 13, Yellow: 8, Purple: 7, Orange: 5 }
    });

    assert.strictEqual(result.totalSeen, 46);
    assert.strictEqual(result.totalUnseen, 62);
    assert.strictEqual(result.remaining.Black, 5);
    assert.strictEqual(result.remaining.Green, 13);
    assert.strictEqual(result.drawProbability.Black, 8.1); // 5 / 62 = 8.06%
    assert.strictEqual(result.drawProbability.Green, 21.0); // 13 / 62 = 20.96%
    assert(result.hiddenOdds.Green > result.hiddenOdds.Black);
});
