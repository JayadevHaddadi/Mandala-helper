
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- lordsofscotlandtest implementation : © Jayadev Haddadi
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

DROP TABLE IF EXISTS `card`;
-- Card table for all 98 clan cards in Lords of Scotland
CREATE TABLE IF NOT EXISTS `card` (
  `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clan` VARCHAR(16) NOT NULL,
  `strength` TINYINT NOT NULL DEFAULT 0,
  `location` VARCHAR(16) NOT NULL DEFAULT 'deck',
  `location_arg` BIGINT NOT NULL DEFAULT 0,
  `is_face_up` TINYINT(1) NOT NULL DEFAULT 0,
  `copied_clan` VARCHAR(16) DEFAULT NULL,
  `persisted` TINYINT(1) NOT NULL DEFAULT 0,
  `power_activated` TINYINT(1) NOT NULL DEFAULT 0,
  `rank` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `round_played` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`card_id`),
  INDEX `idx_location` (`location`, `location_arg`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

