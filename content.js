// Mandala Helper Content Script for BoardGameArena
(function () {
    if (window.__mandalaHelperLoaded) return;
    window.__mandalaHelperLoaded = true;

    console.log('[Mandala Helper] Content script loaded on BoardGameArena.');

    const COLORS = [
        { name: 'Red', hex: '#ff5252' },
        { name: 'Green', hex: '#69f0ae' },
        { name: 'Black', hex: '#424242' },
        { name: 'Yellow', hex: '#ffd740' },
        { name: 'Purple', hex: '#e040fb' },
        { name: 'Orange', hex: '#ffab40' }
    ];
    const COLOR_NAMES = COLORS.map(c => c.name);

    const NUMBER_WORDS = new Map([
        ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
        ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10]
    ]);

    const COLOR_ALIASES = new Map([
        ['red', 'Red'], ['green', 'Green'], ['black', 'Black'],
        ['yellow', 'Yellow'], ['purple', 'Purple'], ['orange', 'Orange']
    ]);

    let isMinimized = false;
    let showPasteDrawer = false;
    let autoScanTimer = null;
    let savedPastedText = '';

    // State
    let helperState = {
        p1Name: 'You',
        p2Name: 'Opponent',
        p1Score: 0,
        p1Cards: 0,
        p2Score: 0,
        p2Cards: 2,
        p1River: [],
        p2River: [],
        stats: null,
        hasCustomPaste: false
    };

    function resolveCount(raw) {
        const lower = String(raw).toLowerCase();
        if (NUMBER_WORDS.has(lower)) return NUMBER_WORDS.get(lower);
        const n = parseInt(lower, 10);
        return isNaN(n) ? 0 : n;
    }

    function resolveColor(raw) {
        return COLOR_ALIASES.get(String(raw).toLowerCase()) || null;
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

    // Extract real player names from BGA table board
    function extractBgaPlayerNames() {
        const names = [];
        const boardSelectors = [
            '#player_boards .player-name',
            '#player_boards .playername',
            '#player_boards [id^="player_name_"]',
            '.player_board .player-name',
            '.player_board .playername',
            '#board .player-name',
            '#game_play_area .player-name'
        ];

        const els = document.querySelectorAll(boardSelectors.join(', '));
        els.forEach(el => {
            const t = cleanPlayerName(el.innerText.trim());
            if (t && !names.includes(t) && t.length < 30 && !isTimerOrMetric(t) && !isUiNoise(t)) {
                names.push(t);
            }
        });

        return names;
    }

    // Extract log items from BGA DOM elements
    function extractLogLinesFromDOM() {
        const lines = [];

        const selectors = [
            '#logs .log',
            '#logs .gamelogreview',
            '#logs .logitem',
            '#table_history .log',
            '#gamelogs .log',
            '.gamelogreview',
            '.log.roundedbox'
        ];

        const logEls = document.querySelectorAll(selectors.join(', '));
        if (logEls && logEls.length > 0) {
            logEls.forEach(el => {
                const text = el.innerText.replace(/\s+/g, ' ').trim();
                if (text) lines.push(text);
            });
            return lines;
        }

        const playerBoards = document.getElementById('player_boards');
        const boardText = playerBoards ? playerBoards.innerText : '';
        const bodyText = document.body ? document.body.innerText : '';

        return normalizeRawText(boardText + '\n' + bodyText);
    }

    function normalizeRawText(rawText) {
        if (!rawText) return [];
        const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const cleaned = [];

        const isTimestamp = (l) => /^\d{1,2}[\/:\-\.]\d{1,2}(?:[\/:\-\.]\d{2,4})?(?:\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?$/i.test(l) || /^\d{1,2}:\d{2}(?:\s*(?:AM|PM))?$/i.test(l);
        const isActionLine = (l) => /^(?:grows|builds|adds|claims|discards|draws|has completed|has more|plays next|receives)/i.test(l);

        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i];
            if (isTimestamp(line)) continue;

            if (i + 1 < rawLines.length && isActionLine(rawLines[i + 1])) {
                line = line + ' ' + rawLines[i + 1];
                i++;
            }

            cleaned.push(line);
        }
        return cleaned;
    }

    function parseBgaContent(lines) {
        if (!lines || lines.length === 0) return null;

        const cupIndex = lines.findIndex(l => /^your cup:?$/i.test(l));

        let yourName = '';
        const cupCounts = {};
        const cupColors = ['Black', 'Green', 'Purple', 'Yellow', 'Orange', 'Red'];
        let numbersFound = 0;
        let afterCupIndex = cupIndex !== -1 ? cupIndex + 1 : 0;

        if (cupIndex !== -1) {
            for (let i = cupIndex - 1; i >= 0; i--) {
                const line = lines[i];
                if (isTimerOrMetric(line) || isUiNoise(line)) continue;
                yourName = cleanPlayerName(line);
                break;
            }

            for (let i = cupIndex + 1; i < lines.length && numbersFound < 6; i++) {
                const num = Number.parseInt(lines[i], 10);
                if (!Number.isNaN(num)) {
                    cupCounts[cupColors[numbersFound]] = num;
                    numbersFound++;
                    afterCupIndex = i + 1;
                } else {
                    break;
                }
            }
        }

        let opponentName = '';
        if (cupIndex !== -1) {
            for (let i = afterCupIndex; i < lines.length; i++) {
                const line = lines[i];
                if (/^(?:move\s+\d+|[a-zA-Z0-9_\-]+\s+adds)/i.test(line)) break;
                if (isTimerOrMetric(line) || isUiNoise(line)) continue;
                opponentName = cleanPlayerName(line);
                break;
            }
        }

        const cupRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+Cup/i;
        const riverRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+adds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+to\s+the\s+River/i;
        const mountainRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+builds\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Mountain/i;
        const fieldRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+grows\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card(?:\(s\))?\s+in\s+Field/i;
        const discardRegex = /^(?:move\s+\d+:?\s*)?(?<player>.+?)\s+discards\s+(?<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<color>[a-z]+)\s+card/i;

        const events = [];
        const reversedLines = [...lines].reverse();
        reversedLines.forEach(line => {
            const cleanLine = line.replace(/^\d{1,2}:\d{2}(?:\s*(?:AM|PM))?\s*/i, '').trim();

            let m = cleanLine.match(cupRegex);
            if (m && m.groups) {
                events.push({ player: cleanPlayerName(m.groups.player), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'cup' });
                return;
            }
            m = cleanLine.match(riverRegex);
            if (m && m.groups) {
                events.push({ player: cleanPlayerName(m.groups.player), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'river' });
                return;
            }
            m = cleanLine.match(mountainRegex);
            if (m && m.groups) {
                events.push({ player: cleanPlayerName(m.groups.player), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'mountain' });
                return;
            }
            m = cleanLine.match(fieldRegex);
            if (m && m.groups) {
                events.push({ player: cleanPlayerName(m.groups.player), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'field' });
                return;
            }
            m = cleanLine.match(discardRegex);
            if (m && m.groups) {
                events.push({ player: cleanPlayerName(m.groups.player), count: resolveCount(m.groups.count), color: resolveColor(m.groups.color), type: 'discard' });
            }
        });

        return {
            yourName,
            opponentName,
            cupCounts: numbersFound === 6 ? cupCounts : null,
            events
        };
    }

    function scanAndCompute(customText) {
        const isCustom = typeof customText === 'string' && customText.trim().length > 0;
        if (isCustom) {
            savedPastedText = customText;
            helperState.hasCustomPaste = true;
        }

        const textToUse = isCustom ? customText : (helperState.hasCustomPaste ? savedPastedText : null);
        const lines = textToUse ? normalizeRawText(textToUse) : extractLogLinesFromDOM();

        const parsed = parseBgaContent(lines);
        if (!parsed) return;

        const bgaNames = extractBgaPlayerNames();
        let p1Name = parsed.yourName || (bgaNames.length > 0 ? bgaNames[0] : 'You');
        let p2Name = parsed.opponentName || (bgaNames.length > 1 ? bgaNames.find(n => n.toLowerCase() !== p1Name.toLowerCase()) : 'Opponent');

        const uniquePlayers = [];
        parsed.events.forEach(e => {
            if (!uniquePlayers.includes(e.player)) uniquePlayers.push(e.player);
        });

        if (uniquePlayers.length > 0) {
            if (!parsed.yourName && bgaNames.length === 0) {
                p1Name = uniquePlayers[0];
                p2Name = uniquePlayers[1] || 'Opponent';
            } else if (uniquePlayers.length > 1 && (p2Name === 'Opponent' || !p2Name)) {
                p2Name = uniquePlayers.find(p => p.toLowerCase() !== p1Name.toLowerCase()) || 'Opponent';
            }
        }

        const mapping = new Map();
        mapping.set(p1Name.toLowerCase(), 'player1');
        if (p2Name) mapping.set(p2Name.toLowerCase(), 'player2');

        const p1State = {};
        const p2State = {};
        const seenMap = {};
        COLOR_NAMES.forEach(c => {
            p1State[c] = 0;
            p2State[c] = 0;
            seenMap[c] = 0;
        });

        const p1River = [];
        const p2River = [];

        parsed.events.forEach(entry => {
            const pKey = mapping.get(entry.player.toLowerCase());
            if (!entry.color) return;

            if (entry.type === 'cup') {
                if (pKey === 'player1') {
                    p1State[entry.color] = (p1State[entry.color] || 0) + entry.count;
                    if (!p1River.includes(entry.color)) p1River.push(entry.color);
                } else if (pKey === 'player2') {
                    p2State[entry.color] = (p2State[entry.color] || 0) + entry.count;
                    if (!p2River.includes(entry.color)) p2River.push(entry.color);
                }
            } else if (entry.type === 'river') {
                if (pKey === 'player1' && !p1River.includes(entry.color)) p1River.push(entry.color);
                if (pKey === 'player2' && !p2River.includes(entry.color)) p2River.push(entry.color);
            } else if (entry.type === 'field' || entry.type === 'mountain' || entry.type === 'discard') {
                seenMap[entry.color] = (seenMap[entry.color] || 0) + entry.count;
            }
        });

        if (parsed.cupCounts) {
            COLOR_NAMES.forEach(c => {
                p1State[c] = parsed.cupCounts[c] || 0;
                seenMap[c] = (seenMap[c] || 0) + p1State[c];
            });
        }

        COLOR_NAMES.forEach(c => {
            seenMap[c] = Math.max(seenMap[c], (p1State[c] || 0) + (p2State[c] || 0));
        });

        const p1Score = MandalaCore.calculateTotalScore(p1State, p1River, COLOR_NAMES);
        const p1Cards = Object.values(p1State).reduce((a, b) => a + b, 0);

        const p2Score = MandalaCore.calculateTotalScore(p2State, p2River, COLOR_NAMES);
        const p2Cards = Object.values(p2State).reduce((a, b) => a + b, 0) + 2;

        const stats = MandalaCore.calculateCardCountsAndProbabilities({
            seenMap,
            colors: COLOR_NAMES
        });

        helperState = {
            p1Name,
            p2Name,
            p1Score,
            p1Cards,
            p2Score,
            p2Cards,
            p1River,
            p2River,
            stats,
            hasCustomPaste: helperState.hasCustomPaste
        };

        console.log(`[Mandala Helper] Computed State: P1 (${p1Name}) = ${p1Score} pts (${p1Cards} cards), P2 (${p2Name}) = ${p2Score} pts (${p2Cards} cards)`);
        renderHud();
    }

    function createHud() {
        let container = document.getElementById('mandala-hud-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mandala-hud-container';
            document.body.appendChild(container);
        }
        renderHud();
    }

    function renderHud() {
        const container = document.getElementById('mandala-hud-container');
        if (!container) return;

        if (isMinimized) {
            container.innerHTML = `
                <div class="mandala-hud-pill" id="mandala-hud-expand-btn" title="Expand Mandala Helper">
                    <span>🎴 Helper</span>
                    <span style="color:#fff; font-size:11px;">${helperState.p1Score} vs ${helperState.p2Score}</span>
                </div>
            `;
            const expandBtn = document.getElementById('mandala-hud-expand-btn');
            if (expandBtn) expandBtn.onclick = () => { isMinimized = false; renderHud(); };
            return;
        }

        const stats = helperState.stats || { seen: {}, remaining: {}, drawProbability: {}, hiddenOdds: {}, totalUnseen: 108 };

        let trackerRowsHtml = '';
        COLORS.forEach(c => {
            const seen = (stats.seen && stats.seen[c.name]) || 0;
            const left = (stats.remaining && stats.remaining[c.name]) || 18;
            const drawP = (stats.drawProbability && stats.drawProbability[c.name]) || 0;
            const hidP = (stats.hiddenOdds && stats.hiddenOdds[c.name]) || 0;
            const barW = Math.round((seen / 18) * 100);

            trackerRowsHtml += `
                <div class="mandala-hud-tracker-item">
                    <div class="mandala-hud-item-top">
                        <div class="mandala-hud-color-tag">
                            <div class="mandala-hud-color-dot" style="background:${c.hex};"></div>
                            <span>${c.name}</span>
                        </div>
                        <div class="mandala-hud-item-counts">
                            <strong>${seen}</strong>/18 (<span style="color:${left > 0 ? '#fff' : '#666'}">${left} left</span>)
                        </div>
                    </div>
                    <div class="mandala-hud-bar">
                        <div class="mandala-hud-bar-fill" style="width:${barW}%; background:${c.hex};"></div>
                    </div>
                    <div class="mandala-hud-item-bottom">
                        <span>Draw: <strong>${drawP}%</strong></span>
                        <span>Opp. Hidden: <strong>${hidP}%</strong></span>
                    </div>
                </div>
            `;
        });

        function renderRiverSlots(river) {
            let slots = '';
            for (let i = 0; i < 6; i++) {
                const color = river[i];
                if (color) {
                    const colorData = COLORS.find(c => c.name === color);
                    slots += `<div class="mandala-hud-river-slot" style="background:${colorData ? colorData.hex : '#444'}; color:#000;">${i + 1}</div>`;
                } else {
                    slots += `<div class="mandala-hud-river-slot empty">${i + 1}</div>`;
                }
            }
            return slots;
        }

        container.innerHTML = `
            <div class="mandala-hud">
                <div class="mandala-hud-header">
                    <div class="mandala-hud-title">🎴 Mandala Helper</div>
                    <div class="mandala-hud-actions">
                        <button class="mandala-hud-btn" id="mandala-hud-paste-toggle-btn" title="Paste / Sync Log Drawer">📋 Paste</button>
                        <button class="mandala-hud-btn" id="mandala-hud-refresh-btn" title="Rescan Live Board & Log">⟳ Sync</button>
                        <button class="mandala-hud-btn" id="mandala-hud-minimize-btn" title="Minimize HUD">−</button>
                    </div>
                </div>

                ${showPasteDrawer ? `
                    <div style="background:#1c1c1c; padding:8px 12px; border-bottom:1px solid #383838; display:flex; flex-direction:column; gap:6px;">
                        <textarea id="mandala-hud-textarea" placeholder="Paste BGA log or page text here..." style="width:100%; height:65px; background:#111; color:#fff; border:1px solid #444; border-radius:4px; font-size:11px; padding:4px; box-sizing:border-box;">${savedPastedText}</textarea>
                        <div style="display:flex; gap:6px;">
                            <button class="mandala-hud-btn" id="mandala-hud-process-paste-btn" style="flex:1; background:#bb86fc; color:#000; font-weight:bold; padding:4px;">Process Pasted Log</button>
                            ${helperState.hasCustomPaste ? `<button class="mandala-hud-btn" id="mandala-hud-reset-live-btn" style="background:#444; color:#fff; padding:4px;" title="Reset to live auto-sync">Reset</button>` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="mandala-hud-body">
                    <!-- Score & River Section -->
                    <div class="mandala-hud-scores">
                        <div class="mandala-hud-player-row">
                            <span class="mandala-hud-player-name" title="${helperState.p2Name}">👤 ${helperState.p2Name}</span>
                            <span class="mandala-hud-player-stats">Score: <span class="mandala-hud-score-val">${helperState.p2Score}</span>, Cards: ${helperState.p2Cards} <span style="font-size:10px; color:#e0b0ff;">(+12 max)</span></span>
                        </div>
                        <div class="mandala-hud-river-row">
                            ${renderRiverSlots(helperState.p2River)}
                        </div>

                        <hr style="border:0; border-top:1px solid #333; margin:4px 0;">

                        <div class="mandala-hud-player-row">
                            <span class="mandala-hud-player-name" title="${helperState.p1Name}">⭐ ${helperState.p1Name} (You)</span>
                            <span class="mandala-hud-player-stats">Score: <span class="mandala-hud-score-val">${helperState.p1Score}</span>, Cards: ${helperState.p1Cards}</span>
                        </div>
                        <div class="mandala-hud-river-row">
                            ${renderRiverSlots(helperState.p1River)}
                        </div>
                    </div>

                    <!-- 18-Card Probability Tracker -->
                    <div class="mandala-hud-tracker">
                        <div class="mandala-hud-tracker-header">
                            <span>Card Counter (18/col)</span>
                            <span>${stats.totalUnseen || 108} unseen</span>
                        </div>
                        ${trackerRowsHtml}
                    </div>
                </div>
            </div>
        `;

        const minBtn = document.getElementById('mandala-hud-minimize-btn');
        if (minBtn) minBtn.onclick = () => { isMinimized = true; renderHud(); };

        const refBtn = document.getElementById('mandala-hud-refresh-btn');
        if (refBtn) {
            refBtn.onclick = () => {
                helperState.hasCustomPaste = false;
                scanAndCompute();
            };
        }

        const pasteToggleBtn = document.getElementById('mandala-hud-paste-toggle-btn');
        if (pasteToggleBtn) {
            pasteToggleBtn.onclick = () => {
                showPasteDrawer = !showPasteDrawer;
                renderHud();
            };
        }

        const processPasteBtn = document.getElementById('mandala-hud-process-paste-btn');
        if (processPasteBtn) {
            processPasteBtn.onclick = () => {
                const ta = document.getElementById('mandala-hud-textarea');
                if (ta && ta.value) {
                    scanAndCompute(ta.value);
                    showPasteDrawer = false;
                    renderHud();
                }
            };
        }

        const resetLiveBtn = document.getElementById('mandala-hud-reset-live-btn');
        if (resetLiveBtn) {
            resetLiveBtn.onclick = () => {
                helperState.hasCustomPaste = false;
                savedPastedText = '';
                scanAndCompute();
                renderHud();
            };
        }
    }

    function init() {
        createHud();
        scanAndCompute();

        const observer = new MutationObserver((mutations) => {
            const hasExternalMutation = mutations.some(m => {
                if (!m.target) return false;
                if (m.target.id === 'mandala-hud-container' || (m.target.closest && m.target.closest('#mandala-hud-container'))) {
                    return false;
                }
                return true;
            });

            if (!hasExternalMutation) return;

            clearTimeout(autoScanTimer);
            autoScanTimer = setTimeout(() => {
                if (!helperState.hasCustomPaste) {
                    scanAndCompute();
                }
            }, 600);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
