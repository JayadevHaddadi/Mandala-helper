/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Mandala implementation : © Sergio Cabrera sergiocabrera0904@gmail.com
 * Helper functions and modules:
 * core_patch_tooltip_position.js and core_patch_tooltip_show.js from cacaoimprovements implementation by yannsnow
 * bga-help.js from Thoun's boilerplate
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * mandala.js
 *
 * Mandala user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo","dojo/_base/declare",
	g_gamethemeurl + 'modules/js/core_patch_tooltip_position.js',
	g_gamethemeurl + 'modules/js/core_patch_tooltip_show.js',
    g_gamethemeurl + "modules/js/bga-help.js",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock"
],
function (dojo, declare, bgaHelp) {
    return declare("bgagame.mandala", [
            ebg.core.gamegui,
            ebg.core.core_patch_tooltip_position,
            ebg.core.core_patch_tooltip_show
        ], {
        constructor: function(){
            console.log('mandala constructor');

            // Scale according to the screen resolution
            this.mdlScale = getComputedStyle(document.body).getPropertyValue('--mdlScale');

            this.colors = ['red','orange','green','yellow','purple','black'];

            this.spriteCardSize = 400;
            this.cardSize = 98 * this.mdlScale;

            this.handsCounter = [];
            this.cupsCounter = [];
            this.cupsColorCounter = []
            this.deckCounter;
            this.discardPileCounter;

            // To show the card facedown or not
            this.showBack = false;

            // To consider showing the playmat for the second player in reverted order
            this.reverted = false;
            // Color blind support
            this.cb;

            // Solo properties
            this.masterYoga = {
                id: -1,
                name: 'Master Yoga',
                color: '000000'
            }
            this.masterYogaTurn;
        },

        /*
            setup:

            This method must set up the game user interface according to current game situation specified
            in parameters.

            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */

        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );

            // Colorblind suffix
            this.cb = this.bga.userPreferences.get(100) == 2 ? "_cb" : "";

            // Setting scale
            this.resizeListener = dojo.connect(window, 'resize', () => this.setScale());

            /////// Creating stocks

            // Mountains stocks
            this.mountains = [];
            this.mountains['mountain_1'] = new ebg.stock();
            this.mountains['mountain_2'] = new ebg.stock();

            for(var mountain in this.mountains) {
                this.mountains[mountain].create( this, $('mdl_' + mountain), this.spriteCardSize, this.spriteCardSize );
                this.mountains[mountain].image_items_per_row = 8;
                this.mountains[mountain].setSelectionMode(0);
                this.mountains[mountain].setSelectionAppearance("class");
                this.mountains[mountain].onItemCreate = dojo.hitch(this,'setSelectedStock');
                this.mountains[mountain].use_vertical_overlap_as_offset = false;
                this.mountains[mountain].vertical_overlap = 75; // overlap
                this.mountains[mountain].resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
            }

            // Fields stocks
            this.fields = [];
            this.fields['field_1'] = [];
            this.fields['field_2'] = [];
            for( var playerId in gamedatas.players )
            {
                this.initPlayerFields(playerId);
            }
            if (this.isSoloMode()) {
                this.initPlayerFields(this.masterYoga.id);
                this.masterYogaTurn = 1;
            }

            // Player hand stock
            this.playerHand = new ebg.stock(); // new stock object for hand
            this.playerHand.create( this, $('mdl_player_hand'), this.spriteCardSize, this.spriteCardSize );
            this.playerHand.image_items_per_row = 8;
            this.playerHand.setSelectionMode(0);
            this.playerHand.setSelectionAppearance("class");
            this.playerHand.centerItems = true;
            this.playerHand.resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
            this.playerHand.onItemCreate = dojo.hitch(this,'showBackForAnimation');

            // Adding card types to all stocks
            for (var i in this.colors) {
                // this.mountains['mountain_1'].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                // this.mountains['mountain_2'].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                var weight = !this.isSoloMode() ? i : 0;
                this.mountains['mountain_1'].addItemType(i, weight, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                this.mountains['mountain_2'].addItemType(i, weight, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                this.playerHand.addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                for( var playerId in gamedatas.players ) {
                    this.fields['field_1'][playerId].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                    this.fields['field_2'][playerId].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                }
                if (this.isSoloMode()) {
                    this.fields['field_1'][this.masterYoga.id].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                    this.fields['field_2'][this.masterYoga.id].addItemType(i, i, g_gamethemeurl + 'img/mandala_cards'+this.cb+'.png', i);
                }
            }

            // Placing cards in the stocks

            // Mountains
            Object.values(gamedatas.mountain_1).forEach((elem) => {
                if (this.isSoloMode()) {
                    var objectWeight = { [elem.type_arg]: elem.location_arg };
                    this.mountains['mountain_1'].changeItemsWeight(objectWeight);
                }
                this.mountains['mountain_1'].addToStockWithId(elem.type_arg,elem.id);
            });
            this.mountains['mountain_1'].horizontal_overlap = this.getOverlap(this.mountains['mountain_1']);
            Object.values(gamedatas.mountain_2).forEach((elem) => {
                if (this.isSoloMode()) {
                    var objectWeight = { [elem.type_arg]: elem.location_arg };
                    this.mountains['mountain_2'].changeItemsWeight(objectWeight);
                }
                this.mountains['mountain_2'].addToStockWithId(elem.type_arg,elem.id);
            });
            this.mountains['mountain_2'].horizontal_overlap = this.getOverlap(this.mountains['mountain_2']);

            if (!this.isSpectator) {
                Object.values(gamedatas.players[this.player_id].hand).forEach((elem) => {
                    this.playerHand.addToStockWithId(elem.type_arg,elem.id);
                });
            }

            // Setting up player boards
            for( var playerId in gamedatas.players )
            {
                this.setupPlayerBoard(gamedatas.players[playerId],playerId);
            }
            if (this.isSoloMode()) {
                this.setupPlayerBoard(gamedatas.masteryoga,this.masterYoga.id);
            }

            // Including help button
            this.helpManager = new HelpManager({}, {
                buttons: [
                    new BgaHelpPopinButton({
                        title: _("Player Aid"),
                        html: this.format_block('jstpl_help_tooltip', {})
                        // buttonBackground: 'red'
                    })
                ],
            });

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            if (gamedatas.finalScore != null) {
                this.scoreDlg = this.displayTableWindow(
                    'finalScoring',
                    _( "End game scoring" ),
                    gamedatas.finalScore,
                    '',
                    '',
                    _('Close')
                );
            }

            console.log( "Ending game setup" );
        },


        ///////////////////////////////////////////////////
        //// Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            switch( stateName )
            {
                case 'playerTurn':
                    if (this.isSoloMode()) {
                        dojo.query('.mdl_masteryoga_active').forEach((elem) => {
                            dojo.removeClass(elem.id,'mdl_masteryoga_active');
                        })
                    }
                    if(this.isCurrentPlayerActive()) {
                        this.playerHand.setSelectionMode(2);
                        this.connect(this.playerHand, 'onChangeSelection', 'onSelectHand');
                    }
                    break;
                case 'claimCards':
                    if (this.isSoloMode()) {
                        dojo.query('.mdl_masteryoga_active').forEach((elem) => {
                            dojo.removeClass(elem.id,'mdl_masteryoga_active');
                        })
                    }
                    if (this.isCurrentPlayerActive()) {
                        // Make Mandala more visible
                        dojo.addClass('mdl_mandala_'+args.args.mandalaId,'mdl_completed');

                        this.mountains['mountain_'+args.args.mandalaId].setSelectionMode(2);
                        this.connect(this.mountains['mountain_'+args.args.mandalaId], 'onChangeSelection', 'onClaimCards');
                        // Hide the layer on top of the cards to be able to select them
                        dojo.addClass('mdl_mountain_' + args.args.mandalaId + '_stock','hidden');

                        if ($('mdl_field_' + args.args.mandalaId + '_' + this.getActivePlayerId()).children.length == 1) {
                            this.gamedatas.gamestate.descriptionmyturn = _("Mandala completed: ${you} must claim cards for the Discard pile");
                            this.updatePageTitle();
                        }    
                    }
                    
                    break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            switch( stateName )
            {
                case 'claimCards':
                    dojo.query('.mdl_completed').forEach((elem) => {
                        dojo.removeClass(elem.id,'mdl_completed');
                    });
                    dojo.query('.mdl_my_river .mdl_candidate').forEach((elem) => {
                        dojo.removeClass(elem.id,'mdl_candidate');
                    });
                    break;
            }
        },

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //
        onUpdateActionButtons: function( stateName, args )
        {
            if( this.isCurrentPlayerActive() )
            {
                switch( stateName )
                {
                    case 'playerTurn':
                        this.addActionButton( 'button_mountain_' + (!this.reverted ? '1' : '2'), _('Mountain 1'), (evt)=>this.onAreaClick(evt));
                        this.addActionButton( 'button_mountain_' + (!this.reverted ? '2' : '1'), _('Mountain 2'), (evt)=>this.onAreaClick(evt));
                        dojo.addClass('button_mountain_1','disabled');
                        dojo.addClass('button_mountain_2','disabled');
                        this.addActionButton( 'button_field_' + (!this.reverted ? '1' : '2'), _('Field 1'), (evt)=>this.onAreaClick(evt));
                        this.addActionButton( 'button_field_' + (!this.reverted ? '2' : '1'), _('Field 2'), (evt)=>this.onAreaClick(evt));
                        dojo.addClass('button_field_1','disabled');
                        dojo.addClass('button_field_2','disabled');
                        this.addActionButton( 'button_discard', _('Discard'), (evt)=>this.onAreaClick(evt));
                        dojo.addClass('button_discard','disabled');
                        break;
                    case 'claimCards':
                        this.addActionButton( 'claim_button', _('Claim'), ()=>this.onConfirmClaim(args.mandalaId));
                        dojo.addClass('claim_button','disabled');
                        break;
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        /* @Override */
        updatePlayerOrdering() {
            this.inherited(arguments);

            // Decks panel
            var target = window.innerWidth >= 994 ? 'mdl_decks_area' : 'player_boards';
            dojo.place(this.format_block('jstpl_decks_panel', {
                deckLabel: _('Deck'),
                discardLabel: _('Discarded')
            }), target);
            if (target == "mdl_decks_area") {
                dojo.removeClass('mdl_decks_panel','player-board');
            } else {
                dojo.addClass('mdl_decks_panel','player-board');
            }

            // Showing a facedown card in the deck
            dojo.place(this.format_block('jstpl_card', {
                id: 'deck',
                showColor: 'facedown',
                color: 'facedown',
                extraClasses: ''
            }), 'mdl_draw_deck');
            this.deckCounter = [];
            this.deckCounter = new ebg.counter();
            this.deckCounter.create("mdl_deck_nbr");
            this.deckCounter.setValue(this.gamedatas.deck_nbr);
            // Extreme case of deck exhausted and not refilled
            if (this.gamedatas.deck_nbr == 0) {
                dojo.addClass('mdl_card_deck','hidden');
            }
            // Creating the discard pile
            if (this.gamedatas.discard != null) {
                this.createCardInTarget(this.gamedatas.discard,'mdl_discard_deck');
            }

            this.discardPileCounter = [];
            this.discardPileCounter = new ebg.counter();
            this.discardPileCounter.create("mdl_discard_nbr");
            this.discardPileCounter.setValue(this.gamedatas.discard_count);

            // Help panel -> Now using Thoun's bga-help
            // if (!this.isSoloMode()) {
            //     dojo.place(this.format_block('jstpl_help_panel', {
            //         themeUrl: g_gamethemeurl,
            //         altText: _('Mandala action overview card'),
            //         helpText: _('Hover here for help')
            //     }), 'player_boards');
            //     let htmlTooltip = this.format_block('jstpl_help_tooltip', {});
            //     this.addTooltipHtml('mdl_help_panel', htmlTooltip);
            //     // Easier for mobile users to allow clicking
            //     dojo.query('#mdl_help_panel').connect('onclick', this, () => { this.tooltips["mdl_help_panel"].open("mdl_help_panel");});
            // }
        },

        /** Override this function to inject html into log items. This is a built-in BGA method.  */
        /* @Override */
        format_string_recursive : function format_string_recursive(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    // list of special keys we want to replace with images
                    var keys = ['mdlCardsIcons','mdlCardsIconsArray'];

                    for ( var i in keys) {
                        var key = keys[i];
                        if (key in args) {
                            args[key] = this.getLogTokenDiv(key, args);
                        }
                    }
                }
            } catch (e) {
                console.error(log,args,"Exception thrown", e.stack);
            }
            return this.inherited({callee: format_string_recursive}, arguments);
        },
        getLogTokenDiv: function(key, args) {
            var tokenId = args[key];
            var logDiv = '';
            if (key.startsWith("mdlCardsIcons")) {
                var logDiv = '<div class="mdl_cards_log">';
                if (key == "mdlCardsIcons") {
                    for (let i=0;i<args.nbr;i++) {
                        logDiv +=  this.format_block('jstpl_card', {
                            id: 'log',
                            showColor: tokenId,
                            color: tokenId,
                            extraClasses: ' mdl_small'
                        });
                    }
                } else if (key == "mdlCardsIconsArray") {
                    for (let i=0;i<tokenId.length;i++) {
                        logDiv +=  this.format_block('jstpl_card', {
                            id: 'log',
                            showColor: tokenId[i],
                            color: tokenId[i],
                            extraClasses: ' mdl_small'
                        });
                    }
                }
                logDiv += '</div>';
            }

            return logDiv;
        },

        initPlayerFields: function(playerId) {
            this.fields['field_1'][playerId] = new ebg.stock();
            this.fields['field_2'][playerId] = new ebg.stock();
            for(var field in this.fields) {
                this.fields[field][playerId].create( this, $('mdl_' + field + '_' + playerId), this.spriteCardSize, this.spriteCardSize );
                this.fields[field][playerId].image_items_per_row = 8;
                this.fields[field][playerId].setSelectionMode(0);
                this.fields[field][playerId].onItemCreate = dojo.hitch(this,'setSelectedStock');
                this.fields[field][playerId].use_vertical_overlap_as_offset = false;
                this.fields[field][playerId].vertical_overlap = 75; // overlap    
                this.fields[field][playerId].resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
            }
        },
        setupPlayerBoard: function(playerData,playerId) {
            var player = playerId != this.masterYoga.id ? playerData : this.masterYoga;
            // Adding player name to the cup (useful for spectators)
            $('mdl_' + playerId + '_cup_name').textContent = player.name;
            $('mdl_' + playerId + '_cup_name').style.color = '#' + player.color;

            // Player fields
            Object.values(playerData.field_1).forEach((elem) => {
                this.fields['field_1'][playerId].addToStockWithId(elem.type_arg,elem.id);
            });
            this.fields['field_1'][playerId].horizontal_overlap = this.getOverlap(this.fields['field_1'][playerId]);
            Object.values(playerData.field_2).forEach((elem) => {
                this.fields['field_2'][playerId].addToStockWithId(elem.type_arg,elem.id);
            });
            this.fields['field_2'][playerId].horizontal_overlap = this.getOverlap(this.fields['field_2'][playerId]);

            // Player river
            for (let i=1;i<=6;i++) {
                Object.values(playerData["river_"+i]).forEach((elem) => {
                    this.createCardInTarget(elem,'mdl_river_' + i + '_' + playerId);
                });
            }

            // Player cup
            if (playerId == this.player_id) {
                var pos = 0;
                Object.values(playerData.cup).forEach((elem) => {
                    this.createCardInTarget(elem,'mdl_cup_' + this.player_id,true);
                });
                this.createCupTooltip();
            } else {
                for (let i=0;i<playerData.cardsInCup;i++) {
                    dojo.place(this.format_block('jstpl_card', {
                        id: playerId + '_' + i,
                        showColor: 'facedown',
                        color: 'facedown',
                        extraClasses: ''
                    }), 'mdl_cup_' + playerId);
                }
            }

            // Showing current card number in player boards
            if (playerId != this.masterYoga.id) {
                var target = dojo.query('#overall_player_board_' + playerId + ' .player_panel_content')[0];
                dojo.place(this.format_block('jstpl_player_panel', {
                    id: playerId
                }), target);
                if (this.player_id == playerId) {
                    dojo.place(this.format_block('jstpl_player_panel_cup', {
                        cupTitle: _('Your cup:'),
                        id: playerId
                    }), target);

                    var cupCards = Object.values(playerData.cup);
                    this.cupsColorCounter[playerId] = [];
                    this.colors.forEach((color) => {
                        var colorCards = cupCards.filter((card) => card.type == color);
                        this.cupsColorCounter[playerId][color] = new ebg.counter();
                        this.cupsColorCounter[playerId][color].create("mdl_p"+playerId+"_cup_"+color+"_nbr");
                        this.cupsColorCounter[playerId][color].setValue(colorCards.length);
                    });
                }
                this.handsCounter[playerId] = [];
                this.handsCounter[playerId] = new ebg.counter();
                this.handsCounter[playerId].create("p"+playerId+"_card_nbr");
                this.handsCounter[playerId].setValue(playerData.cardsInHand);

                // this.cupsCounter[playerId] = [];
                // this.cupsCounter[playerId] = new ebg.counter();
                // this.cupsCounter[playerId].create("p"+playerId+"_cup_nbr");
                // this.cupsCounter[playerId].setValue(playerData.cardsInCup);

                this.addTooltip('p'+playerId+'_card_icon',_('Cards in hand'),'');
            }

            this.cupsCounter[playerId] = [];
            this.cupsCounter[playerId] = new ebg.counter();
            this.cupsCounter[playerId].create("p"+playerId+"_cup_nbr");
            this.cupsCounter[playerId].setValue(playerData.cardsInCup);
        },

        placeDecks: function() {
            // Decks panel
            var target = window.innerWidth >= 994 ? 'mdl_decks_area' : 'player_boards';
            dojo.place('mdl_decks_panel', target);
            if (target == "mdl_decks_area") {
                dojo.removeClass('mdl_decks_panel','player-board');
                dojo.style('mdl_decks_panel','width','');
                dojo.style('mdl_decks_panel','height','');
            } else {
                dojo.addClass('mdl_decks_panel','player-board');
            }
        },
        onStockAnimationEnd: function(stock) {
            return new Promise((resolve) => {
                function checkAnimationEnd() {
                    var animationEnd = true;
                    var stockItems = dojo.query("." + stock + ' .stockitem');
                    stockItems.forEach((elem) => {
                        if (elem.offsetTop < 0) {
                            animationEnd = false;
                        }
                    });
                    if (animationEnd) {
                        resolve();
                    } else {
                        setTimeout(checkAnimationEnd, 250);
                    }
                }
            
                checkAnimationEnd();
            });
        },
        onExhaustedAnimationEnd: function() {
            return new Promise((resolve) => {
                function checkAnimationEnd() {
                    var animationEnd = true;
                    if (!dojo.byId('mdl_discard_flip_ph').hasChildNodes()) {
                        resolve();
                    } else {
                        setTimeout(checkAnimationEnd, 250);
                    }
                }
            
                checkAnimationEnd();
            });
        },
        sleep: function (ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        setScale: function() {           
            this.mdlScale = getComputedStyle(document.body).getPropertyValue('--mdlScale');
            this.cardSize = 98 * this.mdlScale;

            this.placeDecks();

            for(var mountain in this.mountains) {
                this.mountains[mountain].resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
            }            
            for( var playerId in this.gamedatas.players ) {
                for(var field in this.fields) {
                    this.fields[field][playerId].resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
                }
            }
            this.playerHand.resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
        },

        getOpponentId: function(playerId) {
            if (!this.isSoloMode()) {
                var playerKeys = Object.keys(this.gamedatas.players);
                return playerKeys[0] == playerId ? playerKeys[1] : playerKeys[0];
            } else {
                return this.masterYoga.id;
            }
        },

        getCandidatesByRuleOfColor(colorType,includeMountain) {
            var candidates = [];
            for (let i of ['_1','_2']) {
                var mountainTypes = Object.keys(this.mountains['mountain' + i].getPresentTypeList());
                var playerFieldTypes = Object.keys(this.fields['field' + i][this.player_id].getPresentTypeList());
                var opponetFieldTypes = Object.keys(this.fields['field' + i][this.getOpponentId(this.player_id)].getPresentTypeList());

                // If the type is in the opponent field, we can't include it anywhere
                if (opponetFieldTypes.includes(colorType)) {
                    ;
                } else if (![...mountainTypes, ...playerFieldTypes, ...opponetFieldTypes].includes(colorType)) {
                    // If the type is not in any of the areas of this mandala, we can put it in all of them
                    candidates.push('field' + i);
                    if (includeMountain) {
                        candidates.push('mountain' + i);
                    }
                // If tye type is present in any of the areas we can only include it in that area
                } else if (includeMountain && mountainTypes.includes(colorType)) {
                    candidates.push('mountain' + i);
                } else if (playerFieldTypes.includes(colorType)) {
                    candidates.push('field' + i);
                }
            }

            return candidates;
        },
        setCandidates: function(candidates) {
            var areaId;
            candidates.forEach((candidate) => {
                if (candidate.includes('discard')) {
                    areaId = "mdl_discard_deck";
                    dojo.removeClass('button_discard','disabled');
                } else if (candidate.includes('mountain')) {
                    areaId = "mdl_" + candidate + "_wrapper";
                    dojo.removeClass('button_' + candidate,'disabled');
                } else if (candidate.includes('field')) {
                    areaId = "mdl_" + candidate + "_" + this.player_id + "_wrapper";
                    dojo.removeClass('button_' + candidate,'disabled');
                }
                this.connect($(areaId),'onclick','onAreaClick');
                dojo.addClass(areaId,'mdl_candidate');
            });
        },
        removeAllCandidates: function() {
            dojo.query('.action-button').forEach((elem) => {
                dojo.addClass(elem.id,'disabled');
            });

            dojo.query('.mdl_candidate').forEach((elem) => {
                this.disconnect(elem,'onclick');
                dojo.removeClass(elem.id,'mdl_candidate');
            });
        },
        cleanPlayer: function() {
            this.removeAllCandidates();
            this.playerHand.setSelectionMode(0);
            this.disconnect(this.playerHand,'onChangeSelection');
        },
        cleanMountain: function(mountainId) {
            this.removeAllCandidates();
            this.disconnect(this.mountains['mountain_'+mountainId], 'onChangeSelection');
            this.mountains['mountain_'+mountainId].getSelectedItems().forEach((elem) => {
                dojo.style('mdl_mountain_' + mountainId + '_item_' + elem.id,'border','');
            });
            dojo.removeClass('mdl_mountain_' + mountainId + '_stock','hidden');
        },
        createCardInTarget: function(card,target,facedown=false,extraClasses='') {
            let type = !facedown ? card.type : 'facedown';
            // We only write the data color in the Cup as those cards will never move from there
            // If we put it in the discard pile there is a small risk of cheating if the deck is exhausted
            dojo.place(this.format_block('jstpl_card', {
                id: card.id,
                showColor: type,
                color: target.slice(0,7) == 'mdl_cup' ? card.type : '',
                extraClasses: extraClasses
            }), target);
        },
        createCupTooltip: function() {
            cupCards = {};
            this.colors.forEach((color) => {
                var colorCards = dojo.query('#mdl_cup_' + this.player_id + ' .mdl_card[data-color="' + color + '"]');
                cupCards[color] = colorCards.length;
            });
            var htmlTooltip = this.format_block("jstpl_cup_tooltip", {
                blackNbr: cupCards.black,
                greenNbr: cupCards.green,
                purpleNbr: cupCards.purple,
                yellowNbr: cupCards.yellow,
                orangeNbr: cupCards.orange,
                redNbr: cupCards.red
            });
            this.addTooltipHtml('mdl_cup_' + this.player_id, htmlTooltip);
            // Easier for mobile users to allow clicking
            dojo.query('#mdl_cup_' + this.player_id).connect('onclick', this, () => { this.tooltips["mdl_cup_" + this.player_id].open("mdl_cup_" + this.player_id);});

        },
        updateCounter: function(pile,nbr,playerId) {
            switch (pile) {
                case 'deck':
                    this.deckCounter.incValue(nbr);
                    if (this.deckCounter.getValue() == 0) {
                        dojo.addClass('mdl_card_deck','hidden');
                    }
                    break;
                case 'discard':
                    this.discardPileCounter.incValue(nbr);
                    break;
                case 'hand':
                    this.handsCounter[playerId].incValue(nbr);
                    break;
                case 'cup':
                    this.cupsCounter[playerId].incValue(nbr);
                    break;
            }
        },
        getOverlap(stockObj) {
            var areaWidth = 375 * this.mdlScale;
            var cardsNbr = stockObj.count(); 
            if (cardsNbr < 5) {
                stockObj.item_margin = 5;
                return 0;
            } else {
                stockObj.item_margin = 0;
                var visiblePx = areaWidth / (cardsNbr - 1);
                var visiblePct = (visiblePx / this.cardSize) * 100;
                return visiblePct;
            }
        },
        setSelectedStock: function( card_div, card_type_id, card_id ) {
            var objIdSplit = card_id.split('_');
            var objId = objIdSplit[1] + '_' + objIdSplit[2];
            switch (objIdSplit[1]) {
                case 'mountain':
                    this.selectedStock = this.mountains[objId];
                    if (this.showBack) {
                        this.showBackForAnimation(card_div,card_type_id,card_id);
                    }
                    break;
                case 'field':
                    this.selectedStock = this.fields[objId][objIdSplit[3]];
                    break;
            }
        },
        showBackForAnimation: function(card_div, card_type_id, card_id) {
            if (dojo.byId('mdl_decks_panel')) {
                dojo.addClass(card_div.id,'mdl_show_back');
            }
        },
        updateStockOverlap: function() {
            this.selectedStock.horizontal_overlap = this.getOverlap(this.selectedStock);
            this.selectedStock.updateDisplay();
        },
        existsUnselectedCardsForSelectedColor() {
            var cardType = this.playerHand.getSelectedItems().map(card => card.type)[0];
            if (this.playerHand.getUnselectedItems().filter((card) => card.type == cardType).length > 0) {
                return true;
            } else {
                return false;
            }
        },
        cleanDiscardPile: function() {
            var discardedCards = dojo.query('#mdl_discard_deck .mdl_card');
            if (discardedCards.length > 0) {
                while (discardedCards.length > 1) {
                    dojo.destroy(discardedCards[0].id);
                    discardedCards.shift();
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Player's action

        onSelectHand: function(controlName,itemId) {
            this.removeAllCandidates();

            var selectedItems = this.playerHand.getSelectedItems();
            // Check if we are selecting more than one card. In that case, all of them must have the same color
            if (selectedItems.length > 1) {
                var selectedCard = this.playerHand.getItemById(itemId);

                selectedItems.forEach((elem) => {
                    if (elem.type != selectedCard.type) {
                        this.playerHand.unselectItem(elem.id);
                    }
                });
            }

            // Selected items may have changed above
            selectedItems = this.playerHand.getSelectedItems();
            if (selectedItems.length > 0) {
                var colorId = selectedItems[0].type;
                var candidates = this.getCandidatesByRuleOfColor(colorId,selectedItems.length == 1);
                // We can always use discard
                candidates.push('discard');

                // If we try to play all the cards in hand we can't play in the field as you must always have at least one card in hand at the end of your turn
                if (selectedItems.length == this.playerHand.count()) {
                    candidates = candidates.filter(elem => !elem.includes('field'));
                }

                this.setCandidates(candidates);
            }
        },
        onAreaClick: function(evt) {
            dojo.stopEvent(evt);

            var areaSplit = evt.currentTarget.id.split("_");
            switch(areaSplit[1]) {
                case 'mountain':
                    if (this.checkAction('buildMountain',true)) {
                        var cardId = this.playerHand.getSelectedItems()[0].id;
                        this.cleanPlayer();
                        this.ajaxcall("/mandala/mandala/buildMountain.html", {
                            lock: true,
                            cardId: cardId,
                            mountainId: areaSplit[2]
                        }, this, function(result) {
                            // this.cleanPlayer();
                        });
                    }
                    break;
                case 'field':
                    if (this.checkAction('growField',true)) {
                        var cardIds = this.playerHand.getSelectedItems().map(card => card.id).join();
                        if (this.existsUnselectedCardsForSelectedColor()) {
                            var message = _('You have more cards of that color that you did not select. Continue?');
                            this.confirmationDialog(message, () => {
                                this.cleanPlayer();
                                this.ajaxcall("/mandala/mandala/growField.html", {
                                    lock: true,
                                    cardIds: cardIds,
                                    fieldId: areaSplit[2]
                                }, this, function(result) {
                                    // this.cleanPlayer();
                                });
                            });
                            return;
                        } else {
                            this.cleanPlayer();
                            this.ajaxcall("/mandala/mandala/growField.html", {
                                lock: true,
                                cardIds: cardIds,
                                fieldId: areaSplit[2]
                            }, this, function(result) {
                                // this.cleanPlayer();
                            });
                        }
                    }
                    break;
                case 'discard':
                    if (this.checkAction('discard',true)) {
                        var cardIds = this.playerHand.getSelectedItems().map(card => card.id).join();
                        this.cleanPlayer();
                        this.ajaxcall("/mandala/mandala/discard.html", {
                            lock: true,
                            cardIds: cardIds
                        }, this, function(result) {
                            // this.cleanPlayer();
                        });
                    }
                    break;
            }
        },
        onClaimCards: function(controlName,itemId) {
            var mountain = controlName.replace('mdl_','');
            var allItems = this.mountains[mountain].getAllItems();
            var selectedCard = this.mountains[mountain].getItemById(itemId);

            // Clean candidate spaces in the River
            dojo.query('.mdl_candidate').forEach((elem) => {
                this.disconnect(elem,'onclick');
                dojo.removeClass(elem.id,'mdl_candidate');
            });

            // If there was already a card selected and it's of a different color, unselect them
            // At the same time, we must select all the elements of the same color
            allItems.forEach((elem) => {
                if (elem.type != selectedCard.type) {
                    this.mountains[mountain].unselectItem(elem.id);
                } else {
                    this.mountains[mountain].selectItem(elem.id);
                }
            });

            var selectedItems = this.mountains[mountain].getSelectedItems();
            if (selectedItems.length > 0) {
                dojo.removeClass('claim_button','disabled');

                var colorId = selectedItems[0].type;
                var mandalaId = mountain.slice(-1);

                // Show the space for the color selected in the river, cup or discard depending on the situation
                if ($('mdl_field_' + mandalaId + '_' + this.player_id).children.length == 1) { // Fields always have a node for the layer to click
                    dojo.addClass('mdl_discard_deck','mdl_candidate');
                    this.connect($('mdl_discard_deck'),'onclick',()=>this.onConfirmClaim(mandalaId));
                } else {
                    for (let i=1;i<=6;i++) {
                        let riverId = 'mdl_river_' + i + '_' + this.player_id;
                        if ($(riverId).children.length == 0) {
                            dojo.addClass(riverId,'mdl_candidate');
                            this.connect($(riverId),'onclick',()=>this.onConfirmClaim(mandalaId));
                            break;
                        } else if (dojo.hasClass($(riverId).firstChild,'mdl_' + this.colors[colorId] + '_card')) {
                            dojo.addClass('mdl_cup_' + this.player_id,'mdl_candidate');
                            this.connect($('mdl_cup_' + this.player_id),'onclick',()=>this.onConfirmClaim(mountain.slice(-1)));
                            break;
                        }
                    }
                }

                var claimMessage = _("will claim ${nbr} ${cardColor} card(s)");
                if (dojo.hasClass('mdl_discard_deck','mdl_candidate')) {
                    claimMessage += _(" - The card(s) you claim will go to the Discard pile as you don't have any card in that Mandala's Field");
                }
                dojo.place(this.format_block('jstpl_claim_message',{
                    you: _('You'),
                    playerColor: this.gamedatas.players[this.player_id].color,
                    claimMessage: dojo.string.substitute(claimMessage, {
                        nbr: selectedItems.length,
                        cardColor: _(this.colors[colorId])
                    })
                }),'pagemaintitletext','only');

            } else {
                dojo.addClass('claim_button','disabled');
            }
        },
        onConfirmClaim: function(mountain) {
            if (this.mountains['mountain_'+mountain].getSelectedItems().length == 0) {
                return;
            }

            if (this.checkAction('claimCards',true)) {
                this.disconnect(dojo.query('.mdl_candidate')[0].id,'onclick');
                this.cleanMountain(mountain);

                this.ajaxcall("/mandala/mandala/claimCards.html", {
                    lock: true,
                    mountainId: mountain,
                    cardIds: this.mountains['mountain_'+mountain].getSelectedItems().map(card => card.id).join()
                }, this, function(result) {});
            }
        },

        ///////////////////////////////////////////////////
        //// Solo mode functions
        isSoloMode: function() {
            return !this.isSpectator && this.gamedatas.playerorder.length == 1;
        },

        initMasterYoga: function() {
            playerId = this.masterYoga.id;
            this.fields['field_1'][playerId] = new ebg.stock();
            this.fields['field_2'][playerId] = new ebg.stock();
            for(var field in this.fields) {
                this.fields[field][playerId].create( this, $('mdl_' + field + '_' + playerId), this.spriteCardSize, this.spriteCardSize );
                this.fields[field][playerId].image_items_per_row = 8;
                this.fields[field][playerId].setSelectionMode(0);
                this.fields[field][playerId].onItemCreate = dojo.hitch(this,'setSelectedStock');
                this.fields[field][playerId].use_vertical_overlap_as_offset = false;
                this.fields[field][playerId].vertical_overlap = 75; // overlap    
                this.fields[field][playerId].resizeItems(this.cardSize,this.cardSize,this.cardSize * 8,this.cardSize);
            }
        },

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:

            In this method, you associate each of your game notifications with your local method to handle it.

            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your mandala.game.php file.

        */
        setupNotifications: function()
        {
            dojo.subscribe('updateCounters',this,"notif_updateCounters");
            dojo.subscribe('pickCards',this,"notif_pickCards");
            dojo.subscribe('buildMountain',this,"notif_buildMountain");
            dojo.subscribe('growField',this,"notif_growField");
            dojo.subscribe('discard',this,"notif_discard");
            dojo.subscribe('cardToRiver',this,"notif_cardToRiver");
            dojo.subscribe('cardsToCup',this,"notif_cardsToCup");
            dojo.subscribe('refillMountain',this,"notif_refillMountain");
            dojo.subscribe('deckExhausted',this,"notif_deckExhausted");
            dojo.subscribe('triggerEnd',this,"notif_triggerEnd");
            dojo.subscribe('finalScore',this,"notif_finalScore");

            dojo.subscribe('masterYogaPlaying',this,"notif_masterYogaPlaying");
        },

        notif_updateCounters: function( notif )
        {
            Object.entries(notif.args.counters).forEach(([pile,value]) => {
                this.updateCounter(pile,value,notif.args.player_id);
            })

        },
        notif_pickCards: function( notif )
        {
            if (notif.args.deckExhausted) {
                this.onExhaustedAnimationEnd().then(() => {
                    // Add new cards to hand
                    notif.args.newCards.forEach((card) => {
                        this.playerHand.addToStockWithId(card.type_arg,card.id,'mdl_draw_deck');
                    });    
                });        
            } else {
                notif.args.newCards.forEach((card) => {
                    this.playerHand.addToStockWithId(card.type_arg,card.id,'mdl_draw_deck');
                });
            }
            // Flip cards
            this.onStockAnimationEnd('mdl_player_hand').then(() => {
                notif.args.newCards.forEach((card) => {
                    var cardDivId = this.playerHand.getItemDivId(card.id);
                    dojo.place(this.format_block('jstpl_flip_hand',{id: card.id}),'mdl_player_hand');
                    dojo.style('mdl_'+card.id+'_flip_ph', 'left', dojo.style(cardDivId,'left') + 'px');
                    dojo.style('mdl_'+card.id+'_flip_ph', 'top', dojo.style(cardDivId,'top') + 'px');
                    this.createCardInTarget(card,'mdl_'+card.id+'_flip_ph');
                    dojo.addClass(cardDivId,'hidden');
                    dojo.removeClass(cardDivId,'mdl_show_back');
                    dojo.addClass('mdl_card_'+card.id,'mdl_flip_back'); 
                    dojo.addClass('mdl_'+card.id+'_flip_ph','mdl_flipped'); 
                });

                // Give time for the flip animation
                this.sleep(500).then(() => {
                    notif.args.newCards.forEach((card) => {
                        dojo.destroy('mdl_'+card.id+'_flip_ph');
                        dojo.removeClass(this.playerHand.getItemDivId(card.id),'hidden');
                    });
                    this.playerHand.updateDisplay();
                });       
            });
        },
        notif_buildMountain: function( notif )
        {
            var cardPlayed = notif.args.cardPlayed;
            var playerId = notif.args.player_id;

            if (this.player_id == playerId) {
                var animateCard = this.playerHand.getItemById(cardPlayed.id);
                // Animate card built
                this.mountains[notif.args.mountain].addToStockWithId(animateCard.type,animateCard.id,this.playerHand.getItemDivId(animateCard.id));
                this.playerHand.removeFromStockById(animateCard.id);
            } else {
                // If it's the opponent who played we need to create the card to show it
                var origin = playerId != this.masterYoga.id ? 'overall_player_board_' + playerId : 'mdl_draw_deck';
                this.mountains[notif.args.mountain].addToStockWithId(cardPlayed.type_arg,cardPlayed.id,origin);
            }
            if (this.isSoloMode()) {
                var objectWeight = { [cardPlayed.type_arg]: cardPlayed.location_arg };
                this.mountains[notif.args.mountain].changeItemsWeight(objectWeight);
            }
            this.updateStockOverlap();
            if (playerId != this.masterYoga.id) {
                this.updateCounter('hand',-1,playerId);
            }
        },

        notif_growField: function( notif )
        {
            var cardsPlayed = notif.args.cardsPlayed;
            var playerId = notif.args.player_id;

            if (this.player_id == playerId) {
                cardsPlayed.forEach((card) => {
                    var animateCard = this.playerHand.getItemById(card.id);
                    // Animate card grown
                    this.fields[notif.args.field][playerId].addToStockWithId(animateCard.type,animateCard.id,this.playerHand.getItemDivId(animateCard.id));
                    this.playerHand.removeFromStockById(animateCard.id);
                });
            } else {
                var origin = playerId != this.masterYoga.id ? 'overall_player_board_' + playerId : 'mdl_draw_deck';
                cardsPlayed.forEach((card) => {
                    // If it's the opponent who played we need to create the card to show it
                    this.fields[notif.args.field][playerId].addToStockWithId(card.type_arg,card.id,origin);
                })
            }
            this.updateStockOverlap();
            if (playerId != this.masterYoga.id) {
                this.updateCounter('hand',-notif.args.nbr,playerId);
            }
        },

        notif_discard: function( notif )
        {
            var fromStock;
            var fromArea = notif.args.from;
            var cardsToDiscard = notif.args.cardsToDiscard;
            var playerId = notif.args.player_id;

            switch(fromArea) {
                case 'hand':
                    fromStock = this.playerHand;
                    break;
                case 'mountain_1':
                case 'mountain_2':
                    fromStock = this.mountains[fromArea];
                    break;
                case 'field_1':
                case 'field_2':
                    fromStock = this.fields[fromArea][notif.args.player_id]
                    break;
            }

            if (fromArea != 'hand' || this.player_id == playerId) {
                cardsToDiscard.forEach((card) => {
                    var animateCard = fromStock.getItemById(card.id);
                    // Animate discard
                    this.attachToNewParent(fromStock.getItemDivId(animateCard.id),'mdl_discard_deck');
                    var anim = this.slideToObjectPos(fromStock.getItemDivId(animateCard.id),'mdl_discard_deck',0,0);
                    anim.onEnd = () => {
                        this.createCardInTarget(card,'mdl_discard_deck');
                        fromStock.removeFromStockById(animateCard.id);
                        // To avoid showing the cards as it's not allowed to peek
                        this.cleanDiscardPile();
                    }
                    anim.play();

                });
            // In this case the card doesn't exist in the stock and we need to create it (the other player is discarding from hand)
            } else {
                cardsToDiscard.forEach((card) => {
                    // If it's the opponent who played we need to create the card to show it
                    var target = playerId != this.masterYoga.id ? 'overall_player_board_' + playerId : 'mdl_draw_deck';
                    this.createCardInTarget(card,target);
                    this.attachToNewParent('mdl_card_' + card.id,'mdl_discard_deck');
                    this.slideToObjectPos('mdl_card_' + card.id,'mdl_discard_deck',0,0).play();
                    // To avoid showing the cards as it's not allowed to peek
                    this.cleanDiscardPile();
                })
            }

            this.updateCounter('discard',cardsToDiscard.length);
        },

        notif_cardToRiver: function( notif )
        {
            var card = notif.args.riverCard;
            var playerId = notif.args.player_id;
            var animateCard = this.mountains[notif.args.mountain].getItemById(card.id);
            // Animate move to river
            this.attachToNewParent(this.mountains[notif.args.mountain].getItemDivId(animateCard.id),'mdl_' + notif.args.riverSpace + '_' + playerId);
            var anim = this.slideToObjectPos(this.mountains[notif.args.mountain].getItemDivId(animateCard.id),'mdl_' + notif.args.riverSpace + '_' + playerId,0,0);
            anim.onEnd = () => {
                this.createCardInTarget(card,'mdl_' + notif.args.riverSpace + '_' + playerId);
                this.mountains[notif.args.mountain].removeFromStockById(animateCard.id);
                this.selectedStock = this.mountains[notif.args.mountain];
                this.updateStockOverlap();
            }
            anim.play();
        },

        notif_cardsToCup: function( notif )
        {
            var cardsToCup = notif.args.cardsToCup;
            var playerId = notif.args.player_id;

            cardsToCup.forEach((card) => {
                var animateCard = this.mountains[notif.args.mountain].getItemById(card.id);
                var cardDivId = this.mountains[notif.args.mountain].getItemDivId(animateCard.id);
                // Animate move to cup
                dojo.place(this.format_block('jstpl_flip_cup',{id: card.id}),'mdl_cup_' + playerId);
                dojo.style('mdl_'+card.id+'_flip_ph', 'left', '');
                dojo.style('mdl_'+card.id+'_flip_ph', 'top', '');
                this.attachToNewParent(cardDivId,'mdl_'+card.id+'_flip_ph');
                dojo.place(cardDivId,'mdl_'+card.id+'_flip_ph','first');
                dojo.addClass(cardDivId,'mdl_flip_front');

                var anim = this.slideToObjectPos(cardDivId,'mdl_cup_' + playerId,0,0);
                anim.onEnd = () => {
                    if (this.player_id == playerId) {
                        this.cupsColorCounter[playerId][card.type].incValue(1);
                    }
                    dojo.addClass('mdl_'+card.id+'_flip_ph','mdl_flipped'); 
                    // Give time for the flip animation
                    this.sleep(500).then(() => {
                        var pos = dojo.query('#mdl_cup_' + playerId + ' .mdl_card').length;
                        if (this.player_id == playerId) {
                            this.createCardInTarget(card,'mdl_cup_' + playerId,true);
                        } else {
                            dojo.place(this.format_block('jstpl_card', {
                                id: playerId + '_' + pos,
                                showColor: 'facedown',
                                color: 'facedown',
                                extraClasses: ''
                            }), 'mdl_cup_' + playerId);                            
                        }
                        this.mountains[notif.args.mountain].removeFromStockById(animateCard.id);
                        if (this.player_id == playerId) {
                            this.createCupTooltip();
                        }
                        this.selectedStock = this.mountains[notif.args.mountain];
                        this.updateStockOverlap();    

                        dojo.destroy('mdl_'+card.id+'_flip_ph');
                    });       
                }
                anim.play();
            });

            this.updateCounter('cup',cardsToCup.length,playerId);
        },

        notif_refillMountain: function( notif )
        {
            // Add new cards to the mountain
            this.showBack = true;
            notif.args.newCards.forEach((card) => {
                this.mountains[notif.args.mountain].addToStockWithId(card.type_arg,card.id,'mdl_draw_deck');
                if (this.isSoloMode()) {
                    var objectWeight = { [card.type_arg]: card.location_arg };
                    this.mountains[notif.args.mountain].changeItemsWeight(objectWeight);
                }
            });
            this.showBack = false;
            
            this.onStockAnimationEnd('mdl_mountain').then(() => {
                notif.args.newCards.forEach((card) => {
                    var cardDivId = this.mountains[notif.args.mountain].getItemDivId(card.id);
                    dojo.place(this.format_block('jstpl_flip_hand',{id: card.id}),'mdl_'+notif.args.mountain);
                    dojo.style('mdl_'+card.id+'_flip_ph', 'left', dojo.style(cardDivId,'left') + 'px');
                    dojo.style('mdl_'+card.id+'_flip_ph', 'top', dojo.style(cardDivId,'top') + 'px');
                    this.createCardInTarget(card,'mdl_'+card.id+'_flip_ph');
                    dojo.addClass(cardDivId,'hidden');
                    dojo.removeClass(cardDivId,'mdl_show_back');
                    dojo.addClass('mdl_card_'+card.id,'mdl_flip_back'); 
                    dojo.addClass('mdl_'+card.id+'_flip_ph','mdl_flipped'); 
                });

                // Give time for the flip animation
                this.sleep(500).then(() => {
                    notif.args.newCards.forEach((card) => {
                        dojo.destroy('mdl_'+card.id+'_flip_ph');
                        dojo.removeClass(this.mountains[notif.args.mountain].getItemDivId(card.id),'hidden');
                    });
                    this.mountains[notif.args.mountain].updateDisplay();
                });       
            });

            this.selectedStock = this.mountains[notif.args.mountain];
            this.updateStockOverlap();
            this.updateCounter('deck',-notif.args.newCards.length);
        },

        notif_deckExhausted: function( notif )
        {
            this.discardPileCounter.setValue(0);
            this.deckCounter.setValue(notif.args.nbr);
            if (this.deckCounter.getValue() == 0) {
                dojo.addClass('mdl_card_deck','hidden');
            }

            this.onStockAnimationEnd('mdl_mandalas').then(() => {
                // Remove all discarded cards except the last one to create the flip effect
                var discardedCards = dojo.query('#mdl_discard_deck .mdl_card');
                if (discardedCards.length > 0) {
                    while (discardedCards.length > 1) {
                        dojo.destroy(discardedCards[0].id);
                        discardedCards.shift();
                    }
                    var topCard = discardedCards[0];
                    dojo.place(this.format_block('jstpl_flip_facedown_back', {}),'mdl_discard_flip_ph');
                    dojo.addClass(topCard,'mdl_flip_front');
                    dojo.place(topCard,'mdl_discard_flip_ph','first');
                    dojo.addClass('mdl_discard_flip_ph','mdl_flip_back');    

                    // Give time for the flip animation
                    this.sleep(500).then(() => {
                        this.attachToNewParent('mdl_discard_flip_ph','mdl_draw_deck');
                        var anim = this.slideToObjectPos('mdl_discard_flip_ph','mdl_draw_deck',0,0);
                        anim.onEnd = () => {
                            dojo.removeClass('mdl_card_deck','hidden');
                            dojo.empty('mdl_discard_flip_ph');
                        }
                        anim.play();    
                    });
                }
            });
        },

        notif_triggerEnd: function( notif )
        {
            this.showMessage(_(this.format_string_recursive(notif.log,notif.args)),'warning');
        },

        notif_finalScore: function( notif )
        {
            for( var playerId in this.gamedatas.players ) {
                this.bga.playerPanels.getScoreCounter(playerId).setValue(notif.args.score[playerId].total);
            }
        },

        notif_masterYogaPlaying: function( notif )
        {
            dojo.query('.mdl_masteryoga_active').forEach((elem) => {
                dojo.removeClass(elem.id,'mdl_masteryoga_active');
            })
            dojo.addClass('mdl_mandala_'+notif.args.nbr,'mdl_masteryoga_active');
        },
   });
});
