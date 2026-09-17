<?php

declare(strict_types=1);

namespace Bga\Games\pushfighttest\States;

use Bga\GameFramework\StateType;
use Bga\Games\pushfighttest\Game;

class NextPlayer extends \Bga\GameFramework\States\GameState
{
    public function __construct(
        protected Game $game,
    ) {
        parent::__construct(
            $game,
            id: 90,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    /**
     * Called when advancing to the next player's turn.
     */
    public function onEnteringState(int $activePlayerId)
    {
        // Give time increment to active player who just finished their turn
        $this->game->giveExtraTime($activePlayerId);

        // Reset turn state
        $this->globals->set('moves_remaining', 2);
        $this->globals->set('turn_phase', 'move');

        $turnCount = (int) $this->globals->get('turn_count', 1) + 1;
        $this->globals->set('turn_count', $turnCount);
        $this->tableStats->inc('turns_number', 1);

        // Switch to next player
        $nextPlayerId = (int) $this->game->activeNextPlayer();

        $anchoredPieceId = (int) $this->globals->get('anchored_piece_id', 0);
        $anchoredPiece = $this->game->getPieceById($anchoredPieceId);

        $nextPlayerName = $this->game->getPlayerNameById($nextPlayerId);

        $this->notify->all('newTurn', clienttranslate('Turn ${turn_count}: It is now ${player_name}\'s turn (2 moves available)'), [
            'player_id' => $nextPlayerId,
            'player_name' => $nextPlayerName,
            'turn_count' => $turnCount,
            'moves_remaining' => 2,
            'turn_phase' => 'move',
            'anchored_piece_id' => $anchoredPieceId,
        ]);

        return PlayerTurn::class;
    }
}