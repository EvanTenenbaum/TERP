-- TER-574: Photography Complete Flag Migration (enum to boolean)
--
-- Step 1: Add isPhotographyComplete boolean column
ALTER TABLE `batches` ADD COLUMN `isPhotographyComplete` INT NOT NULL DEFAULT 0;
-- Step 2: Migrate data - set flag for batches currently in PHOTOGRAPHY_COMPLETE status
UPDATE `batches` SET `isPhotographyComplete` = 1 WHERE `batchStatus` = 'PHOTOGRAPHY_COMPLETE';
-- Step 3: Move PHOTOGRAPHY_COMPLETE batches back to LIVE status
UPDATE `batches` SET `batchStatus` = 'LIVE' WHERE `batchStatus` = 'PHOTOGRAPHY_COMPLETE';
-- Step 4: Remove PHOTOGRAPHY_COMPLETE from the enum
ALTER TABLE `batches` MODIFY COLUMN `batchStatus` enum('AWAITING_INTAKE','LIVE','ON_HOLD','QUARANTINED','SOLD_OUT','CLOSED') NOT NULL DEFAULT 'AWAITING_INTAKE';
