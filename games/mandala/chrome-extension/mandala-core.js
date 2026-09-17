(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MandalaCore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const TOTAL_CARDS_PER_COLOR = 18;
    const DEFAULT_COLORS = ['Red', 'Green', 'Black', 'Yellow', 'Purple', 'Orange'];

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

    /**
     * Calculate 18-card counts, remaining cards, and probabilities.
     * @param {Object} options
     *   - seenMap: { Color: count } directly if already aggregated, OR
     *   - p1Cup: { Color: count }
     *   - p2Cup: { Color: count }
     *   - p1River: Array of colors
     *   - p2River: Array of colors
     *   - boardEvents: Array of { color, count, type }
     *   - yourHand: Array or Map of cards currently in your hand
     * @returns {Object} { seen, remaining, drawProbability, hiddenOdds, totalSeen, totalUnseen }
     */
    function calculateCardCountsAndProbabilities(options) {
        const colors = options && Array.isArray(options.colors) ? options.colors : DEFAULT_COLORS;
        const seen = {};
        const remaining = {};
        const drawProbability = {};
        const hiddenOdds = {};

        colors.forEach(c => {
            seen[c] = 0;
        });

        if (options && options.seenMap) {
            colors.forEach(c => {
                seen[c] = Math.min(TOTAL_CARDS_PER_COLOR, options.seenMap[c] || 0);
            });
        } else {
            // Aggregate from p1Cup / p2Cup / rivers / events
            if (options && options.p1Cup) {
                colors.forEach(c => {
                    seen[c] += (options.p1Cup[c] || 0);
                });
            }
            if (options && options.p2Cup) {
                colors.forEach(c => {
                    seen[c] += (options.p2Cup[c] || 0);
                });
            }
            if (options && Array.isArray(options.p1River)) {
                options.p1River.forEach(c => {
                    seen[c] = (seen[c] || 0) + 1;
                });
            }
            if (options && Array.isArray(options.p2River)) {
                options.p2River.forEach(c => {
                    seen[c] = (seen[c] || 0) + 1;
                });
            }
            if (options && Array.isArray(options.boardEvents)) {
                options.boardEvents.forEach(e => {
                    if (e.color && colors.includes(e.color)) {
                        seen[e.color] += (e.count || 1);
                    }
                });
            }
            if (options && options.yourHand) {
                if (Array.isArray(options.yourHand)) {
                    options.yourHand.forEach(c => {
                        if (colors.includes(c)) seen[c] = (seen[c] || 0) + 1;
                    });
                } else if (typeof options.yourHand === 'object') {
                    colors.forEach(c => {
                        seen[c] += (options.yourHand[c] || 0);
                    });
                }
            }
        }

        // Clamp seen to max 18
        colors.forEach(c => {
            seen[c] = Math.min(TOTAL_CARDS_PER_COLOR, Math.max(0, seen[c] || 0));
        });

        let totalSeen = 0;
        let totalUnseen = 0;

        colors.forEach(c => {
            remaining[c] = TOTAL_CARDS_PER_COLOR - seen[c];
            totalSeen += seen[c];
            totalUnseen += remaining[c];
        });

        // Compute draw probability and opponent hidden 2-card odds
        colors.forEach(c => {
            if (totalUnseen > 0) {
                drawProbability[c] = Math.round((remaining[c] / totalUnseen) * 1000) / 10;
            } else {
                drawProbability[c] = 0;
            }

            // Probability that opponent's 2 hidden cup cards contain >= 1 card of color c
            if (totalUnseen >= 2) {
                const notC = totalUnseen - remaining[c];
                const probNone = (notC * (notC - 1)) / (totalUnseen * (totalUnseen - 1));
                hiddenOdds[c] = Math.round(Math.max(0, (1 - probNone) * 1000)) / 10;
            } else {
                hiddenOdds[c] = 0;
            }
        });

        return {
            TOTAL_CARDS_PER_COLOR,
            seen,
            remaining,
            drawProbability,
            hiddenOdds,
            totalSeen,
            totalUnseen
        };
    }

    return {
        TOTAL_CARDS_PER_COLOR,
        DEFAULT_COLORS,
        getRiverPosition,
        syncRiverOrder,
        sanitizeRiverOrder,
        calculateTotalScore,
        calculateCardCountsAndProbabilities
    };
}));
