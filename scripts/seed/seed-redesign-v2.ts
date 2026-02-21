#!/usr/bin/env tsx
import { execSync } from "child_process";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

type CountCheck = {
  label: string;
  query: ReturnType<typeof sql>;
  min: number;
};

function toMySqlDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toMySqlDateTime(value: Date): string {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

function createSupplierTeriCode(vendorId: number): string {
  return `SUPV${String(vendorId).padStart(4, "0")}`;
}

async function ensureVendorSupplierBridge(
  connection: Connection
): Promise<Map<number, number>> {
  const [vendors] = await connection.query<
    Array<{
      id: number;
      name: string;
      contactName: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      notes: string | null;
      paymentTerms: string | null;
    }>
  >(
    `
      SELECT id, name, contactName, contactEmail, contactPhone, notes, paymentTerms
      FROM vendors
      ORDER BY id ASC
    `
  );

  const vendorToClient = new Map<number, number>();
  if (vendors.length === 0) return vendorToClient;

  const [existingProfiles] = await connection.query<
    Array<{ client_id: number; legacy_vendor_id: number | null }>
  >(
    `
      SELECT client_id, legacy_vendor_id
      FROM supplier_profiles
      WHERE legacy_vendor_id IS NOT NULL
    `
  );

  existingProfiles.forEach(profile => {
    if (profile.legacy_vendor_id) {
      vendorToClient.set(Number(profile.legacy_vendor_id), Number(profile.client_id));
    }
  });

  const [sellerClients] = await connection.query<
    Array<{ id: number; name: string; teri_code: string }>
  >(
    `
      SELECT id, name, teri_code
      FROM clients
      WHERE is_seller = 1
    `
  );

  const sellerByName = new Map(
    sellerClients.map(client => [client.name.trim().toLowerCase(), client.id] as const)
  );
  const usedTeriCodes = new Set(
    sellerClients.map(client => client.teri_code.trim().toUpperCase())
  );

  for (const vendor of vendors) {
    let supplierClientId = vendorToClient.get(vendor.id);

    if (!supplierClientId) {
      supplierClientId = sellerByName.get(vendor.name.trim().toLowerCase());
    }

    if (!supplierClientId) {
      const baseCode = createSupplierTeriCode(vendor.id);
      let teriCode = baseCode;
      let suffix = 1;
      while (usedTeriCodes.has(teriCode.toUpperCase())) {
        suffix += 1;
        teriCode = `${baseCode}-${suffix}`;
      }
      usedTeriCodes.add(teriCode.toUpperCase());

      await connection.query(
        `
          INSERT INTO clients
            (teri_code, name, email, phone, is_seller, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, NOW(), NOW())
        `,
        [teriCode, vendor.name, vendor.contactEmail, vendor.contactPhone]
      );

      const [[created]] = await connection.query<Array<{ id: number }>>(
        "SELECT LAST_INSERT_ID() AS id"
      );
      supplierClientId = Number(created.id);
      sellerByName.set(vendor.name.trim().toLowerCase(), supplierClientId);
    }

    const [supplierProfileRows] = await connection.query<
      Array<{ id: number; legacy_vendor_id: number | null }>
    >(
      `
        SELECT id, legacy_vendor_id
        FROM supplier_profiles
        WHERE client_id = ?
        LIMIT 1
      `,
      [supplierClientId]
    );

    if (supplierProfileRows.length === 0) {
      await connection.query(
        `
          INSERT INTO supplier_profiles
            (client_id, contact_name, contact_email, contact_phone, payment_terms, supplier_notes, legacy_vendor_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          supplierClientId,
          vendor.contactName,
          vendor.contactEmail,
          vendor.contactPhone,
          vendor.paymentTerms,
          vendor.notes,
          vendor.id,
        ]
      );
    } else if (supplierProfileRows[0].legacy_vendor_id !== vendor.id) {
      await connection.query(
        `
          UPDATE supplier_profiles
          SET legacy_vendor_id = ?,
              contact_name = COALESCE(contact_name, ?),
              contact_email = COALESCE(contact_email, ?),
              contact_phone = COALESCE(contact_phone, ?),
              payment_terms = COALESCE(payment_terms, ?),
              supplier_notes = COALESCE(supplier_notes, ?),
              updated_at = NOW()
          WHERE id = ?
        `,
        [
          vendor.id,
          vendor.contactName,
          vendor.contactEmail,
          vendor.contactPhone,
          vendor.paymentTerms,
          vendor.notes,
          supplierProfileRows[0].id,
        ]
      );
    }

    vendorToClient.set(vendor.id, supplierClientId);
  }

  await connection.query(
    `
      UPDATE purchaseOrders po
      JOIN supplier_profiles sp ON sp.legacy_vendor_id = po.vendorId
      SET po.supplier_client_id = sp.client_id
      WHERE po.supplier_client_id IS NULL
    `
  );

  await connection.query(
    `
      UPDATE lots l
      JOIN supplier_profiles sp ON sp.legacy_vendor_id = l.vendorId
      SET l.supplier_client_id = sp.client_id
      WHERE l.supplier_client_id IS NULL
    `
  );

  const hasPoItemsSupplierClientId = await columnExists(
    connection,
    "purchaseOrderItems",
    "supplier_client_id"
  );
  if (!hasPoItemsSupplierClientId) {
    throw new Error(
      'Missing required column "purchaseOrderItems.supplier_client_id" for redesign seed. Run migrations before seeding.'
    );
  }

  await connection.query(
    `
      UPDATE purchaseOrderItems poi
      JOIN purchaseOrders po ON po.id = poi.purchaseOrderId
      SET poi.supplier_client_id = po.supplier_client_id
      WHERE poi.supplier_client_id IS NULL
        AND po.supplier_client_id IS NOT NULL
    `
  );

  return vendorToClient;
}

async function ensureProcurementEdgeCases(connection: Connection) {
  const [purchaseOrdersForFlow] = await connection.query<
    Array<{ id: number; purchaseOrderStatus: string }>
  >(
    `
      SELECT id, purchaseOrderStatus
      FROM purchaseOrders
      ORDER BY id ASC
      LIMIT 3
    `
  );

  if (purchaseOrdersForFlow.length >= 3) {
    const [sentPo, receivingPo, receivedPo] = purchaseOrdersForFlow;

    await connection.query(
      "UPDATE purchaseOrders SET purchaseOrderStatus = 'SENT', updatedAt = NOW() WHERE id = ?",
      [sentPo.id]
    );

    await connection.query(
      "UPDATE purchaseOrders SET purchaseOrderStatus = 'RECEIVING', updatedAt = NOW() WHERE id = ?",
      [receivingPo.id]
    );
    await connection.query(
      `
        UPDATE purchaseOrderItems
        SET quantityReceived = ROUND(quantityOrdered * 0.4, 4),
            updatedAt = NOW()
        WHERE purchaseOrderId = ?
      `,
      [receivingPo.id]
    );

    await connection.query(
      "UPDATE purchaseOrders SET purchaseOrderStatus = 'RECEIVED', updatedAt = NOW() WHERE id = ?",
      [receivedPo.id]
    );
    await connection.query(
      `
        UPDATE purchaseOrderItems
        SET quantityReceived = quantityOrdered,
            updatedAt = NOW()
        WHERE purchaseOrderId = ?
      `,
      [receivedPo.id]
    );
  }

  const [[movementCountRow]] = await connection.query<Array<{ count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM inventoryMovements
      WHERE referenceType = 'PO_RECEIPT'
    `
  );
  const poReceiptMovementCount = Number(movementCountRow?.count ?? 0);

  if (poReceiptMovementCount < 4) {
    const [poRows] = await connection.query<Array<{ id: number }>>(
      "SELECT id FROM purchaseOrders ORDER BY id ASC LIMIT 4"
    );
    const [batchRows] = await connection.query<
      Array<{ id: number; onHandQty: number | string }>
    >("SELECT id, onHandQty FROM batches ORDER BY id ASC LIMIT 4");
    const [[userRow]] = await connection.query<Array<{ id: number }>>(
      "SELECT id FROM users ORDER BY id ASC LIMIT 1"
    );
    const hasNotesColumn = await columnExists(
      connection,
      "inventoryMovements",
      "notes"
    );
    const hasReasonColumn = await columnExists(
      connection,
      "inventoryMovements",
      "reason"
    );
    const movementDetailColumn = hasNotesColumn
      ? "notes"
      : hasReasonColumn
        ? "reason"
        : null;

    const usable = Math.min(poRows.length, batchRows.length);
    for (let i = 0; i < usable; i += 1) {
      const batch = batchRows[i];
      const before = Number(batch.onHandQty ?? 0);
      const change = 2 + i;
      if (movementDetailColumn) {
        await connection.query(
          `
            INSERT INTO inventoryMovements
              (batchId, inventoryMovementType, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, ${movementDetailColumn}, performedBy, createdAt)
            VALUES (?, 'INTAKE', ?, ?, ?, 'PO_RECEIPT', ?, 'Seeded PO receipt movement for redesign QA', ?, NOW())
          `,
          [
            batch.id,
            change.toFixed(4),
            before.toFixed(4),
            (before + change).toFixed(4),
            poRows[i].id,
            userRow.id,
          ]
        );
      } else {
        await connection.query(
          `
            INSERT INTO inventoryMovements
              (batchId, inventoryMovementType, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, performedBy, createdAt)
            VALUES (?, 'INTAKE', ?, ?, ?, 'PO_RECEIPT', ?, ?, NOW())
          `,
          [
            batch.id,
            change.toFixed(4),
            before.toFixed(4),
            (before + change).toFixed(4),
            poRows[i].id,
            userRow.id,
          ]
        );
      }
    }
  }
}

async function ensureCriticalRedesignData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for redesign seed backfill.");
  }

  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [[users]] = await connection.query<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM users"
    );
    if (!users || Number(users.count) === 0) {
      throw new Error("Cannot backfill redesign data without at least one user.");
    }

    const vendorToSupplierMap = await ensureVendorSupplierBridge(connection);

    const [[poCountRow]] = await connection.query<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM purchaseOrders"
    );
    const poCount = Number(poCountRow?.count ?? 0);

    if (poCount < 5) {
      const [[userRow]] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM users ORDER BY id ASC LIMIT 1"
      );
      const [vendors] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM vendors ORDER BY id ASC LIMIT 10"
      );
      const [products] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM products ORDER BY id ASC LIMIT 50"
      );

      if (!userRow || vendors.length === 0 || products.length === 0) {
        throw new Error("Missing users/vendors/products for PO backfill.");
      }

      const needed = 5 - poCount;
      const today = new Date();

      for (let i = 0; i < needed; i++) {
        const vendorId = vendors[i % vendors.length].id;
        const supplierClientId = vendorToSupplierMap.get(vendorId) ?? null;
        const productId = products[i % products.length].id;
        const poNumber = `PO-RD-${Date.now()}-${i + 1}`;
        const orderDate = new Date(today);
        orderDate.setDate(orderDate.getDate() - i);
        const expectedDate = new Date(orderDate);
        expectedDate.setDate(expectedDate.getDate() + 3);
        const quantityOrdered = 10 + i * 2;
        const unitCost = 125 + i * 5;
        const totalCost = quantityOrdered * unitCost;

        await connection.query(
          `INSERT INTO purchaseOrders
            (poNumber, vendorId, supplier_client_id, purchaseOrderStatus, orderDate, expectedDeliveryDate, subtotal, tax, shipping, total, paymentTerms, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, 'SENT', ?, ?, ?, 0, 0, ?, 'NET_15', ?, NOW(), NOW())`,
          [
            poNumber,
            vendorId,
            supplierClientId,
            toMySqlDate(orderDate),
            toMySqlDate(expectedDate),
            totalCost.toFixed(2),
            totalCost.toFixed(2),
            userRow.id,
          ]
        );

        const [[poIdRow]] = await connection.query<Array<{ id: number }>>(
          "SELECT LAST_INSERT_ID() AS id"
        );

        await connection.query(
          `INSERT INTO purchaseOrderItems
            (purchaseOrderId, productId, quantityOrdered, quantityReceived, unitCost, totalCost, createdAt, updatedAt)
           VALUES (?, ?, ?, 0, ?, ?, NOW(), NOW())`,
          [
            poIdRow.id,
            productId,
            quantityOrdered.toFixed(4),
            unitCost.toFixed(4),
            totalCost.toFixed(4),
          ]
        );
      }
    }

    const [[poItemCountRow]] = await connection.query<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM purchaseOrderItems"
    );
    const poItemCount = Number(poItemCountRow?.count ?? 0);
    if (poItemCount < 20) {
      const [poRows] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM purchaseOrders ORDER BY id ASC LIMIT 100"
      );
      const [productRows] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM products ORDER BY id ASC LIMIT 100"
      );

      if (poRows.length === 0 || productRows.length === 0) {
        throw new Error("Missing purchase orders/products for PO item backfill.");
      }

      const needed = 20 - poItemCount;
      for (let i = 0; i < needed; i++) {
        const purchaseOrderId = poRows[i % poRows.length].id;
        const productId = productRows[(i + 7) % productRows.length].id;
        const quantityOrdered = 6 + (i % 10);
        const unitCost = 90 + i * 3;
        const totalCost = quantityOrdered * unitCost;

        await connection.query(
          `INSERT INTO purchaseOrderItems
            (purchaseOrderId, productId, quantityOrdered, quantityReceived, unitCost, totalCost, createdAt, updatedAt)
           VALUES (?, ?, ?, 0, ?, ?, NOW(), NOW())`,
          [
            purchaseOrderId,
            productId,
            quantityOrdered.toFixed(4),
            unitCost.toFixed(4),
            totalCost.toFixed(4),
          ]
        );
      }
    }

    const [[movementCountRow]] = await connection.query<Array<{ count: number }>>(
      "SELECT COUNT(*) AS count FROM inventoryMovements"
    );
    const movementCount = Number(movementCountRow?.count ?? 0);

    if (movementCount < 20) {
      const [[userRow]] = await connection.query<Array<{ id: number }>>(
        "SELECT id FROM users ORDER BY id ASC LIMIT 1"
      );
      const [batches] = await connection.query<Array<{ id: number; onHandQty: string | number }>>(
        "SELECT id, onHandQty FROM batches ORDER BY id ASC LIMIT 50"
      );

      if (!userRow || batches.length === 0) {
        throw new Error("Missing users/batches for inventory movement backfill.");
      }

      const movementTypes = ["INTAKE", "ADJUSTMENT", "SAMPLE", "TRANSFER"] as const;
      const needed = 20 - movementCount;
      const now = new Date();
      const hasNotesColumn = await columnExists(
        connection,
        "inventoryMovements",
        "notes"
      );
      const hasReasonColumn = await columnExists(
        connection,
        "inventoryMovements",
        "reason"
      );
      const movementDetailColumn = hasNotesColumn
        ? "notes"
        : hasReasonColumn
          ? "reason"
          : null;

      for (let i = 0; i < needed; i++) {
        const batch = batches[i % batches.length];
        const baseline = Number(batch.onHandQty ?? 0);
        const type = movementTypes[i % movementTypes.length];
        const positive = type === "INTAKE";
        const delta = positive ? 5 + (i % 7) : -1 * (1 + (i % 4));
        const quantityBefore = Math.max(0, baseline - delta);
        const quantityAfter = quantityBefore + delta;
        const createdAt = new Date(now);
        createdAt.setMinutes(createdAt.getMinutes() - i * 3);

        if (movementDetailColumn) {
          await connection.query(
            `INSERT INTO inventoryMovements
              (batchId, inventoryMovementType, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, ${movementDetailColumn}, performedBy, createdAt)
             VALUES (?, ?, ?, ?, ?, 'SEED_REDESIGN', NULL, 'Redesign seed baseline movement', ?, ?)`,
            [
              batch.id,
              type,
              delta.toFixed(4),
              quantityBefore.toFixed(4),
              quantityAfter.toFixed(4),
              userRow.id,
              toMySqlDateTime(createdAt),
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO inventoryMovements
              (batchId, inventoryMovementType, quantityChange, quantityBefore, quantityAfter, referenceType, referenceId, performedBy, createdAt)
             VALUES (?, ?, ?, ?, ?, 'SEED_REDESIGN', NULL, ?, ?)`,
            [
              batch.id,
              type,
              delta.toFixed(4),
              quantityBefore.toFixed(4),
              quantityAfter.toFixed(4),
              userRow.id,
              toMySqlDateTime(createdAt),
            ]
          );
        }
      }
    }

    await connection.query(
      `
        UPDATE invoices i
        LEFT JOIN (
          SELECT invoiceId, COALESCE(SUM(CAST(amount AS DECIMAL(12,2))), 0) AS paid_total
          FROM payments
          WHERE invoiceId IS NOT NULL AND deleted_at IS NULL
          GROUP BY invoiceId
        ) p ON p.invoiceId = i.id
        SET i.amountPaid = COALESCE(p.paid_total, 0),
            i.amountDue = GREATEST(
              0,
              CAST(i.totalAmount AS DECIMAL(12,2)) - COALESCE(p.paid_total, 0)
            ),
            i.updatedAt = NOW()
        WHERE i.deleted_at IS NULL
      `
    );

    await ensureProcurementEdgeCases(connection);
  } finally {
    await connection.end();
  }
}

async function tableExists(
  connection: Connection,
  tableName: string
): Promise<boolean> {
  const [rows] = await connection.query<Array<{ tableExists: number }>>(
    `
      SELECT EXISTS(
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ) AS tableExists
    `,
    [tableName]
  );
  return Number(rows?.[0]?.tableExists ?? 0) === 1;
}

async function columnExists(
  connection: Connection,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const [rows] = await connection.query<Array<{ count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );
  return Number(rows?.[0]?.count ?? 0) > 0;
}

async function assertRedesignSeedSchemaPreconditions(
  databaseUrl: string
): Promise<{ featureFlagsReady: boolean }> {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const requiredCoreTables = [
      "users",
      "clients",
      "vendors",
      "purchaseOrders",
      "purchaseOrderItems",
      "batches",
      "orders",
      "invoices",
      "payments",
      "inventoryMovements",
      "sampleRequests",
      "locations",
    ];

    for (const tableName of requiredCoreTables) {
      const exists = await tableExists(connection, tableName);
      if (!exists) {
        throw new Error(
          `Missing required table "${tableName}" for redesign seed. ` +
            "Run migrations before running pnpm seed:redesign:v2."
        );
      }
    }

    const featureFlagTableNames = [
      "feature_flags",
      "feature_flag_user_overrides",
      "feature_flag_audit_logs",
    ];
    const missingFeatureFlagTables: string[] = [];
    for (const tableName of featureFlagTableNames) {
      const exists = await tableExists(connection, tableName);
      if (!exists) missingFeatureFlagTables.push(tableName);
    }

    const [rolesTableRows] = await connection.query<Array<{ tableExists: number }>>(
      `
        SELECT EXISTS(
          SELECT 1
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'
        ) AS tableExists
      `
    );
    const rolesTableExists = Number(rolesTableRows?.[0]?.tableExists ?? 0) === 1;
    if (rolesTableExists) {
      const roleOverridesExists = await tableExists(
        connection,
        "feature_flag_role_overrides"
      );
      if (!roleOverridesExists) {
        missingFeatureFlagTables.push("feature_flag_role_overrides");
      }
    }

    const hasClientsDeletedAt = await columnExists(connection, "clients", "deleted_at");
    if (!hasClientsDeletedAt) {
      throw new Error(
        'Missing required column "clients.deleted_at" for redesign seed. Run migrations before seeding.'
      );
    }

    if (missingFeatureFlagTables.length > 0) {
      throw new Error(
        `[seed-redesign-v2] Missing required feature-flag tables (${missingFeatureFlagTables.join(", ")}). ` +
          "Run migrations before seeding."
      );
    }

    return { featureFlagsReady: true };
  } finally {
    await connection.end();
  }
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (or TEST_DATABASE_URL) must be set before running redesign seed. Local auto-DDL bootstrap is disabled in remediation mode."
    );
  }
  process.env.DATABASE_URL = databaseUrl;
  process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || databaseUrl;

  if (!verifyOnly) {
    await assertRedesignSeedSchemaPreconditions(databaseUrl);

    console.log("Running comprehensive light seed for redesign testing...");
    execSync("pnpm seed:comprehensive:light", {
      stdio: "inherit",
      env: process.env,
    });
    execSync("pnpm seed:feature-flags", {
      stdio: "inherit",
      env: process.env,
    });
    execSync("pnpm seed:rbac:reconcile", {
      stdio: "inherit",
      env: process.env,
    });
    execSync("pnpm seed:qa-accounts", {
      stdio: "inherit",
      env: process.env,
    });

    await ensureCriticalRedesignData();
  }

  const { closePool, db, testConnection } = await import("../db-sync");

  const connected = await testConnection(3);
  if (!connected) {
    throw new Error("Unable to connect to database for seed verification.");
  }

  const checks: CountCheck[] = [
    { label: "Purchase Orders", query: sql`SELECT COUNT(*) AS count FROM purchaseOrders`, min: 5 },
    { label: "PO Items", query: sql`SELECT COUNT(*) AS count FROM purchaseOrderItems`, min: 20 },
    { label: "Batches", query: sql`SELECT COUNT(*) AS count FROM batches`, min: 20 },
    { label: "Orders", query: sql`SELECT COUNT(*) AS count FROM orders`, min: 20 },
    { label: "Invoices", query: sql`SELECT COUNT(*) AS count FROM invoices`, min: 20 },
    { label: "Payments", query: sql`SELECT COUNT(*) AS count FROM payments`, min: 10 },
    { label: "Inventory Movements", query: sql`SELECT COUNT(*) AS count FROM inventoryMovements`, min: 20 },
    { label: "Sample Requests", query: sql`SELECT COUNT(*) AS count FROM sampleRequests`, min: 5 },
    { label: "Locations", query: sql`SELECT COUNT(*) AS count FROM locations`, min: 3 },
  ];

  const failures: string[] = [];

  console.log("\nVerifying redesign seed coverage...");
  for (const check of checks) {
    const result = await db.execute(check.query);
    const [rows] = result as unknown as [Array<{ count?: number | string }>, unknown];
    const count = Number(rows?.[0]?.count ?? 0);
    const ok = count >= check.min;
    console.log(`- ${check.label}: ${count} (min ${check.min}) ${ok ? "OK" : "LOW"}`);
    if (!ok) {
      failures.push(`${check.label} expected >= ${check.min}, found ${count}`);
    }
  }

  await closePool();

  if (failures.length > 0) {
    throw new Error(`Seed verification failed:\n${failures.join("\n")}`);
  }

  console.log("\nSeed pack complete and verified for redesign v2.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
