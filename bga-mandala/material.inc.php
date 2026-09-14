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
 * material.inc.php
 *
 * Mandala game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */


 $this->gameCards = array(
    0 => array("color" => RED, "nbr" => 18, "weight" => 0),
    1 => array("color" => ORANGE, "nbr" => 18, "weight" => 1),
    2 => array("color" => GREEN, "nbr" => 18, "weight" => 2),
    3 => array("color" => YELLOW, "nbr" => 18, "weight" => 3),
    4 => array("color" => PURPLE, "nbr" => 18, "weight" => 4),
    5 => array("color" => BLACK, "nbr" => 18, "weight" => 5)
 );

 // To get correct translations for parameters
 $this->colorTranslations = array(
    "red" => clienttranslate("red"),
    "orange" => clienttranslate("orange"),
    "green" => clienttranslate("green"),
    "yellow" => clienttranslate("yellow"),
    "purple" => clienttranslate("purple"),
    "black" => clienttranslate("black")
);
//  $this->pluralColorTranslations = array(
//     "red" => clienttranslate("reds"),
//     "orange" => clienttranslate("oranges"),
//     "green" => clienttranslate("greens"),
//     "yellow" => clienttranslate("yellows"),
//     "purple" => clienttranslate("purples"),
//     "black" => clienttranslate("blacks")
// );
