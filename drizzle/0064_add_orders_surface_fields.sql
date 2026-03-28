ALTER TABLE `orders`
ADD COLUMN `shipping` DECIMAL(15, 2) DEFAULT 0 AFTER `discount`,
ADD COLUMN `show_adjustment_on_document` BOOLEAN NOT NULL DEFAULT TRUE AFTER `shipping`;
