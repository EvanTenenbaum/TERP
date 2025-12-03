# Digital Ocean App Platform Configuration

This directory contains the App Platform configuration for the TERP application.

## Jobs

### Data Augmentation Job

Run data augmentation scripts from stable connection:

```bash
# Get app ID
doctl apps list

# Deploy/update job configuration
doctl apps update <app-id> --spec .do/app-augment-data-job.yaml

# Run the job
doctl apps create-job-run <app-id> augment-data

# Monitor job
doctl apps list-job-runs <app-id> augment-data
doctl apps logs <app-id> --type run --component augment-data
```

See `docs/DATA-002-AUGMENT-RUN-FROM-STABLE-CONNECTION.md` for detailed instructions.

## Log Forwarding Setup

The app is configured to forward logs to **Papertrail** using Digital Ocean's native log forwarding integration.

### Setup Instructions

1. **Get Your Papertrail Endpoint**:
   - Log into your Papertrail account at https://papertrailapp.com/
   - Go to Settings → Log Destinations
   - Click "Create a Log Destination"
   - Select **TLS** (encrypted syslog) - recommended
   - Copy the endpoint (format: `logs.papertrailapp.com:XXXXX`)

2. **Add to Digital Ocean**:
   - Go to https://cloud.digitalocean.com/apps
   - Click on the TERP app
   - Go to Settings → Environment Variables
   - Add or update the `PAPERTRAIL_ENDPOINT` variable:
     - **Key**: `PAPERTRAIL_ENDPOINT`
     - **Value**: Your Papertrail endpoint (e.g., `logs.papertrailapp.com:12345`)
     - **Scope**: All components
     - **Type**: Secret
   - Save and the app will automatically redeploy

3. **View Logs in Papertrail**:
   - Go to your Papertrail dashboard at https://papertrailapp.com/events
   - Logs will start appearing within a few minutes
   - You can search, filter, and set up alerts
   - Logs are retained based on your Papertrail plan

### How It Works

Digital Ocean automatically forwards all application logs (stdout/stderr) to Papertrail using the native `log_destinations` configuration in the app spec. No custom code or configuration needed in the application itself.

### Troubleshooting

If logs aren't appearing in Papertrail:

1. Check that `PAPERTRAIL_ENDPOINT` is set correctly in Digital Ocean environment variables
2. Verify the endpoint format is correct: `logs.papertrailapp.com:PORT` (no `https://`)
3. Check Digital Ocean runtime logs to ensure the app is running
4. Verify your Papertrail account is active and within quota limits

### Disabling Log Forwarding

To disable Papertrail log forwarding:

- Remove the `PAPERTRAIL_ENDPOINT` environment variable from Digital Ocean
- Or remove the `log_destinations` section from `.do/app.yaml`
- The app will continue to log to stdout (viewable in Digital Ocean Runtime Logs)

## App Spec Reference

The `app.yaml` file defines:

- **Build & Run Commands**: How to build and start the app
- **Environment Variables**: Configuration values
- **Health Checks**: How DO monitors app health
- **Log Forwarding**: Where to send application logs (Papertrail)
- **Instance Configuration**: Server size and scaling

For more details, see: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
