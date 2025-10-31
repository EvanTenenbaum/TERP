-- Add strainType field to client_needs table
ALTER TABLE `client_needs` ADD COLUMN `strain_type` enum('INDICA','SATIVA','HYBRID','CBD','ANY') AFTER `strainId`;
--> statement-breakpoint

-- Add strainType field to vendor_supply table
ALTER TABLE `vendor_supply` ADD COLUMN `strain_type` enum('INDICA','SATIVA','HYBRID','CBD') AFTER `strain`;
--> statement-breakpoint

-- Add index for strain_type on client_needs for faster matching queries
CREATE INDEX `idx_strain_type_cn` ON `client_needs`(`strain_type`);
--> statement-breakpoint

-- Add index for strain_type on vendor_supply for faster matching queries
CREATE INDEX `idx_strain_type_vs` ON `vendor_supply`(`strain_type`);
