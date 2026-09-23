/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * lordsofscotlandtest implementation : © Jayadev Haddadi
 * -----
 * 
 * Game.js
 */

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            const extraMuster = args.extra_muster_active;
            if (extraMuster) {
                this.bga.statusBar.setTitle(_('${you} may muster another clan card from your hand (Clan Makgill power)'));
                if (typeof this.bga.statusBar.addActionButton === 'function') {
                    this.bga.statusBar.addActionButton('btnPassExtraMuster', _('Pass (Skip extra muster)'), () => {
                        this.bga.actions.performAction('actPass', {});
                    }, 'secondary');
                }
            } else if (!args.can_recruit) {
                this.bga.statusBar.setTitle(_('${you} must muster a clan card from your hand into your army (Hand full)'));
            } else {
                this.bga.statusBar.setTitle(_('${you} must recruit a card or muster a clan into your army'));
            }

            this.game.highlightRecruitCards(args.can_recruit);
            this.game.highlightHandCards(true, args.hand_cards);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} must recruit a card or muster a clan'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

class ResolvePowerWemyss {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            this.bga.statusBar.setTitle(_('${you} must choose a clan card from any army to discard (Clan Wemyss)'));
            this.game.highlightArmyCardsForWemyss(args.eligible_cards);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a card to discard (Clan Wemyss)'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

class ResolvePowerFergusson {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            this.bga.statusBar.setTitle(_('${you} must choose an army card to swap with your Fergusson (Clan Fergusson)'));
            this.game.highlightArmyCardsForFergusson(args.eligible_cards);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a card to swap (Clan Fergusson)'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

class ResolvePowerScott {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            this.bga.statusBar.setTitle(_('${you} must choose a face-up clan card to copy its power (Clan Scott)'));
            this.game.highlightArmyCardsForScott(args.eligible_cards);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a power to copy (Clan Scott)'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

class ResolvePowerCockburn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            this.bga.statusBar.setTitle(_('${you} must choose a card from the Supporter row to swap into your army (Clan Cockburn)'));
            this.game.highlightSupportersForCockburn(args.supporters);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a supporter to swap (Clan Cockburn)'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

class DraftSupporter {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        args = args || {};
        if (isCurrentPlayerActive) {
            const draftsLeft = args.drafts_remaining || 1;
            this.bga.statusBar.setTitle(
                draftsLeft > 1
                    ? _('${you} may claim ${drafts_left} supporter cards (Clan Cochrane active!)').replace('${drafts_left}', draftsLeft)
                    : _('${you} must choose a supporter card to claim as victory points')
            );
            this.game.highlightSupportersForDraft(args.supporters);
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} is choosing a supporter card to claim'));
            this.game.clearHighlights();
        }
    }

    onLeavingState() {
        this.game.clearHighlights();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;

        // Register States
        this.bga.states.register('PlayerTurn', new PlayerTurn(this, bga));
        this.bga.states.register('ResolvePowerWemyss', new ResolvePowerWemyss(this, bga));
        this.bga.states.register('ResolvePowerFergusson', new ResolvePowerFergusson(this, bga));
        this.bga.states.register('ResolvePowerScott', new ResolvePowerScott(this, bga));
        this.bga.states.register('ResolvePowerCockburn', new ResolvePowerCockburn(this, bga));
        this.bga.states.register('DraftSupporter', new DraftSupporter(this, bga));

        this.selectedHandCardId = null;
    }

    isCurrentPlayerActive() {
        if (this.bga && typeof this.bga.isCurrentPlayerActive === 'function') {
            return this.bga.isCurrentPlayerActive();
        }
        if (this.bga?.states && typeof this.bga.states.isCurrentPlayerActive === 'function') {
            return this.bga.states.isCurrentPlayerActive();
        }
        if (this.bga?.players && typeof this.bga.players.isCurrentPlayerActive === 'function') {
            return this.bga.players.isCurrentPlayerActive();
        }
        if (typeof gameui !== 'undefined' && typeof gameui.isCurrentPlayerActive === 'function') {
            return gameui.isCurrentPlayerActive();
        }
        return false;
    }

