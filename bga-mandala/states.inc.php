<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Mandala implementation : © Sergio Cabrera sergiocabrera0904@gmail.com
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 * 
 * states.inc.php
 *
 * Mandala game states description
 *
 */

if (!defined('STATE_END_GAME')) { // ensure this block is only invoked once, since it is included multiple times
    define("STATE_PLAYER_TURN",2);
    define("STATE_CHECK_MANDALAS",3);
    define("STATE_NEXT_TURN",10);
    define("STATE_CLAIM_CARDS",20);
    define("STATE_NEXT_CLAIM",30);
    define("STATE_CHECK_END",40);
    define("STATE_COMPUTE_SCORE",50);

    define("STATE_MASTER_YOGA_TURN",60);
    define("STATE_MASTER_YOGA_CHECK_MANDALA",61);
    define("STATE_MASTER_YOGA_CLAIM_CARDS",62);

    define("STATE_END_GAME", 99);
}

$machinestates = array(
    STATE_PLAYER_TURN => array(
        "name" => "playerTurn",
        "description" => clienttranslate('${actplayer} must take an action'),
        "descriptionmyturn" => clienttranslate('${you} must take an action'),
        "type" => "activeplayer",
        "possibleactions" => array( "buildMountain", "growField", "discard" ),
        "transitions" => array( "checkMandalas" => STATE_CHECK_MANDALAS, "nextTurn" => STATE_NEXT_TURN)
    ),

    STATE_CHECK_MANDALAS => array(
        "name" => "checkMandalas",
        "description" => '',
        "type" => "game",
        "action" => "stCheckMandalas",
        "transitions" => array("nextTurn" => STATE_NEXT_TURN,
                                "claimCards" => STATE_CLAIM_CARDS, "masterYogaClaimCards" => STATE_MASTER_YOGA_CLAIM_CARDS,
                                "checkEndCondition" => STATE_CHECK_END, "computeScore" => STATE_COMPUTE_SCORE)
    ),

    STATE_NEXT_TURN => array(
        "name" => "nextTurn",
        "description" => '',
        "type" => "game",
        "action" => "stNextTurn",
        "updateGameProgression" => true,   
        "transitions" => array("nextPlayer" => STATE_PLAYER_TURN, "masterYoga" => STATE_MASTER_YOGA_TURN)
    ),

    STATE_MASTER_YOGA_TURN => array(
        "name" => "masterYogaTurn",
        "description" => '',
        "type" => "game",
        "action" => "stMasterYogaTurn",
        "updateGameProgression" => true,   
        "transitions" => array("" => STATE_MASTER_YOGA_CHECK_MANDALA)
    ),

    STATE_MASTER_YOGA_CHECK_MANDALA => array(
        "name" => "masterYogaCheckMandala",
        "description" => '',
        "type" => "game",
        "action" => "stMasterYogaCheckMandala",
        "transitions" => array("masterYoga" => STATE_MASTER_YOGA_TURN, "nextPlayer" => STATE_PLAYER_TURN,
                                "masterYogaClaimCards" => STATE_MASTER_YOGA_CLAIM_CARDS, "playerClaimCards" => STATE_CLAIM_CARDS, 
                                "checkEndCondition" => STATE_CHECK_END, "computeScore" => STATE_COMPUTE_SCORE)
    ),

    STATE_MASTER_YOGA_CLAIM_CARDS => array(
        "name" => "masterYogaClaimCards",
        "description" => '',
        "type" => "game",
        "action" => "stMasterYogaClaimCards",
        "transitions" => array("nextClaim" => STATE_NEXT_CLAIM, "checkEndCondition" => STATE_CHECK_END)
    ),

    STATE_CLAIM_CARDS => array(
        "name" => "claimCards",
        "args" => "argClaimCards",
        "description" => clienttranslate('Mandala completed: ${actplayer} must claim cards'),
        "descriptionmyturn" => clienttranslate('Mandala completed: ${you} must claim cards'),
        "type" => "activeplayer",
        "possibleactions" => array( "claimCards" ),
        "transitions" => array("nextClaim" => STATE_NEXT_CLAIM, "checkEndCondition" => STATE_CHECK_END)
    ),

    STATE_NEXT_CLAIM => array(
        "name" => "nextClaim",
        "description" => '',
        "type" => "game",
        "action" => "stNextClaim",
        "updateGameProgression" => true,   
        "transitions" => array("nextPlayer" => STATE_CLAIM_CARDS, "masterYoga" => STATE_MASTER_YOGA_CLAIM_CARDS)
    ),

    STATE_CHECK_END => array(
        "name" => "checkEnd",
        "description" => '',
        "type" => "game",
        "action" => "stCheckEnd",
        "updateGameProgression" => true,   
        "transitions" => array("continue" => STATE_NEXT_TURN, "computeScore" => STATE_COMPUTE_SCORE)
    ),

    STATE_COMPUTE_SCORE => array(
        "name" => "computeScore",
        "description" => '',
        "type" => "game",
        "action" => "stComputeScore",
        "updateGameProgression" => true,   
        "transitions" => array("endGame" => 99)
    ),
);



