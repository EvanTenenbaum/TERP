-- Add idempotency key to credit applications for preventing double-application
-- This addresses the race condition risk in credit application (DI-002)

ALTER TABLE `creditApplications`
  ADD COLUMN `idempotencyKey` VARCHAR(255) DEFAULT NULL;

CREATE UNIQUE INDEX `idx_credit_applications_idempotency`
  ON `creditApplications` (`idempotencyKey`);
