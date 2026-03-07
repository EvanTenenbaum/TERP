-- TER-573: Quote Status Enum Migration
-- Rename DRAFT -> UNSENT, collapse ACCEPTED into CONVERTED
--
-- Step 1: Expand enum to include UNSENT while keeping DRAFT and ACCEPTED
ALTER TABLE `orders` MODIFY COLUMN `quoteStatus` enum('DRAFT','UNSENT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED');
-- Step 2: Migrate DRAFT rows to UNSENT
UPDATE `orders` SET `quoteStatus` = 'UNSENT' WHERE `quoteStatus` = 'DRAFT';
-- Step 3: Migrate ACCEPTED rows to CONVERTED
UPDATE `orders` SET `quoteStatus` = 'CONVERTED' WHERE `quoteStatus` = 'ACCEPTED';
-- Step 4: Shrink enum to final set (remove DRAFT and ACCEPTED)
ALTER TABLE `orders` MODIFY COLUMN `quoteStatus` enum('UNSENT','SENT','VIEWED','REJECTED','EXPIRED','CONVERTED');
