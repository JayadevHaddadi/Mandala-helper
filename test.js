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

runTest('Removing a color to zero removes it from river order', () => {
    const counts = createCounts(colorNames);
    let order = [];

    ({ order } = changeCount(counts, order, 'Red', 2));
    ({ order } = changeCount(counts, order, 'Yellow', 2));
    ({ order } = changeCount(counts, order, 'Black', 3));
    assert.deepStrictEqual(order, ['Red', 'Yellow', 'Black']);

    ({ order } = changeCount(counts, order, 'Yellow', -2));
    assert.deepStrictEqual(order, ['Red', 'Black']);
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 2 * 1 + 3 * 2);
});

runTest('sanitizeRiverOrder de-dupes and drops zero counts', () => {
    const counts = createCounts(colorNames);
    counts.Black = 2;
    counts.Red = 1;
    counts.Green = 0;
    const sanitized = MandalaCore.sanitizeRiverOrder(['Blue', 'Red', 'Red', 'Green'], counts, colorNames);
    assert.deepStrictEqual(sanitized, ['Black', 'Red']);
});

runTest('calculateTotalScore ignores unknown colors when colorNames provided', () => {
    const counts = createCounts(colorNames);
    counts.Red = 1;
    counts.SomeOther = 100;
    const order = ['Red'];
    assert.strictEqual(MandalaCore.calculateTotalScore(counts, order, colorNames), 1);
});