    getActivePlayerId() {
        if (this.bga?.players && typeof this.bga.players.getActivePlayerId === 'function') {
            return this.bga.players.getActivePlayerId();
        }
        if (typeof gameui !== 'undefined' && typeof gameui.getActivePlayerId === 'function') {
            return gameui.getActivePlayerId();
        }
        return null;
    }

    // Safe player ID comparison: PHP sends ints, BGA stores strings — never use ===
    isCurrentPlayer(playerId) {
        if (!playerId || !this.bga?.player_id) return false;
        return parseInt(playerId, 10) === parseInt(this.bga.player_id, 10);
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;

        // Inject Lords of Scotland main board structure
        this.bga.gameArea.getElement().innerHTML = `
            <div id="los-container">
                <!-- Status & Round Tracker Header -->
                <div id="los-header" class="los-panel">
                    <div class="los-status-item">
                        <span class="los-label">Skirmish</span>
                        <span id="los-skirmish-val" class="los-val">#${gamedatas.current_skirmish}</span>
                    </div>
                    <div class="los-status-item">
                        <span class="los-label">Round</span>
                        <span id="los-round-val" class="los-val">${gamedatas.current_round} / 5</span>
                    </div>
                    <div class="los-status-item">
                        <span class="los-label">Victor's Initiative</span>
                        <span id="los-vi-val" class="los-val"></span>
                    </div>
                    <div class="los-status-item">
                        <span class="los-label">Lowest Face-Up</span>
                        <span id="los-lowest-val" class="los-val">${gamedatas.lowest_face_up !== null ? gamedatas.lowest_face_up : '-'}</span>
                    </div>
                </div>

                <!-- Center Table: Recruit Row & Supporter Row -->
                <div id="los-center-table" class="los-panel">
                    <div class="los-section-title">
                        <span>Recruit Row</span>
                        <span class="los-subtext">(Round counter: Slot flipped per round)</span>
                    </div>
                    <div id="los-recruit-row" class="los-cards-row"></div>

                    <div class="los-section-title" style="margin-top: 14px;">
                        <span>Supporter Row (Victory Points)</span>
                        <span class="los-subtext">(Claimed at end of skirmish)</span>
                    </div>
                    <div id="los-supporter-row" class="los-cards-row"></div>
                </div>

                <!-- Current Player Hand Area (Positioned above Mustered Armies) -->
                <div id="los-hand-container" class="los-panel">
                    <div class="los-section-title">
                        <span>Your Hand</span>
                        <span id="los-hand-count" class="los-subtext"></span>
                    </div>
                    <div id="los-hand-cards" class="los-cards-row"></div>
                </div>

                <!-- Player Army Lines -->
                <div id="los-armies-container"></div>
            </div>
        `;

        this.renderRecruitRow(gamedatas.recruit);
        this.renderSupporterRow(gamedatas.supporters);
        this.renderHand(gamedatas.hand);
        this.renderArmies(gamedatas.armies);
        this.updateVictorInitiativeBadge();

        this.setupNotifications();
    }

    updateVictorInitiativeBadge() {
        const viPlayerId = parseInt(this.gamedatas?.victor_initiative, 10);
        const viPlayer = this.gamedatas?.players?.[viPlayerId];
        const el = document.getElementById('los-vi-val');
        if (el && viPlayer) {
            el.innerHTML = `<span style="color: #${viPlayer.color}; font-weight: bold;">👑 ${viPlayer.name}</span>`;
        }

        // Synchronize crown badge on player army headers
        document.querySelectorAll('.los-army-box').forEach(box => {
            const boxPlayerId = parseInt(box.dataset.playerId, 10);
            const titleEl = box.querySelector('.los-army-player-title');
            if (!titleEl) return;

            const existingBadge = titleEl.querySelector('.los-crown-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            if (viPlayerId && boxPlayerId === viPlayerId) {
                const badge = document.createElement('span');
                badge.className = 'los-crown-badge';
                badge.title = _('Victor’s Initiative');
                badge.textContent = '👑 Initiative';
                titleEl.appendChild(badge);
            }
        });
    }

