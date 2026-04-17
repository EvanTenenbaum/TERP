import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  appendDecision,
  checkpointPm,
  generateContext,
  getPmPaths,
  proposeChange,
  readPmArtifact,
} from "./generate-agent-context.mjs";

function textResult(text, structuredContent) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    structuredContent,
  };
}

function createPmServer(repoRoot) {
  const server = new McpServer(
    {
      name: "terp-pm",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  server.registerTool(
    "pm.read",
    {
      description: "Read a canonical TERP PM artifact from docs/agent-context.",
      inputSchema: z.object({
        artifact: z
          .enum([
            "summary",
            "manifest",
            "state",
            "work",
            "evidence",
            "decisions",
            "clients",
            "health",
            "public-summary",
            "public-state",
            "public-work",
            "public-manifest",
            "public-health",
          ])
          .default("summary"),
      }),
    },
    async ({ artifact }) => {
      const result = readPmArtifact({
        repoRoot,
        artifact,
      });
      return textResult(
        result.raw || JSON.stringify(result.json, null, 2),
        {
          artifact: result.artifact,
          path: result.path,
          json: result.json,
        },
      );
    },
  );

  server.registerTool(
    "pm.appendDecision",
    {
      description: "Append a signed PM decision and regenerate the TERP PM bundle.",
      inputSchema: z.object({
        clientId: z.string(),
        basedOnSha: z.string().optional(),
        summary: z.string(),
        rationale: z.string(),
        linearRefs: z.array(z.string()).optional().default([]),
        visibility: z.enum(["private", "public"]).optional().default("private"),
      }),
    },
    async (input) => {
      const result = await appendDecision({
        repoRoot,
        ...input,
      });
      return textResult(
        `Appended PM decision ${result.decision.id} at ${result.decision.ts}.`,
        {
          decision: result.decision,
          manifestGitSha: result.manifest.git_sha,
          freshness: result.state.freshness.status,
        },
      );
    },
  );

  server.registerTool(
    "pm.proposeChange",
    {
      description: "Write a mediated PM proposal for hosted or read-only surfaces.",
      inputSchema: z.object({
        clientId: z.string(),
        basedOnSha: z.string().optional(),
        summary: z.string(),
        rationale: z.string().optional().default(""),
        linearRefs: z.array(z.string()).optional().default([]),
        visibility: z.enum(["private", "public"]).optional().default("private"),
      }),
    },
    async (input) => {
      const result = await proposeChange({
        repoRoot,
        ...input,
      });
      return textResult(
        `Wrote mediated PM proposal ${result.proposal.id}.`,
        {
          proposal: result.proposal,
          proposalPath: result.proposalPath,
        },
      );
    },
  );

  server.registerTool(
    "pm.checkpoint",
    {
      description: "Refresh the PM bundle and optionally write checkpoint comments back to Linear.",
      inputSchema: z.object({
        clientId: z.string(),
        basedOnSha: z.string().optional(),
        summary: z.string().optional().default("Checkpoint refresh"),
        rationale: z.string().optional().default(""),
        linearRefs: z.array(z.string()).optional().default([]),
        skipLinearWriteback: z.boolean().optional().default(false),
      }),
    },
    async (input) => {
      const result = await checkpointPm({
        repoRoot,
        ...input,
      });
      return textResult(
        `Checkpoint refreshed the PM bundle at ${result.state.generatedAt}.`,
        {
          manifestGitSha: result.manifest.git_sha,
          freshness: result.state.freshness.status,
          linearWriteback: result.linearWriteback,
        },
      );
    },
  );

  return server;
}

async function startStdio(repoRoot) {
  await generateContext({
    repoRoot,
    reason: "pm-mcp-stdio-start",
  });
  const server = createPmServer(repoRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`terp-pm stdio server ready for ${repoRoot}`);
}

function isInitializeRequest(body) {
  return Boolean(body && typeof body === "object" && body.method === "initialize");
}

async function startHttp(repoRoot, host, port) {
  const app = express();
  const transports = new Map();
  const serverFactory = () => createPmServer(repoRoot);

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    const paths = getPmPaths(repoRoot);
    res.sendFile(paths.publicHealthPath);
  });

  app.post("/mcp", async (req, res) => {
    const sessionId = req.header("mcp-session-id");

    try {
      let server;
      let transport;

      if (sessionId && transports.has(sessionId)) {
        ({ server, transport } = transports.get(sessionId));
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        server = serverFactory();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (initializedSessionId) => {
            transports.set(initializedSessionId, { server, transport });
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: initialize first or provide a valid mcp-session-id header.",
        },
        id: null,
      });
    } catch (error) {
      console.error("pm-mcp HTTP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.header("mcp-session-id");
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing mcp-session-id");
      return;
    }

    const { transport } = transports.get(sessionId);
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.header("mcp-session-id");
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing mcp-session-id");
      return;
    }

    const { transport } = transports.get(sessionId);
    await transport.handleRequest(req, res);
  });

  await generateContext({
    repoRoot,
    reason: "pm-mcp-http-start",
  });

  await new Promise((resolve, reject) => {
    const httpServer = app.listen(port, host, (error) => {
      if (error) {
        reject(error);
        return;
      }
      console.error(`terp-pm HTTP server listening on http://${host}:${port}`);
      resolve(httpServer);
    });
  });
}

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: 4319,
    transport: "stdio",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--host") {
      options.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port") {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--transport") {
      options.transport = argv[index + 1];
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));

if (options.transport === "http") {
  await startHttp(options.repoRoot, options.host, options.port);
} else {
  await startStdio(options.repoRoot);
}
