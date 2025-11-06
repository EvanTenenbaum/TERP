# Digital Ocean App Platform Configuration

This directory contains the App Platform configuration for the TERP application.

## Log Forwarding Setup

The app is configured to forward logs to **SolarWinds Observability** via HTTPS for centralized log management and monitoring.

### How It Works

The application uses a custom Pino transport (`server/_core/solarwinds-transport.ts`) that sends logs directly to SolarWinds Observability's HTTPS endpoint. Logs are batched and sent asynchronously to avoid impacting application performance.

### Setup Instructions

The SolarWinds endpoint is already configured in the app spec. You only need to add your API token:

1. **Add SolarWinds Token to Digital Ocean**:
   - Go to https://cloud.digitalocean.com/apps
   - Click on the TERP app
   - Go to Settings → Environment Variables
   - The `SOLARWINDS_ENDPOINT` should already be set to: `https://logs.collector.na-01.cloud.solarwinds.com/v1/logs`
   - Add or update the `SOLARWINDS_TOKEN` variable:
     - **Key**: `SOLARWINDS_TOKEN`
     - **Value**: `JxK4Ga26okFIqKCJuvHPzJjBtkM7tnGNquU3mQDfnVzLqYkXtCeIMHGLXFRY5V9kV65fN2o`
     - **Scope**: All components
     - **Type**: Secret
   - Save and the app will automatically redeploy

2. **View Logs in SolarWinds**:
   - Log into your SolarWinds Observability account
   - Go to the Logs section
   - Logs will appear with the service name `terp-app`
   - You can search, filter, and set up alerts

### Log Format

Logs are sent in JSON format with the following structure:

```json
{
  "timestamp": "2025-11-06T11:30:00.000Z",
  "service": "terp-app",
  "level": "info",
  "msg": "Log message here",
  ...additional fields
}
```

### Troubleshooting

If logs aren't appearing in SolarWinds:

1. Check that `SOLARWINDS_TOKEN` is set correctly in Digital Ocean environment variables
2. Verify the app is running in production mode (`NODE_ENV=production`)
3. Check Digital Ocean runtime logs for any SolarWinds transport errors
4. Verify your SolarWinds token is valid and has log ingestion permissions

### Disabling Log Forwarding

To disable SolarWinds log forwarding:

- Remove the `SOLARWINDS_TOKEN` environment variable from Digital Ocean
- The app will continue to log to stdout (viewable in Digital Ocean Runtime Logs)

## App Spec Reference

The `app.yaml` file defines:

- **Build & Run Commands**: How to build and start the app
- **Environment Variables**: Configuration values including SolarWinds credentials
- **Health Checks**: How DO monitors app health
- **Instance Configuration**: Server size and scaling

For more details, see: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