    renderRecruitRow(recruitCards) {
        const container = document.getElementById('los-recruit-row');
        if (!container) return;
        container.innerHTML = '';

        for (let slot = 0; slot < 5; slot++) {
            const card = recruitCards.find(c => parseInt(c.slot) === slot);
            const slotEl = document.createElement('div');
            slotEl.id = `recruit-slot-${slot}`;
            slotEl.className = 'los-card-slot';

            if (card) {
                const cardEl = this.createCardElement(card, 'recruit');
                slotEl.appendChild(cardEl);
            } else {
                slotEl.innerHTML = `<div class="los-empty-slot">Slot ${slot + 1}</div>`;
            }
            container.appendChild(slotEl);
        }
    }

    renderSupporterRow(supporters) {
        const container = document.getElementById('los-supporter-row');
        if (!container) return;
        container.innerHTML = '';

        if (!supporters || supporters.length === 0) {
            container.innerHTML = '<div class="los-empty-msg">No supporter cards remaining in this skirmish</div>';
            return;
        }

        supporters.forEach(card => {
            const cardEl = this.createCardElement(card, 'supporter');
            container.appendChild(cardEl);
        });
    }

    renderArmies(armies) {
        const container = document.getElementById('los-armies-container');
        if (!container) return;
        container.innerHTML = '';

        const myId = parseInt(this.bga?.player_id, 10);
        const viPlayerId = parseInt(this.gamedatas?.victor_initiative, 10);

        // Sort so current player's army is rendered FIRST (directly under Your Hand)
        const playersList = Object.entries(this.gamedatas.players || {}).map(([key, p]) => {
            return {
                id: parseInt(p.id || p.player_id || key, 10),
                name: p.name || p.player_name || '',
                color: p.color || p.player_color || 'ffffff',
                score: p.score ?? p.player_score ?? 0,
                player_no: parseInt(p.player_no || p.no || 0, 10)
            };
        }).sort((a, b) => {
            if (a.id === myId) return -1;
            if (b.id === myId) return 1;
            return a.player_no - b.player_no;
        });

        playersList.forEach(player => {
            const pId = player.id;
            const playerArmy = (armies && armies[pId]) ? armies[pId] : [];

            const armyBox = document.createElement('div');
            armyBox.id = `player-army-box-${pId}`;
            armyBox.dataset.playerId = pId;
            armyBox.className = 'los-panel los-army-box';
            if (pId === myId) {
                armyBox.classList.add('los-my-army');
            }

            const isVI = Boolean(viPlayerId && pId === viPlayerId);
            const isMe = (pId === myId);

            armyBox.innerHTML = `
                <div class="los-army-header">
                    <div class="los-army-player-title">
                        <span class="los-player-dot" style="background-color: #${player.color};"></span>
                        <strong style="color: #${player.color};">${player.name}</strong>
                        ${isMe ? '<span class="los-you-badge">(You)</span>' : ''}
                        ${isVI ? '<span class="los-crown-badge" title="Victor’s Initiative">👑 Initiative</span>' : ''}
                    </div>
                    <div class="los-army-score-info">
                        <span>Total Score: <strong id="score-${pId}">${player.score}</strong> pts</span>
                        <span class="los-army-strength" id="army-strength-${pId}">Army: ${playerArmy.length} cards</span>
                    </div>
                </div>
                <div id="army-cards-${pId}" class="los-cards-row los-army-cards-row"></div>
            `;

            const cardsRow = armyBox.querySelector(`#army-cards-${pId}`);
            if (playerArmy.length === 0) {
                cardsRow.innerHTML = '<div class="los-empty-army">No cards mustered yet</div>';
            } else {
                playerArmy.forEach(card => {
                    const cardEl = this.createCardElement(card, 'army', pId);
                    cardsRow.appendChild(cardEl);
                });
            }

            container.appendChild(armyBox);
        });
    }

    renderHand(handCards) {
        const container = document.getElementById('los-hand-cards');
        const countEl = document.getElementById('los-hand-count');
        if (!container) return;
        container.innerHTML = '';

        if (countEl) {
            countEl.textContent = `(${handCards.length} / 10 cards)`;
        }

        if (!handCards || handCards.length === 0) {
            container.innerHTML = '<div class="los-empty-msg">Your hand is empty</div>';
            return;
        }

        handCards.forEach(card => {
            const cardEl = this.createCardElement(card, 'hand');
            container.appendChild(cardEl);
        });
    }

