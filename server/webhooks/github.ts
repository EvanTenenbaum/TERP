import { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { deployments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";

interface GitHubPushPayload {
  ref: string;
  before: string;
  after: string;
  repository: {
    full_name: string;
  };
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
  };
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    login: string;
  };
}

function getWebhookPayload(
  req: Request
): { rawPayload: string; parsedPayload: GitHubPushPayload | null } | null {
  if (Buffer.isBuffer(req.body)) {
    const rawPayload = req.body.toString("utf8");
    try {
      return {
        rawPayload,
        parsedPayload: JSON.parse(rawPayload) as GitHubPushPayload,
      };
    } catch {
      return null;
    }
  }

  if (typeof req.body === "string") {
    try {
      return {
        rawPayload: req.body,
        parsedPayload: JSON.parse(req.body) as GitHubPushPayload,
      };
    } catch {
      return null;
    }
  }

  const parsedPayload =
    req.body && typeof req.body === "object"
      ? (req.body as GitHubPushPayload)
      : null;

  return {
    rawPayload: JSON.stringify(parsedPayload ?? {}),
    parsedPayload,
  };
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (signatureBuffer.length !== digestBuffer.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
}

/**
 * GitHub webhook handler for push events
 */
export async function handleGitHubWebhook(req: Request, res: Response) {
  try {
    logger.info("[WEBHOOK] Received webhook request");
    // Get webhook secret from environment
    // Note: GitHub Secrets can't start with "github", so we use WEBHOOK_SECRET
    const webhookSecret =
      process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn(
        "[WEBHOOK] WEBHOOK_SECRET not configured; skipping GitHub webhook processing"
      );
      return res
        .status(202)
        .json({ message: "Webhook ignored; secret not configured" });
    }

    // Get signature from header
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;
    const deliveryId = req.headers["x-github-delivery"] as string;

    const webhookPayload = getWebhookPayload(req);
    if (!webhookPayload) {
      logger.error("[WEBHOOK] Invalid JSON payload");
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    // Verify signature against the raw request body GitHub sent.
    logger.info("[WEBHOOK] Verifying signature");
    if (
      !verifyGitHubSignature(
        webhookPayload.rawPayload,
        signature,
        webhookSecret
      )
    ) {
      logger.error("Invalid GitHub webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    // Only process push events
    if (event !== "push") {
      return res.status(200).json({ message: "Event type not supported" });
    }

    const pushPayload = webhookPayload.parsedPayload;
    if (!pushPayload) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    // Only process pushes to main branch
    if (pushPayload.ref !== "refs/heads/main") {
      return res.status(200).json({ message: "Not a main branch push" });
    }

    // Only process TERP repository
    if (pushPayload.repository.full_name !== "EvanTenenbaum/TERP") {
      return res.status(200).json({ message: "Not TERP repository" });
    }

    logger.info(
      "[WEBHOOK] Passed all validation checks, extracting commit info"
    );
    // Extract commit information
    const { head_commit, pusher } = pushPayload;
    if (!head_commit) {
      return res.status(400).json({ error: "No head commit in payload" });
    }

    // Create deployment record
    logger.info("[WEBHOOK] Getting database connection");
    const db = await getDb();
    if (!db) {
      logger.error("[WEBHOOK] Database not available");
      return res.status(500).json({ error: "Database not available" });
    }
    logger.info("[WEBHOOK] Database connection obtained, inserting deployment");
    const result = await db.insert(deployments).values({
      commitSha: head_commit.id,
      commitMessage: head_commit.message,
      commitTimestamp: new Date(head_commit.timestamp),
      branch: pushPayload.ref.replace("refs/heads/", ""),
      author: head_commit.author.name,
      pusher: pusher.name,
      status: "pending",
      githubDeliveryId: deliveryId,
      webhookPayload: pushPayload,
    });

    // Extract insertId from MySQL result (returns [ResultSetHeader, FieldPacket[]])
    const insertId = Array.isArray(result)
      ? ((result[0] as { insertId?: number })?.insertId ?? 0)
      : 0;

    logger.info("[WEBHOOK] Deployment record inserted successfully");
    logger.info(
      `Deployment created: ${head_commit.id.substring(0, 7)} by ${pusher.name}`
    );

    // Trigger background job to poll DigitalOcean API
    // Schedule polling to start after 30 seconds (give DO time to start the build)
    if (insertId > 0) {
      scheduleDeploymentPolling(head_commit.id, insertId);
    }

    return res.status(200).json({
      message: "Webhook received",
      deploymentId: insertId,
      commitSha: head_commit.id.substring(0, 7),
    });
  } catch (error) {
    // Log error details - Pino requires error as direct property
    if (error instanceof Error) {
      logger.error({ err: error, msg: "GitHub webhook error" });
    } else {
      logger.error({ error, msg: "GitHub webhook error (non-Error)" });
    }
    // Return 500 during development to see errors in GitHub webhook deliveries
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Schedule background polling for DigitalOcean deployment status
 * Uses setTimeout for simple polling - in production, use a job queue
 */
function scheduleDeploymentPolling(
  commitSha: string,
  deploymentId: number
): void {
  const POLL_INTERVAL_MS = 30000; // 30 seconds
  const MAX_POLLS = 20; // Max 10 minutes of polling
  let pollCount = 0;

  const poll = async () => {
    pollCount++;
    logger.info(
      `[WEBHOOK] Polling deployment status (attempt ${pollCount}/${MAX_POLLS})`
    );

    try {
      const db = await getDb();
      if (!db) {
        logger.error("[WEBHOOK] Database not available for polling");
        return;
      }

      // Check if deployment is already complete (from external monitoring)
      const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.id, deploymentId))
        .limit(1);

      if (!deployment) {
        logger.error("[WEBHOOK] Deployment record not found");
        return;
      }

      if (deployment.status === "success" || deployment.status === "failed") {
        logger.info(
          `[WEBHOOK] Deployment ${commitSha.substring(0, 7)} completed with status: ${deployment.status}`
        );
        return; // Stop polling
      }

      // Continue polling if not at max
      if (pollCount < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        logger.warn(
          `[WEBHOOK] Max polls reached for deployment ${commitSha.substring(0, 7)}`
        );
        // Mark as unknown status
        await db
          .update(deployments)
          .set({ status: "unknown" })
          .where(eq(deployments.id, deploymentId));
      }
    } catch (error) {
      logger.error({
        msg: "[WEBHOOK] Error polling deployment status",
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue polling on error
      if (pollCount < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
  };

  // Start polling after initial delay
  setTimeout(poll, POLL_INTERVAL_MS);
  logger.info(
    `[WEBHOOK] Scheduled deployment polling for ${commitSha.substring(0, 7)}`
  );
}
