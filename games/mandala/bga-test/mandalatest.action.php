<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Mandala implementation : © Sergio Cabrera sergiocabrera0904@gmail.com
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * mandala.action.php
 *
 * Mandala main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/mandala/mandala/myAction.html", ...)
 *
 */
  
  
  class action_mandalatest extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "mandalatest_mandalatest";
            self::trace( "Complete reinitialization of board game" );
      }
  	} 

    public function buildMountain() {
        self::setAjaxMode();

        $mountainId = self::getArg("mountainId", AT_posint, true);
        $cardId = self::getArg("cardId", AT_posint, true);
        $this->game->buildMountain($mountainId,$cardId);  

        self::ajaxResponse();
    }

    public function growField() {
        self::setAjaxMode();

        $fieldId = self::getArg("fieldId", AT_posint, true);
        $cardIds = self::getArg( "cardIds", AT_numberlist, true );
        $growCardIds = $cardIds != "" ? explode( ',', $cardIds ) : [];

        $this->game->growField($fieldId,$growCardIds);  

        self::ajaxResponse();
    }

    public function discard() {
        self::setAjaxMode();

        $cardIds = self::getArg( "cardIds", AT_numberlist, true );
        $discardCardIds = $cardIds != "" ? explode( ',', $cardIds ) : [];

        $this->game->discard($discardCardIds);  

        self::ajaxResponse();
    }

    public function claimCards() {
        self::setAjaxMode();

        $mountainId = self::getArg("mountainId", AT_posint, true);
        $cardIds = self::getArg( "cardIds", AT_numberlist, true );
        $claimedCardIds = $cardIds != "" ? explode( ',', $cardIds ) : [];

        $this->game->claimCards($mountainId,$claimedCardIds);  

        self::ajaxResponse();
    }

  }
  

