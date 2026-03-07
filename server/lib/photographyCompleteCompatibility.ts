import { logger } from "../_core/logger";
import { getDb } from "../db";

let photographyFlagColumnExists: boolean | undefined;
let photographyFlagColumnPromise: Promise<boolean> | undefined;

async function detectPhotographyFlagColumn(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return true;
  }

  try {
    const [rows] = await db.execute(
      `SELECT 1 AS present
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'batches'
         AND COLUMN_NAME = 'isPhotographyComplete'
       LIMIT 1`
    );

    const hasColumn = Array.isArray(rows) && rows.length > 0;
    if (!hasColumn) {
      logger.info(
        "Legacy batch schema detected; synthesizing isPhotographyComplete from batchStatus"
      );
    }

    return hasColumn;
  } catch (error) {
    logger.warn(
      { error },
      "Failed to inspect batch photography flag column; assuming modern schema"
    );
    return true;
  }
}

export async function hasPhotographyCompleteFlagColumn(): Promise<boolean> {
  if (photographyFlagColumnExists !== undefined) {
    return photographyFlagColumnExists;
  }

  if (photographyFlagColumnPromise) {
    return photographyFlagColumnPromise;
  }

  photographyFlagColumnPromise = detectPhotographyFlagColumn()
    .then(hasColumn => {
      photographyFlagColumnExists = hasColumn;
      photographyFlagColumnPromise = undefined;
      return hasColumn;
    })
    .catch(error => {
      photographyFlagColumnPromise = undefined;
      throw error;
    });

  return photographyFlagColumnPromise;
}
