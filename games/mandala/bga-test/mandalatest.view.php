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
 * mandala.view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in mandala_mandala.tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */
  
require_once( APP_BASE_PATH."view/common/game.view.php" );
  
class view_mandalatest_mandalatest extends game_view
{
    protected function getGameName()
    {
        // Used for translations and stuff. Please do not modify.
        return "mandalatest";
    }
    
  	function build_page( $viewArgs )
  	{
        // Current player
        $currentPlayerId = $this->getCurrentPlayerId(); 

  	    // Get players & players number
        $players = $this->game->loadPlayersBasicInfos();

        // Check if current player is spectator
        if (!$this->game->isSpectator()) {
            // Always place current player at the bottom of the screen and opponent on top
            foreach($players as $playerId => $playerInfo) {
                if ($currentPlayerId == $playerId) {
                    $this->tpl['PLAYER_ID'] = $playerId;
                } else {
                    $this->tpl['OPPONENT_ID'] = $playerId;
                }
            }
            if ($this->game->isSoloMode()) {
                $this->tpl['OPPONENT_ID'] = MASTER_YOGA_ID;
            }
        } else {
            $playerIds = array_keys($players);
            $this->tpl['PLAYER_ID'] = $playerIds[0];
            if (!$this->game->isSoloMode()) {
                $this->tpl['OPPONENT_ID'] = $playerIds[1];
            } else {
                $this->tpl['OPPONENT_ID'] = MASTER_YOGA_ID;
            }
        }

        // "In hand" text for the player panels
        $this->tpl['IN_HAND'] = self::_("Hand");

        /*********** Do not change anything below this line  ************/
  	}
}
