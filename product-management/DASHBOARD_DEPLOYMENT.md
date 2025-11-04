# Dashboard Deployment

## Published Site
**URL**: https://terproadmap.manus.space

## Data Source
The dashboard fetches data from:
```
https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/product-management/pm-evaluation/dashboard.json
```

## How to Update

The dashboard automatically updates when you:
1. Run `python3 _system/scripts/status-tracker.py dashboard`
2. Commit and push changes to GitHub
3. Click "Sync" button on the published site (fetches latest from GitHub)

## Current Data

Last updated: Check `dashboard.json` for `last_updated` timestamp

## Troubleshooting

If dashboard shows old data:
1. Clear browser cache
2. Click Sync button
3. Verify dashboard.json was committed to GitHub
