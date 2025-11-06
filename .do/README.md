# Digital Ocean App Platform Configuration

This directory contains the App Platform configuration for the TERP application.

## Log Forwarding Setup

The app is configured to forward logs to **Papertrail** for centralized log management.

### Setup Instructions

1. **Create a Papertrail Account** (if you don't have one):
   - Go to https://papertrailapp.com/
   - Sign up for a free account (supports up to 50 MB/month)

2. **Get Your Papertrail Endpoint**:
   - Log into Papertrail
   - Go to Settings → Log Destinations
   - Click "Create a Log Destination"
   - Accept TLS, TCP, or UDP (TLS recommended)
   - Copy the endpoint (format: `logs.papertrailapp.com:XXXXX`)

3. **Configure in Digital Ocean**:
   - Go to https://cloud.digitalocean.com/apps
   - Click on the TERP app
   - Go to Settings → Environment Variables
   - Add a new variable:
     - **Key**: `PAPERTRAIL_ENDPOINT`
     - **Value**: Your Papertrail endpoint (e.g., `logs.papertrailapp.com:12345`)
     - **Scope**: All components
     - **Type**: Secret
   - Save and redeploy

4. **View Logs**:
   - Go to your Papertrail dashboard
   - Logs will start appearing within a few minutes
   - You can search, filter, and set up alerts

## Alternative: Use Digital Ocean's Built-in Logs

If you prefer not to use Papertrail, you can:

1. Remove or comment out the `log_destinations` section in `app.yaml`
2. View logs directly in Digital Ocean:
   - Go to your app → Runtime Logs tab
   - Note: Retention is limited compared to dedicated log services

## App Spec Reference

The `app.yaml` file defines:

- **Build & Run Commands**: How to build and start the app
- **Environment Variables**: Configuration values
- **Health Checks**: How DO monitors app health
- **Log Forwarding**: Where to send application logs
- **Instance Configuration**: Server size and scaling

For more details, see: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
