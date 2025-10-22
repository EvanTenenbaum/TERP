DO $$ BEGIN
  CREATE SEQUENCE order_number_seq START 500000 INCREMENT 1;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT CONCAT('ORD-', LPAD(NEXTVAL('order_number_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS "order_orderNumber_key" ON "Order"("orderNumber");