    createCardElement(card, context, playerId = null) {
        const el = document.createElement('div');
        el.id = `card-${card.card_id}`;
        el.className = `los-card clan-${card.clan}`;
        el.dataset.cardId = card.card_id;
        el.dataset.clan = card.clan;
        el.dataset.strength = card.strength;

        if (card.clan === 'hidden') {
            el.classList.add('los-card-back');
            el.innerHTML = `
                <div class="los-card-back-pattern">
                    <div class="los-back-shield">⚔️</div>
                    <div class="los-back-text">Lords of Scotland</div>
                </div>
            `;
            return el;
        }

        const clanInfo = this.gamedatas.clans[card.clan] || { name: card.clan, power: '', desc: '' };
        const isBruce = (card.clan === 'bruce');
        const isPersisted = (card.persisted == 1);
        // You can see your own face-down army card's real face, but it's still secret to opponents.
        const isSecretToOthers = (context === 'army') && card.is_face_up !== undefined && Number(card.is_face_up) === 0;

        el.innerHTML = `
            ${isSecretToOthers ? '<div class="los-hidden-badge" title="Hidden from opponents until revealed">🙈 Hidden</div>' : ''}
            <div class="los-card-corner-top">
                <span class="los-card-strength">${isBruce ? '★' : card.strength}</span>
                <span class="los-card-clan-name">${clanInfo.name}</span>
            </div>
            <div class="los-card-crest">
                <span class="los-crest-icon">${this.getClanIcon(card.clan)}</span>
            </div>
            <div class="los-card-body">
                <div class="los-card-power-title">${isBruce ? 'Wildcard' : clanInfo.power}</div>
                <div class="los-card-power-desc">${clanInfo.desc}</div>
                ${card.copied_clan ? `<div class="los-copied-badge">Copied: ${card.copied_clan}</div>` : ''}
                ${isPersisted ? '<div class="los-persisted-badge">🛡️ Persisted</div>' : ''}
            </div>
            <div class="los-card-corner-bottom">
                <span class="los-card-strength-small">${isBruce ? '★' : card.strength}</span>
            </div>
        `;

        if (context === 'hand') {
            const canPower = card.can_activate_power;
            const powerBadge = document.createElement('div');
            powerBadge.className = `los-power-status-badge ${canPower ? 'power-ready' : 'power-dormant'}`;
            powerBadge.textContent = canPower ? '⚡ Power Active' : 'Normal Play';
            el.appendChild(powerBadge);

            el.addEventListener('click', () => this.onHandCardClick(card));
        }

        return el;
    }

    getClanIcon(clan) {
        const icons = {
            makgill: '🏹',
            fergusson: '🔄',
            wemyss: '🗡️',
            scott: '🎭',
            forsyth: '📜',
            cockburn: '🤝',
            cochrane: '🏆',
            macdonnell: '🛡️',
            bruce: '👑',
        };
        return icons[clan] || '⚔️';
    }

