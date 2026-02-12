import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Admin Schema Router
 * 
 * Administrative endpoints for schema validation and management.
 */
export const adminSchemaRouter = router({
  /**
   * Run Schema Validation
   * 
   * Validates Drizzle schema against actual database structure.
   * Returns validation report with schema drift issues.
   */
  validate: protectedProcedure.use(requirePermission("system:manage"))
    .query(async () => {
      const { execSync } = await import('child_process');
      
      try {
        // Run validation script and capture output
        const output = execSync('npm run validate:schema', {
          encoding: 'utf-8',
          cwd: process.cwd(),
          timeout: 60000,
        });
        
        // Try to read the generated report
        const fs = await import('fs/promises');
        const path = await import('path');
        
        let report = null;
        try {
          const reportPath = path.join(process.cwd(), 'schema-validation-report.json');
          const reportData = await fs.readFile(reportPath, 'utf-8');
          report = JSON.parse(reportData);
        } catch (_e) {
          // Report file not generated yet
        }
        
        return {
          success: true,
          output,
          report,
          message: 'Schema validation completed. Check logs for details.',
        };
      } catch (error) {
        return {
          success: false,
          output: error instanceof Error ? error.message : 'Unknown error',
          report: null,
          message: 'Schema validation failed. Check output for details.',
        };
      }
    }),
});
