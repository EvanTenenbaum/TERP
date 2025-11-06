/**
 * SolarWinds Observability HTTP Log Transport
 * Sends application logs to SolarWinds via HTTPS endpoint
 */

import { Transform } from "stream";

interface SolarWindsConfig {
  endpoint: string;
  token: string;
  serviceName?: string;
}

export class SolarWindsTransport extends Transform {
  private endpoint: string;
  private token: string;
  private serviceName: string;
  private buffer: string[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

  constructor(config: SolarWindsConfig) {
    super({ objectMode: true });
    this.endpoint = config.endpoint;
    this.token = config.token;
    this.serviceName = config.serviceName || "terp-app";

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  _transform(
    chunk: unknown,
    _encoding: string,
    callback: (error?: Error | null) => void
  ) {
    try {
      // Parse the log entry
      const log =
        typeof chunk === "string" ? JSON.parse(chunk) : (chunk as object);

      // Format for SolarWinds
      const formattedLog = this.formatLog(log);

      // Add to buffer
      this.buffer.push(formattedLog);

      // Flush if buffer is full
      if (this.buffer.length >= this.BATCH_SIZE) {
        this.flush();
      }

      callback();
    } catch (error) {
      // Don't fail the logging pipeline if SolarWinds is unavailable
      console.error("SolarWinds transport error:", error);
      callback();
    }
  }

  _final(callback: (error?: Error | null) => void) {
    // Flush remaining logs on stream end
    this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    callback();
  }

  private formatLog(log: object): string {
    // Convert Pino log format to SolarWinds format
    const formatted = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...log,
    };
    return JSON.stringify(formatted);
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0, this.buffer.length);
    const payload = logs.join("\n");

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `Bearer ${this.token}`,
          "X-Otel-Resource-Attr": `service.name=${this.serviceName}`,
        },
        body: payload,
      });

      if (!response.ok) {
        console.error(
          `SolarWinds log forwarding failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to send logs to SolarWinds:", error);
      // Don't throw - we don't want to crash the app if logging fails
    }
  }
}

/**
 * Create a Pino transport configuration for SolarWinds
 */
export function createSolarWindsTransport(config: SolarWindsConfig) {
  return {
    target: new URL("./solarwinds-transport.ts", import.meta.url).pathname,
    options: config,
  };
}