    // FLIP-style travel animation: el is already in its final DOM position;
    // fromRect (a getBoundingClientRect() captured before the move) is where it visually came from.
    flyCardFromRect(el, fromRect) {
        if (!el || !fromRect) return;
        const toRect = el.getBoundingClientRect();
        const dx = fromRect.left - toRect.left;
        const dy = fromRect.top - toRect.top;
        if (!dx && !dy) return;

        el.classList.add('los-card-flying');
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
                el.style.transform = 'translate(0, 0)';
            });
        });

        const cleanup = () => {
            el.style.transition = '';
            el.style.transform = '';
            el.classList.remove('los-card-flying');
            el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
        setTimeout(cleanup, 600); // safety net if transitionend never fires
    }

    popInCard(el) {
        if (!el) return;
        el.classList.add('los-card-pop-in');
        el.addEventListener('animationend', () => el.classList.remove('los-card-pop-in'), { once: true });
    }

    onHandCardClick(card) {
        if (!this.isCurrentPlayerActive()) return;

        // Toggle selection
        if (this.selectedHandCardId === card.card_id) {
            this.selectedHandCardId = null;
            document.querySelectorAll('#los-hand-cards .los-card.selected').forEach(c => c.classList.remove('selected'));
            this.clearActionButtons();
            return;
        }

        document.querySelectorAll('#los-hand-cards .los-card.selected').forEach(c => c.classList.remove('selected'));
        const cardEl = document.getElementById(`card-${card.card_id}`);
        if (cardEl) cardEl.classList.add('selected');

        this.selectedHandCardId = card.card_id;

        // Display action buttons in status bar
        this.clearActionButtons();

        const clanInfo = this.gamedatas.clans[card.clan] || { name: card.clan, power: '' };
        const canPower = card.can_activate_power;

        this.bga.statusBar.addActionButton(
            canPower 
                ? _('Muster Face-Up (Activate ${power})').replace('${power}', clanInfo.power)
                : _('Muster Face-Up (${clan})').replace('${clan}', clanInfo.name),
            () => this.bga.actions.performAction('actMuster', { card_id: card.card_id, face_up: true }),
            { color: canPower ? 'primary' : 'secondary' }
        );

        this.bga.statusBar.addActionButton(
            _('Muster Face-Down (Hidden)'),
            () => this.bga.actions.performAction('actMuster', { card_id: card.card_id, face_up: false }),
            { color: 'secondary' }
        );

        this.bga.statusBar.addActionButton(
            _('Cancel'),
            () => {
                if (cardEl) cardEl.classList.remove('selected');
                this.selectedHandCardId = null;
                this.clearActionButtons();
            },
            { color: 'secondary' }
        );
    }

    highlightRecruitCards(canRecruit) {
        document.querySelectorAll('#los-recruit-row .los-card').forEach(el => {
            el.classList.remove('highlight-action');
            if (canRecruit) {
                el.classList.add('highlight-action');
                el.onclick = () => {
                    if (!this.isCurrentPlayerActive()) return;
                    const cardId = parseInt(el.dataset.cardId, 10);
                    this.bga.actions.performAction('actRecruit', { card_id: cardId });
                };
            } else {
                el.onclick = null;
            }
        });
    }

    highlightHandCards(canMuster, handCards) {
        document.querySelectorAll('#los-hand-cards .los-card').forEach(el => {
            el.classList.remove('highlight-action');
            if (canMuster) {
                el.classList.add('highlight-action');
            }
        });
    }

    highlightArmyCardsForWemyss(eligibleCards) {
        const eligibleIds = (eligibleCards || []).map(c => parseInt(c.card_id));
        document.querySelectorAll('.los-army-cards-row .los-card').forEach(el => {
            const cardId = parseInt(el.dataset.cardId);
            if (eligibleIds.includes(cardId)) {
                el.classList.add('highlight-target');
                el.onclick = () => {
                    this.bga.actions.performAction('actChooseDiscard', { target_card_id: cardId });
                };
            }
        });
    }

    highlightArmyCardsForFergusson(eligibleCards) {
        const eligibleIds = (eligibleCards || []).map(c => parseInt(c.card_id));
        document.querySelectorAll('.los-army-cards-row .los-card').forEach(el => {
            const cardId = parseInt(el.dataset.cardId);
            if (eligibleIds.includes(cardId)) {
                el.classList.add('highlight-target');
                el.onclick = () => {
                    this.bga.actions.performAction('actChooseSwap', { target_card_id: cardId });
                };
            }
        });
    }

    highlightArmyCardsForScott(eligibleCards) {
        const eligibleIds = (eligibleCards || []).map(c => parseInt(c.card_id));
        document.querySelectorAll('.los-army-cards-row .los-card').forEach(el => {
            const cardId = parseInt(el.dataset.cardId);
            if (eligibleIds.includes(cardId)) {
                el.classList.add('highlight-target');
                el.onclick = () => {
                    this.bga.actions.performAction('actChooseCopy', { target_card_id: cardId });
                };
            }
        });
    }

    highlightSupportersForCockburn(supporters) {
        document.querySelectorAll('#los-supporter-row .los-card').forEach(el => {
            el.classList.add('highlight-target');
            el.onclick = () => {
                const cardId = parseInt(el.dataset.cardId);
                this.bga.actions.performAction('actChooseSupporterSwap', { supporter_card_id: cardId });
            };
        });
    }

    highlightSupportersForDraft(supporters) {
        document.querySelectorAll('#los-supporter-row .los-card').forEach(el => {
            el.classList.add('highlight-target');
            el.onclick = () => {
                const cardId = parseInt(el.dataset.cardId);
                this.bga.actions.performAction('actDraftSupporter', { card_id: cardId });
            };
        });
    }

    clearActionButtons() {
        try {
            if (this.bga && this.bga.statusBar && typeof this.bga.statusBar.removeActionButtons === 'function') {
                this.bga.statusBar.removeActionButtons();
            } else if (this.bga && this.bga.statusBar && typeof this.bga.statusBar.clearActionButtons === 'function') {
                this.bga.statusBar.clearActionButtons();
            }
        } catch (e) {
            // Ignore if statusBar is not fully available
        }
        const actionsContainer = document.getElementById('generalactions');
        if (actionsContainer) {
            actionsContainer.innerHTML = '';
        }
    }

    clearHighlights() {
        document.querySelectorAll('.highlight-action, .highlight-target, .selected').forEach(el => {
            el.classList.remove('highlight-action', 'highlight-target', 'selected');
            el.onclick = null;
        });
        this.clearActionButtons();
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }

    _getNotifArgs(notif) {
        if (!notif) return {};
        return (notif.args !== undefined) ? notif.args : notif;
    }

    async notif_cardRecruited(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, slot, card, refill_card } = args;
        const isMine = this.isCurrentPlayer(player_id);

        // Capture the slot's current card position before we clear it, so the card
        // that lands in the hand can visibly travel from the recruit row.
        const slotEl = document.getElementById(`recruit-slot-${slot}`);
        const recruitedCardRect = (isMine && slotEl) ? slotEl.querySelector('.los-card')?.getBoundingClientRect() : null;

        if (slotEl) {
            slotEl.innerHTML = '';
            if (refill_card) {
                const refillEl = this.createCardElement(refill_card, 'recruit');
                slotEl.appendChild(refillEl);
                this.popInCard(refillEl);
            }
        }
        // If current player recruited, add card to hand
        // NOTE: Use isCurrentPlayer() — PHP sends player_id as int, BGA stores it as string.
        if (isMine) {
            const handContainer = document.getElementById('los-hand-cards');
            if (handContainer && card) {
                // Remove any duplicate (e.g. optimistic insert, or the follow-up private reveal) before appending
                const existing = document.getElementById(`card-${card.card_id}`);
                if (existing) existing.remove();
                // Remove empty-hand placeholder if present
                const emptyMsg = handContainer.querySelector('.los-empty-msg');
                if (emptyMsg) emptyMsg.remove();
                const newCardEl = this.createCardElement(card, 'hand');
                handContainer.appendChild(newCardEl);
                if (recruitedCardRect) {
                    this.flyCardFromRect(newCardEl, recruitedCardRect);
                } else {
                    this.popInCard(newCardEl);
                }
            }
            const countEl = document.getElementById('los-hand-count');
            if (countEl && handContainer) {
                countEl.textContent = `(${handContainer.children.length} / 10 cards)`;
            }
        }
    }

    async notif_cardMustered(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, card_id, clan, strength, is_face_up, reveal_to_owner } = args;
        // reveal_to_owner: private follow-up notif that tells the owner the true identity
        // of their own face-down card (the public broadcast never carries clan/strength).
        const showRealFace = is_face_up || reveal_to_owner;
        // Remove from current player's hand if it's them, but capture where it was first
        // so the card can visibly travel from hand into the army row.
        // NOTE: Use isCurrentPlayer() — PHP sends player_id as int, BGA stores it as string.
        const handCardEl = document.getElementById(`card-${card_id}`);
        const isMine = this.isCurrentPlayer(player_id);
        const musteredFromRect = (isMine && handCardEl) ? handCardEl.getBoundingClientRect() : null;
        if (handCardEl && isMine) {
            handCardEl.remove();
            const countEl = document.getElementById('los-hand-count');
            const handContainer = document.getElementById('los-hand-cards');
            if (countEl && handContainer) {
                countEl.textContent = `(${handContainer.children.length} / 10 cards)`;
            }
        }
        // Add to player's army
        const armyRow = document.getElementById(`army-cards-${player_id}`);
        if (armyRow) {
            const emptyMsg = armyRow.querySelector('.los-empty-army');
            if (emptyMsg) emptyMsg.remove();

            // Remove duplicate if already there
            const existingInArmy = armyRow.querySelector(`[data-card-id="${card_id}"]`);
            if (existingInArmy) existingInArmy.remove();

            const cardData = {
                card_id,
                clan: showRealFace ? clan : 'hidden',
                strength: showRealFace ? strength : 0,
                is_face_up,
            };
            const newCardEl = this.createCardElement(cardData, 'army', player_id);
            armyRow.appendChild(newCardEl);
            if (musteredFromRect) {
                this.flyCardFromRect(newCardEl, musteredFromRect);
            } else {
                this.popInCard(newCardEl);
            }
        }
        const armyStrengthEl = document.getElementById(`army-strength-${player_id}`);
        if (armyStrengthEl && armyRow) {
            armyStrengthEl.textContent = `Army: ${armyRow.children.length} cards`;
        }
        this.updateLowestFaceUp();
    }

    async notif_powerActivated(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, clan, strength, power_desc } = args;
        const armyRow = document.getElementById(`army-cards-${player_id}`);
        if (armyRow) {
            armyRow.classList.add('power-burst-animation');
            setTimeout(() => armyRow.classList.remove('power-burst-animation'), 1200);
        }
    }

    async notif_cardDrawn(notif) {
        const args = this._getNotifArgs(notif);
        const { card } = args;
        const handContainer = document.getElementById('los-hand-cards');
        if (handContainer && card) {
            handContainer.appendChild(this.createCardElement(card, 'hand'));
        }
        const countEl = document.getElementById('los-hand-count');
        if (countEl && handContainer) {
            countEl.textContent = `(${handContainer.children.length} / 10 cards)`;
        }
    }

    async notif_newRoundStarted(notif) {
        const args = this._getNotifArgs(notif);
        const { round_num, slot, flipped_card } = args;
        const roundEl = document.getElementById('los-round-val');
        if (roundEl) roundEl.textContent = `${round_num} / 5`;

        const slotEl = document.getElementById(`recruit-slot-${slot}`);
        if (slotEl && flipped_card) {
            slotEl.innerHTML = '';
            slotEl.appendChild(this.createCardElement(flipped_card, 'recruit'));
        }
    }

    async notif_skirmishResolved(notif) {
        const args = this._getNotifArgs(notif);
        const { rankings } = args;
        // Reveal all army cards
        if (Array.isArray(rankings)) {
            rankings.forEach(r => {
                const armyRow = document.getElementById(`army-cards-${r.player_id}`);
                if (armyRow && r.cards) {
                    armyRow.innerHTML = '';
                    r.cards.forEach(c => {
                        armyRow.appendChild(this.createCardElement(c, 'army', r.player_id));
                    });
                }
                const strengthEl = document.getElementById(`army-strength-${r.player_id}`);
                if (strengthEl) {
                    strengthEl.innerHTML = `Army: <strong>${r.total}</strong> pts ${r.doubled ? '🔥 (DOUBLED!)' : ''}`;
                }
            });
        }
    }

    async notif_supporterDrafted(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, card_id, new_score } = args;
        // Remove from supporter row
        const cardEl = document.getElementById(`card-${card_id}`);
        if (cardEl) cardEl.remove();

        // Update score
        const scoreEl = document.getElementById(`score-${player_id}`);
        if (scoreEl) scoreEl.textContent = new_score;
    }

    async notif_newSkirmishStarted(notif) {
        const args = this._getNotifArgs(notif);
        const { skirmish_num, winner_id } = args;
        const skirmishEl = document.getElementById('los-skirmish-val');
        if (skirmishEl) skirmishEl.textContent = `#${skirmish_num}`;

        const roundEl = document.getElementById('los-round-val');
        if (roundEl) roundEl.textContent = `1 / 5`;

        const lowestEl = document.getElementById('los-lowest-val');
        if (lowestEl) lowestEl.textContent = '-';

        this.gamedatas.victor_initiative = winner_id;
        this.updateVictorInitiativeBadge();
    }

    async notif_powerWemyssUsed(notif) {
        const args = this._getNotifArgs(notif);
        const cardId = args.target_card_id || args.card_id;
        const victimId = args.victim_id;
        const cardEl = document.getElementById(`card-${cardId}`);
        if (cardEl) cardEl.remove();
        const armyRow = document.getElementById(`army-cards-${victimId}`);
        const armyStrengthEl = document.getElementById(`army-strength-${victimId}`);
        if (armyStrengthEl && armyRow) {
            armyStrengthEl.textContent = `Army: ${armyRow.children.length} cards`;
        }
        this.updateLowestFaceUp();
    }

    async notif_powerFergussonUsed(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, target_player_id, fergusson_card_id, target_card_id, fergusson_card, target_card } = args;
        const ownEl = document.getElementById(`card-${fergusson_card_id}`);
        const targetEl = document.getElementById(`card-${target_card_id}`);
        const ownArmyRow = document.getElementById(`army-cards-${player_id}`);
        const targetArmyRow = document.getElementById(`army-cards-${target_player_id}`);

        if (ownArmyRow && targetArmyRow) {
            if (ownEl) ownEl.remove();
            if (targetEl) targetEl.remove();

            if (fergusson_card) {
                targetArmyRow.appendChild(this.createCardElement(fergusson_card, 'army', target_player_id));
            }
            if (target_card) {
                ownArmyRow.appendChild(this.createCardElement(target_card, 'army', player_id));
            }

            const ownStrengthEl = document.getElementById(`army-strength-${player_id}`);
            if (ownStrengthEl) ownStrengthEl.textContent = `Army: ${ownArmyRow.children.length} cards`;
            const targetStrengthEl = document.getElementById(`army-strength-${target_player_id}`);
            if (targetStrengthEl) targetStrengthEl.textContent = `Army: ${targetArmyRow.children.length} cards`;
        }
        this.updateLowestFaceUp();
    }

    async notif_powerCockburnUsed(notif) {
        const args = this._getNotifArgs(notif);
        const { player_id, cockburn_card_id, supporter_card_id, cockburn_card, supporter_card } = args;
        const armyCardEl = document.getElementById(`card-${cockburn_card_id}`);
        const supporterCardEl = document.getElementById(`card-${supporter_card_id}`);
        const armyRow = document.getElementById(`army-cards-${player_id}`);
        const supporterRow = document.getElementById('los-supporter-row');

        if (armyRow && supporterRow) {
            if (armyCardEl) armyCardEl.remove();
            if (supporterCardEl) supporterCardEl.remove();

            if (supporter_card) {
                armyRow.appendChild(this.createCardElement(supporter_card, 'army', player_id));
            }
            if (cockburn_card) {
                supporterRow.appendChild(this.createCardElement(cockburn_card, 'supporter'));
            }

            const armyStrengthEl = document.getElementById(`army-strength-${player_id}`);
            if (armyStrengthEl) armyStrengthEl.textContent = `Army: ${armyRow.children.length} cards`;
        }
        this.updateLowestFaceUp();
    }

    async notif_powerScottUsed(notif) {
        const args = this._getNotifArgs(notif);
        const { scott_card_id, copied_clan_name } = args;
        const cardEl = document.getElementById(`card-${scott_card_id}`);
        if (cardEl) {
            let badge = cardEl.querySelector('.los-copied-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'los-copied-badge';
                cardEl.appendChild(badge);
            }
            badge.textContent = `Copied: ${copied_clan_name}`;
        }
    }

    async notif_deckCardDrawn(notif) {
        // Notification logged automatically by BGA log system
    }

    async notif_playerPassed(notif) {
        this.clearHighlights();
    }

    async notif_cardRevealedToOwner(notif) {
        const args = this._getNotifArgs(notif);
        const { card, player_id } = args;
        if (card && this.isCurrentPlayer(player_id)) {
            const cardEl = document.getElementById(`card-${card.card_id}`);
            if (cardEl && cardEl.parentNode) {
                const newEl = this.createCardElement(card, 'army', player_id);
                cardEl.parentNode.replaceChild(newEl, cardEl);
            }
        }
    }

    updateLowestFaceUp() {
        let minStrength = null;
        document.querySelectorAll('#los-armies-container .los-card:not(.los-card-back)').forEach(el => {
            const strAttr = el.dataset.strength;
            if (strAttr !== undefined && strAttr !== '') {
                const val = parseInt(strAttr, 10);
                if (!isNaN(val) && val > 0) {
                    if (minStrength === null || val < minStrength) {
                        minStrength = val;
                    }
                }
            }
        });
        const el = document.getElementById('los-lowest-val');
        if (el) el.textContent = minStrength !== null ? minStrength : '-';
    }
}

