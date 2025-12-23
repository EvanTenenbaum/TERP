import { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { deployments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * GitHub webhook handler for push events
 */
export async function handleGitHubWebhook(req: Request, res: Response) {
  try {
    console.log("[WEBHOOK] Received webhook request");
    // Get webhook secret from environment
    // Note: GitHub Secrets can't start with "github", so we use WEBHOOK_SECRET
    const webhookSecret = process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get signature from header
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;
    const deliveryId = req.headers["x-github-delivery"] as string;

    // Verify signature
    console.log("[WEBHOOK] Verifying signature");
    const payload = JSON.stringify(req.body);
    if (!verifyGitHubSignature(payload, signature, webhookSecret)) {
      console.error("Invalid GitHub webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    // Only process push events
    if (event !== "push") {
      return res.status(200).json({ message: "Event type not supported" });
    }

    const pushPayload = req.body as GitHubPushPayload;

    // Only process pushes to main branch
    if (pushPayload.ref !== "refs/heads/main") {
      return res.status(200).json({ message: "Not a main branch push" });
    }

    // Only process TERP repository
    if (pushPayload.repository.full_name !== "EvanTenenbaum/TERP") {
      return res.status(200).json({ message: "Not TERP repository" });
    }

    console.log("[WEBHOOK] Passed all validation checks, extracting commit info");
    // Extract commit information
    const { head_commit, pusher } = pushPayload;
    if (!head_commit) {
      return res.status(400).json({ error: "No head commit in payload" });
    }

    // Create deployment record
    console.log("[WEBHOOK] Getting database connection");
    const db = await getDb();
    if (!db) {
      console.error("[WEBHOOK] Database not available");
      return res.status(500).json({ error: "Database not available" });
    }
    console.log("[WEBHOOK] Database connection obtained, inserting deployment");
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
    const insertId = Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0;

    console.log("[WEBHOOK] Deployment record inserted successfully");
    console.log(`Deployment created: ${head_commit.id.substring(0, 7)} by ${pusher.name}`);

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
      console.error({ err: error, msg: "GitHub webhook error" });
    } else {
      console.error({ error, msg: "GitHub webhook error (non-Error)" });
    }
    // Return 500 during development to see errors in GitHub webhook deliveries
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Schedule background polling for DigitalOcean deployment status
 * Uses setTimeout for simple polling - in production, use a job queue
 */
function scheduleDeploymentPolling(commitSha: string, deploymentId: number): void {
  const POLL_INTERVAL_MS = 30000; // 30 seconds
  const MAX_POLLS = 20; // Max 10 minutes of polling
  let pollCount = 0;

  const poll = async () => {
    pollCount++;
    console.log(`[WEBHOOK] Polling deployment status (attempt ${pollCount}/${MAX_POLLS})`);

    try {
      const db = await getDb();
      if (!db) {
        console.error("[WEBHOOK] Database not available for polling");
        return;
      }

      // Check if deployment is already complete (from external monitoring)
      const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.id, deploymentId))
        .limit(1);

      if (!deployment) {
        console.error("[WEBHOOK] Deployment record not found");
        return;
      }

      if (deployment.status === "success" || deployment.status === "failed") {
        console.log(`[WEBHOOK] Deployment ${commitSha.substring(0, 7)} completed with status: ${deployment.status}`);
        return; // Stop polling
      }

      // Continue polling if not at max
      if (pollCount < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        console.warn(`[WEBHOOK] Max polls reached for deployment ${commitSha.substring(0, 7)}`);
        // Mark as unknown status
        await db
          .update(deployments)
          .set({ status: "unknown" })
          .where(eq(deployments.id, deploymentId));
      }
    } catch (error) {
      console.error("[WEBHOOK] Error polling deployment status:", error);
      // Continue polling on error
      if (pollCount < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
  };

  // Start polling after initial delay
  setTimeout(poll, POLL_INTERVAL_MS);
  console.log(`[WEBHOOK] Scheduled deployment polling for ${commitSha.substring(0, 7)}`);
}
