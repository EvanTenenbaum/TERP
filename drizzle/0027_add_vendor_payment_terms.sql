-- Migration: Add payment terms field to vendors table
-- Feature: MF-015 Vendor Payment Terms
-- Date: 2025-11-05

ALTER TABLE `vendors` ADD COLUMN `paymentTerms` varchar(100);
