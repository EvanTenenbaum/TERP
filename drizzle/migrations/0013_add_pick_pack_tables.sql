-- WS-003: Pick & Pack Module Tables
-- Migration to add order_bags and order_item_bags tables

-- Add pickPackStatus column to orders table
ALTER TABLE orders ADD COLUMN pickPackStatus ENUM('PENDING', 'PICKING', 'PACKED', 'READY') DEFAULT 'PENDING';

-- Create order_bags table
CREATE TABLE IF NOT EXISTS order_bags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  bag_identifier VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE INDEX unique_bag_per_order (order_id, bag_identifier),
  INDEX idx_order_bags_order_id (order_id)
);

-- Create order_item_bags table
CREATE TABLE IF NOT EXISTS order_item_bags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  bag_id INT NOT NULL,
  packed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  packed_by INT,
  FOREIGN KEY (bag_id) REFERENCES order_bags(id) ON DELETE CASCADE,
  FOREIGN KEY (packed_by) REFERENCES users(id),
  UNIQUE INDEX unique_item_bag (order_item_id, bag_id),
  INDEX idx_order_item_bags_bag_id (bag_id)
);
