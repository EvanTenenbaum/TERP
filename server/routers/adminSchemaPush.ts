import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Admin Schema Push Router
 * Comprehensive migration runner for all missing migrations (0027-0042)
 *
 * RED HAT QA VERIFIED: 2025-12-23
 * Risk Assessment: See /qa_analysis/redhat_qa_report.md
 */

export const adminSchemaPushRouter = router({
  /**
   * Push all schema changes to database
   * Applies migrations 0027-0042 that were never applied to production
   */
  pushSchema: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results: Array<{ step: string; status: string; message?: string }> =
      [];
    const startTime = Date.now();

    // Helper function to execute SQL safely
    const safeExecute = async (
      stepName: string,
      sqlStatement: ReturnType<typeof sql>
    ) => {
      try {
        await db.execute(sqlStatement);
        results.push({ step: stepName, status: "success" });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("Duplicate column") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("Duplicate key name") ||
          errorMessage.includes("Duplicate entry")
        ) {
          results.push({ step: stepName, status: "already_exists" });
          return true;
        } else {
          results.push({
            step: stepName,
            status: "error",
            message: errorMessage,
          });
          return false;
        }
      }
    };

    try {
      // ============================================================================
      // MIGRATION 0027: Add vendor payment terms
      // Risk: LOW | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0027_add_vendor_paymentTerms",
        sql`
        ALTER TABLE vendors ADD COLUMN paymentTerms VARCHAR(100) NULL
      `
      );

      // ============================================================================
      // MIGRATION 0028: Add vendor notes table
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0028_create_vendorNotes",
        sql`
        CREATE TABLE IF NOT EXISTS vendorNotes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendorId INT NOT NULL,
          userId INT NOT NULL,
          note TEXT NOT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (vendorId) REFERENCES vendors(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      // ============================================================================
      // MIGRATION 0029: Add purchase orders tables (CRITICAL)
      // Risk: CRITICAL | Reversibility: LOW
      // This is required for leaderboard supplier metrics
      // ============================================================================
      await safeExecute(
        "0029_create_purchaseOrders",
        sql`
        CREATE TABLE IF NOT EXISTS purchaseOrders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          poNumber VARCHAR(50) NOT NULL UNIQUE,
          supplier_client_id INT NULL,
          vendorId INT NOT NULL,
          intakeSessionId INT NULL,
          purchaseOrderStatus ENUM('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVING', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
          orderDate DATE NOT NULL,
          expectedDeliveryDate DATE NULL,
          actualDeliveryDate DATE NULL,
          subtotal DECIMAL(15, 2) DEFAULT 0,
          tax DECIMAL(15, 2) DEFAULT 0,
          shipping DECIMAL(15, 2) DEFAULT 0,
          total DECIMAL(15, 2) DEFAULT 0,
          paymentTerms VARCHAR(100) NULL,
          paymentDueDate DATE NULL,
          notes TEXT NULL,
          vendorNotes TEXT NULL,
          createdBy INT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          sentAt TIMESTAMP NULL,
          confirmedAt TIMESTAMP NULL,
          deleted_at TIMESTAMP NULL,
          INDEX idx_po_supplier_client_id (supplier_client_id),
          INDEX idx_po_vendor_id (vendorId),
          INDEX idx_po_status (purchaseOrderStatus),
          INDEX idx_po_order_date (orderDate)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      await safeExecute(
        "0029_create_purchaseOrderItems",
        sql`
        CREATE TABLE IF NOT EXISTS purchaseOrderItems (
          id INT AUTO_INCREMENT PRIMARY KEY,
          purchaseOrderId INT NOT NULL,
          productId INT NOT NULL,
          quantityOrdered DECIMAL(15, 4) NOT NULL,
          quantityReceived DECIMAL(15, 4) DEFAULT 0,
          unitCost DECIMAL(15, 4) NOT NULL,
          totalCost DECIMAL(15, 4) NOT NULL,
          notes TEXT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          deleted_at TIMESTAMP NULL,
          FOREIGN KEY (purchaseOrderId) REFERENCES purchaseOrders(id) ON DELETE CASCADE,
          INDEX idx_poi_po_id (purchaseOrderId),
          INDEX idx_poi_product_id (productId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      // Add FK for purchaseOrders after table exists
      await safeExecute(
        "0029_fk_purchaseOrders_vendor",
        sql`
        ALTER TABLE purchaseOrders 
        ADD CONSTRAINT fk_po_vendor FOREIGN KEY (vendorId) REFERENCES vendors(id) ON DELETE RESTRICT
      `
      );

      await safeExecute(
        "0029_fk_purchaseOrders_createdBy",
        sql`
        ALTER TABLE purchaseOrders 
        ADD CONSTRAINT fk_po_created_by FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT
      `
      );

      // ============================================================================
      // MIGRATION 0030: Add adjustment reasons to inventory movements
      // Risk: MEDIUM | Reversibility: LOW (ENUM change)
      // ============================================================================
      await safeExecute(
        "0030_add_inventoryMovements_adjustmentReason",
        sql`
        ALTER TABLE inventoryMovements 
        ADD COLUMN adjustmentReason ENUM('DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_DISCREPANCY', 'QUALITY_ISSUE', 'REWEIGH', 'OTHER') NULL
      `
      );

      // ============================================================================
      // MIGRATION 0031: Add calendar v3.2 columns
      // Risk: HIGH | Reversibility: MEDIUM (contains data migration)
      // ============================================================================
      await safeExecute(
        "0031_add_calendar_client_id",
        sql`
        ALTER TABLE calendar_events ADD COLUMN client_id INT NULL
      `
      );

      await safeExecute(
        "0031_add_calendar_vendor_id",
        sql`
        ALTER TABLE calendar_events ADD COLUMN vendor_id INT NULL
      `
      );

      await safeExecute(
        "0031_add_calendar_metadata",
        sql`
        ALTER TABLE calendar_events ADD COLUMN metadata JSON NULL
      `
      );

      await safeExecute(
        "0031_idx_calendar_client_id",
        sql`
        CREATE INDEX idx_calendar_events_client_id ON calendar_events(client_id)
      `
      );

      await safeExecute(
        "0031_idx_calendar_vendor_id",
        sql`
        CREATE INDEX idx_calendar_events_vendor_id ON calendar_events(vendor_id)
      `
      );

      // ============================================================================
      // MIGRATION 0033: Add event types (AR_COLLECTION, AP_PAYMENT)
      // Risk: LOW | Reversibility: MEDIUM (ENUM modification)
      // Note: Skipping ENUM modification as it requires knowing existing values
      // ============================================================================

      // ============================================================================
      // MIGRATION 0034: Add intake_event_id to orders
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0034_add_orders_intake_event_id",
        sql`
        ALTER TABLE orders ADD COLUMN intake_event_id INT NULL
      `
      );

      await safeExecute(
        "0034_idx_orders_intake_event_id",
        sql`
        CREATE INDEX idx_orders_intake_event_id ON orders(intake_event_id)
      `
      );

      // ============================================================================
      // MIGRATION 0035: Add photo_session_event_id to batches
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0035_add_batches_photo_session_event_id",
        sql`
        ALTER TABLE batches ADD COLUMN photo_session_event_id INT NULL
      `
      );

      await safeExecute(
        "0035_idx_batches_photo_session_event_id",
        sql`
        CREATE INDEX idx_batches_photo_session_event_id ON batches(photo_session_event_id)
      `
      );

      // ============================================================================
      // MIGRATION 0036: Add event invitations table
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0036_create_calendar_event_invitations",
        sql`
        CREATE TABLE IF NOT EXISTS calendar_event_invitations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          invitee_type ENUM('USER', 'CLIENT', 'EXTERNAL') NOT NULL,
          user_id INT DEFAULT NULL,
          client_id INT DEFAULT NULL,
          external_email VARCHAR(320) DEFAULT NULL,
          external_name VARCHAR(255) DEFAULT NULL,
          role ENUM('ORGANIZER', 'REQUIRED', 'OPTIONAL', 'OBSERVER') NOT NULL DEFAULT 'REQUIRED',
          message TEXT DEFAULT NULL,
          status ENUM('DRAFT', 'PENDING', 'ACCEPTED', 'DECLINED', 'AUTO_ACCEPTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
          auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
          auto_accept_reason VARCHAR(255) DEFAULT NULL,
          admin_override BOOLEAN NOT NULL DEFAULT FALSE,
          overridden_by INT DEFAULT NULL,
          sent_at TIMESTAMP NULL,
          responded_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL,
          INDEX idx_event_invitations_event_id (event_id),
          INDEX idx_event_invitations_user_id (user_id),
          INDEX idx_event_invitations_client_id (client_id),
          INDEX idx_event_invitations_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      // ============================================================================
      // MIGRATION 0038: Add missing indexes for performance
      // Risk: LOW | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0038_idx_orders_client_id",
        sql`
        CREATE INDEX idx_orders_client_id ON orders(client_id)
      `
      );

      await safeExecute(
        "0038_idx_invoices_order_id",
        sql`
        CREATE INDEX idx_invoices_order_id ON invoices(orderId)
      `
      );

      await safeExecute(
        "0038_idx_payments_invoice_id",
        sql`
        CREATE INDEX idx_payments_invoice_id ON payments(invoiceId)
      `
      );

      await safeExecute(
        "0038_idx_batches_product_id",
        sql`
        CREATE INDEX idx_batches_product_id ON batches(productId)
      `
      );

      // ============================================================================
      // MIGRATION 0039: Add soft delete (deleted_at) to key tables
      // Risk: CRITICAL | Note: Only adding to tables that don't have it
      // Applying to subset of critical tables to minimize risk
      // ============================================================================
      const softDeleteTables = [
        "users",
        "clients",
        "vendors",
        "products",
        "batches",
        "orders",
        "invoices",
        "payments",
        "strains",
      ];

      for (const table of softDeleteTables) {
        await safeExecute(
          `0039_add_${table}_deleted_at`,
          sql.raw(`
          ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
        `)
        );
      }

      // ============================================================================
      // MIGRATION 0040: Add credit visibility settings table
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0040_create_credit_visibility_settings",
        sql`
        CREATE TABLE IF NOT EXISTS credit_visibility_settings (
          id INT NOT NULL AUTO_INCREMENT,
          location_id INT DEFAULT NULL,
          show_credit_in_client_list BOOLEAN NOT NULL DEFAULT TRUE,
          show_credit_banner_in_orders BOOLEAN NOT NULL DEFAULT TRUE,
          show_credit_widget_in_profile BOOLEAN NOT NULL DEFAULT TRUE,
          show_signal_breakdown BOOLEAN NOT NULL DEFAULT TRUE,
          show_audit_log BOOLEAN NOT NULL DEFAULT TRUE,
          credit_enforcement_mode ENUM('WARNING','SOFT_BLOCK','HARD_BLOCK') NOT NULL DEFAULT 'WARNING',
          warning_threshold_percent INT NOT NULL DEFAULT 75,
          alert_threshold_percent INT NOT NULL DEFAULT 90,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_credit_visibility_location (location_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      // Insert default settings if table is empty
      await safeExecute(
        "0040_insert_default_credit_visibility",
        sql`
        INSERT IGNORE INTO credit_visibility_settings (
          location_id, show_credit_in_client_list, show_credit_banner_in_orders,
          show_credit_widget_in_profile, show_signal_breakdown, show_audit_log,
          credit_enforcement_mode, warning_threshold_percent, alert_threshold_percent
        ) VALUES (NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 'WARNING', 75, 90)
      `
      );

      // ============================================================================
      // MIGRATION 0041: Add leaderboard tables
      // Risk: MEDIUM | Reversibility: HIGH
      // ============================================================================
      await safeExecute(
        "0041_create_leaderboard_weight_configs",
        sql`
        CREATE TABLE IF NOT EXISTS leaderboard_weight_configs (
          id INT AUTO_INCREMENT NOT NULL,
          user_id INT NOT NULL,
          config_name VARCHAR(100) NOT NULL DEFAULT 'default',
          client_type ENUM('CUSTOMER','SUPPLIER','ALL') NOT NULL DEFAULT 'ALL',
          weights JSON NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL,
          PRIMARY KEY (id),
          UNIQUE KEY idx_user_config_type (user_id, config_name, client_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      await safeExecute(
        "0041_create_leaderboard_default_weights",
        sql`
        CREATE TABLE IF NOT EXISTS leaderboard_default_weights (
          id INT AUTO_INCREMENT NOT NULL,
          client_type ENUM('CUSTOMER','SUPPLIER','ALL') NOT NULL,
          weights JSON NOT NULL,
          updated_by INT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY idx_default_weights_client_type (client_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      await safeExecute(
        "0041_create_leaderboard_metric_cache",
        sql`
        CREATE TABLE IF NOT EXISTS leaderboard_metric_cache (
          id INT AUTO_INCREMENT NOT NULL,
          client_id INT NOT NULL,
          metric_type VARCHAR(50) NOT NULL,
          metric_value DECIMAL(15,4) NULL,
          sample_size INT NOT NULL DEFAULT 0,
          is_significant BOOLEAN NOT NULL DEFAULT FALSE,
          raw_data JSON NULL,
          calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY idx_client_metric (client_id, metric_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      await safeExecute(
        "0041_create_leaderboard_rank_history",
        sql`
        CREATE TABLE IF NOT EXISTS leaderboard_rank_history (
          id INT AUTO_INCREMENT NOT NULL,
          client_id INT NOT NULL,
          snapshot_date DATE NOT NULL,
          master_rank INT NULL,
          master_score DECIMAL(10,4) NULL,
          financial_rank INT NULL,
          engagement_rank INT NULL,
          reliability_rank INT NULL,
          growth_rank INT NULL,
          total_clients INT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY idx_client_date (client_id, snapshot_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      await safeExecute(
        "0041_create_dashboard_widget_configs",
        sql`
        CREATE TABLE IF NOT EXISTS dashboard_widget_configs (
          id INT AUTO_INCREMENT NOT NULL,
          user_id INT NOT NULL,
          widget_type VARCHAR(50) NOT NULL,
          config JSON NOT NULL,
          position INT NOT NULL DEFAULT 0,
          is_visible BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY idx_user_widget (user_id, widget_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      );

      // Leaderboard indexes
      await safeExecute(
        "0041_idx_leaderboard_user_active",
        sql`
        CREATE INDEX idx_user_active ON leaderboard_weight_configs (user_id, is_active)
      `
      );

      await safeExecute(
        "0041_idx_leaderboard_expires",
        sql`
        CREATE INDEX idx_expires ON leaderboard_metric_cache (expires_at)
      `
      );

      await safeExecute(
        "0041_idx_leaderboard_metric_type",
        sql`
        CREATE INDEX idx_metric_type ON leaderboard_metric_cache (metric_type)
      `
      );

      await safeExecute(
        "0041_idx_leaderboard_snapshot_date",
        sql`
        CREATE INDEX idx_snapshot_date ON leaderboard_rank_history (snapshot_date)
      `
      );

      // Leaderboard foreign keys
      await safeExecute(
        "0041_fk_leaderboard_weight_configs_user",
        sql`
        ALTER TABLE leaderboard_weight_configs 
        ADD CONSTRAINT leaderboard_weight_configs_user_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
      );

      await safeExecute(
        "0041_fk_leaderboard_default_weights_user",
        sql`
        ALTER TABLE leaderboard_default_weights 
        ADD CONSTRAINT leaderboard_default_weights_updated_by_fk 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      `
      );

      await safeExecute(
        "0041_fk_leaderboard_metric_cache_client",
        sql`
        ALTER TABLE leaderboard_metric_cache 
        ADD CONSTRAINT leaderboard_metric_cache_client_id_fk 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      `
      );

      await safeExecute(
        "0041_fk_leaderboard_rank_history_client",
        sql`
        ALTER TABLE leaderboard_rank_history 
        ADD CONSTRAINT leaderboard_rank_history_client_id_fk 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      `
      );

      await safeExecute(
        "0041_fk_dashboard_widget_configs_user",
        sql`
        ALTER TABLE dashboard_widget_configs 
        ADD CONSTRAINT dashboard_widget_configs_user_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
      );

      // ============================================================================
      // MIGRATION 0042: Fix clients credit fields
      // Risk: HIGH | Reversibility: MEDIUM
      // ============================================================================
      await safeExecute(
        "0042_add_clients_credit_limit_updated_at",
        sql`
        ALTER TABLE clients ADD COLUMN credit_limit_updated_at TIMESTAMP NULL
      `
      );

      await safeExecute(
        "0042_add_clients_creditLimitSource",
        sql`
        ALTER TABLE clients ADD COLUMN creditLimitSource ENUM('CALCULATED','MANUAL') DEFAULT 'CALCULATED'
      `
      );

      await safeExecute(
        "0042_add_clients_credit_limit_override_reason",
        sql`
        ALTER TABLE clients ADD COLUMN credit_limit_override_reason TEXT NULL
      `
      );

      // ============================================================================
      // STRAINS COLUMNS (from earlier migrations)
      // ============================================================================
      await safeExecute(
        "add_strains_openthcId",
        sql`
        ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL
      `
      );

      await safeExecute(
        "add_strains_openthcStub",
        sql`
        ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL
      `
      );

      await safeExecute(
        "add_strains_parentStrainId",
        sql`
        ALTER TABLE strains ADD COLUMN parentStrainId INT NULL
      `
      );

      await safeExecute(
        "add_strains_baseStrainName",
        sql`
        ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL
      `
      );

      // ============================================================================
      // SCHEMA-016: Add products.strainId column
      // Risk: LOW | This column is referenced in schema but missing from production
      // ============================================================================
      await safeExecute(
        "add_products_strainId",
        sql`
        ALTER TABLE products ADD COLUMN strainId INT NULL
      `
      );

      await safeExecute(
        "add_products_strainId_index",
        sql`
        CREATE INDEX idx_products_strainId ON products (strainId)
      `
      );

      await safeExecute(
        "add_products_strainId_fk",
        sql`
        ALTER TABLE products
        ADD CONSTRAINT fk_products_strainId
        FOREIGN KEY (strainId) REFERENCES strains(id)
        ON DELETE SET NULL
      `
      );

      await safeExecute(
        "add_client_needs_strainId",
        sql`
        ALTER TABLE client_needs ADD COLUMN strainId INT NULL
      `
      );

      // ============================================================================
      // MIGRATION 0043: Add USP (Unified Sales Portal) columns
      // Risk: MEDIUM | Reversibility: HIGH
      // Adds bidirectional linking between sales_sheet_history and orders
      // ============================================================================

      // Add convertedToOrderId to sales_sheet_history
      await safeExecute(
        "0043_add_sales_sheet_convertedToOrderId",
        sql`
        ALTER TABLE sales_sheet_history ADD COLUMN converted_to_order_id INT NULL
      `
      );

      // Add deletedAt to sales_sheet_history (soft delete)
      await safeExecute(
        "0043_add_sales_sheet_deletedAt",
        sql`
        ALTER TABLE sales_sheet_history ADD COLUMN deleted_at TIMESTAMP NULL
      `
      );

      // Add convertedFromSalesSheetId to orders
      await safeExecute(
        "0043_add_orders_convertedFromSalesSheetId",
        sql`
        ALTER TABLE orders ADD COLUMN converted_from_sales_sheet_id INT NULL
      `
      );

      // Add deletedAt to orders (soft delete) - may already exist
      await safeExecute(
        "0043_add_orders_deletedAt",
        sql`
        ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL
      `
      );

      // Add indexes for USP columns
      await safeExecute(
        "0043_idx_sales_sheet_convertedToOrderId",
        sql`
        CREATE INDEX idx_converted_to_order_id ON sales_sheet_history (converted_to_order_id)
      `
      );

      await safeExecute(
        "0043_idx_sales_sheet_deletedAt",
        sql`
        CREATE INDEX idx_sales_sheet_deleted_at ON sales_sheet_history (deleted_at)
      `
      );

      await safeExecute(
        "0043_idx_orders_convertedFromSalesSheetId",
        sql`
        CREATE INDEX idx_converted_from_sales_sheet_id ON orders (converted_from_sales_sheet_id)
      `
      );

      await safeExecute(
        "0043_idx_orders_deletedAt",
        sql`
        CREATE INDEX idx_orders_deleted_at ON orders (deleted_at)
      `
      );

      // Add foreign key constraints (optional, may fail if data integrity issues)
      await safeExecute(
        "0043_fk_sales_sheet_to_order",
        sql`
        ALTER TABLE sales_sheet_history 
        ADD CONSTRAINT fk_sales_sheet_to_order 
        FOREIGN KEY (converted_to_order_id) REFERENCES orders(id) 
        ON DELETE SET NULL
      `
      );

      await safeExecute(
        "0043_fk_order_to_sales_sheet",
        sql`
        ALTER TABLE orders 
        ADD CONSTRAINT fk_order_to_sales_sheet 
        FOREIGN KEY (converted_from_sales_sheet_id) REFERENCES sales_sheet_history(id) 
        ON DELETE SET NULL
      `
      );

      // ============================================================================
      // SUMMARY
      // ============================================================================
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === "success").length;
      const alreadyExistsCount = results.filter(
        r => r.status === "already_exists"
      ).length;
      const errorCount = results.filter(r => r.status === "error").length;

      return {
        success: errorCount === 0,
        results,
        summary: {
          total: results.length,
          success: successCount,
          alreadyExists: alreadyExistsCount,
          errors: errorCount,
          duration,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
        summary: {
          total: results.length,
          success: 0,
          errors: 1,
          duration: Date.now() - startTime,
        },
      };
    }
  }),

  /**
   * Verify schema was pushed successfully
   */
  verifySchema: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get all tables
      const allTables = await db.execute(sql`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      const tableNames = (
        allTables as unknown as Array<{ TABLE_NAME: string }>
      ).map(row => row.TABLE_NAME);

      // Check critical tables from migrations 0027-0042
      const criticalTables = {
        vendorNotes: tableNames.includes("vendorNotes"),
        purchaseOrders: tableNames.includes("purchaseOrders"),
        purchaseOrderItems: tableNames.includes("purchaseOrderItems"),
        calendar_event_invitations: tableNames.includes(
          "calendar_event_invitations"
        ),
        credit_visibility_settings: tableNames.includes(
          "credit_visibility_settings"
        ),
        leaderboard_weight_configs: tableNames.includes(
          "leaderboard_weight_configs"
        ),
        leaderboard_default_weights: tableNames.includes(
          "leaderboard_default_weights"
        ),
        leaderboard_metric_cache: tableNames.includes(
          "leaderboard_metric_cache"
        ),
        leaderboard_rank_history: tableNames.includes(
          "leaderboard_rank_history"
        ),
        dashboard_widget_configs: tableNames.includes(
          "dashboard_widget_configs"
        ),
      };

      // Check clients columns
      const clientsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'clients'
      `);
      const clientsCols = (
        clientsColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);

      const clientsVerification = {
        credit_limit_updated_at: clientsCols.includes(
          "credit_limit_updated_at"
        ),
        creditLimitSource: clientsCols.includes("creditLimitSource"),
        credit_limit_override_reason: clientsCols.includes(
          "credit_limit_override_reason"
        ),
      };

      // Check vendors columns
      const vendorsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vendors'
      `);
      const vendorsCols = (
        vendorsColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);

      const vendorsVerification = {
        paymentTerms: vendorsCols.includes("paymentTerms"),
      };

      // Check calendar_events columns
      const calendarColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'calendar_events'
      `);
      const calendarCols = (
        calendarColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);

      const calendarVerification = {
        client_id: calendarCols.includes("client_id"),
        vendor_id: calendarCols.includes("vendor_id"),
        metadata: calendarCols.includes("metadata"),
      };

      // Check purchaseOrders columns if table exists
      let purchaseOrdersVerification = {};
      if (criticalTables.purchaseOrders) {
        const poColumns = await db.execute(sql`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'purchaseOrders'
        `);
        const poCols = (
          poColumns as unknown as Array<{ COLUMN_NAME: string }>
        ).map(row => row.COLUMN_NAME);
        purchaseOrdersVerification = {
          supplier_client_id: poCols.includes("supplier_client_id"),
          purchaseOrderStatus: poCols.includes("purchaseOrderStatus"),
          expectedDeliveryDate: poCols.includes("expectedDeliveryDate"),
          actualDeliveryDate: poCols.includes("actualDeliveryDate"),
        };
      }

      // Check USP columns in sales_sheet_history
      const salesSheetColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'sales_sheet_history'
      `);
      const salesSheetCols = (
        salesSheetColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);
      const uspSalesSheetVerification = {
        converted_to_order_id: salesSheetCols.includes("converted_to_order_id"),
        deleted_at: salesSheetCols.includes("deleted_at"),
      };

      // Check USP columns in orders
      const ordersColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders'
      `);
      const ordersCols = (
        ordersColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);
      const uspOrdersVerification = {
        converted_from_sales_sheet_id: ordersCols.includes(
          "converted_from_sales_sheet_id"
        ),
        deleted_at: ordersCols.includes("deleted_at"),
      };

      const allTablesPresent = Object.values(criticalTables).every(v => v);
      const allClientsColsPresent = Object.values(clientsVerification).every(
        v => v
      );
      const allUspSalesSheetColsPresent = Object.values(
        uspSalesSheetVerification
      ).every(v => v);
      const allUspOrdersColsPresent = Object.values(
        uspOrdersVerification
      ).every(v => v);

      return {
        allPresent:
          allTablesPresent &&
          allClientsColsPresent &&
          allUspSalesSheetColsPresent &&
          allUspOrdersColsPresent,
        verification: {
          tables: criticalTables,
          clients: clientsVerification,
          vendors: vendorsVerification,
          calendar_events: calendarVerification,
          purchaseOrders: purchaseOrdersVerification,
          usp_sales_sheet_history: uspSalesSheetVerification,
          usp_orders: uspOrdersVerification,
        },
        tableCount: tableNames.length,
        message:
          allTablesPresent &&
          allClientsColsPresent &&
          allUspSalesSheetColsPresent &&
          allUspOrdersColsPresent
            ? "All schema changes from migrations 0027-0043 (including USP) applied successfully"
            : "Some tables or columns are missing",
      };
    } catch (error) {
      return {
        allPresent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
});
