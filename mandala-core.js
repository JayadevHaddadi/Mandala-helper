(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MandalaCore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    function getRiverPosition(order, colorName) {
        if (!Array.isArray(order)) {
            return 0;
        }
        const index = order.indexOf(colorName);
        return index === -1 ? 0 : index + 1;
    }

    function syncRiverOrder(order, counts, colorName) {
        const next = Array.isArray(order) ? order : [];
        const count = (counts && counts[colorName]) ? counts[colorName] : 0;
        const index = next.indexOf(colorName);

        if (count > 0 && index === -1) {
            next.push(colorName);
        }
        // Logic change: Do not automatically remove colors from river if count drops to zero.
        // This supports the case where a card is in the River but 0 are in the Cup.
        // if (count === 0 && index !== -1) {
        //     next.splice(index, 1);
        // }

        return next;
    }

    function sanitizeRiverOrder(order, counts, colorNames) {
        const existing = Array.isArray(order) ? order : [];
        const next = [];
        const seen = new Set();

        existing.forEach(colorName => {
            const normalized = colorName === 'Blue' ? 'Black' : colorName;
            if (seen.has(normalized)) {
                return;
            }
            // Logic change: Allow keeping color in river even if count is 0
            // if (!counts || counts[normalized] === undefined) {
            //     return;
            // }
            // if ((counts[normalized] || 0) <= 0) {
            //     return;
            // }
            seen.add(normalized);
            next.push(normalized);
        });

        if (Array.isArray(colorNames)) {
            colorNames.forEach(colorName => {
                if ((counts && (counts[colorName] || 0) > 0) && next.indexOf(colorName) === -1) {
                    next.push(colorName);
                }
            });
        }

        return next;
    }

    function calculateTotalScore(counts, order, colorNames) {
        if (!counts) {
            return 0;
        }

        const names = Array.isArray(colorNames) ? colorNames : Object.keys(counts);
        let total = 0;
        names.forEach(colorName => {
            const count = counts[colorName] || 0;
            if (count <= 0) {
                return;
            }
            const riverPosition = getRiverPosition(order, colorName);
            total += count * riverPosition;
        });
        return total;
    }

    return {
        getRiverPosition,
        syncRiverOrder,
        sanitizeRiverOrder,
        calculateTotalScore
    };
}));

