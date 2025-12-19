# Deployment Research Findings

## Key Discoveries

### 1. tRPC Bundling Issues (GitHub Issue #1375)
**Source:** https://github.com/trpc/trpc/issues/1375

**Problem:** tRPC has known bundling issues with esbuild:
- Imports to `http` module must be ignored manually
- The `url` module must be installed from npm (Node.js built-in cannot be bundled)
- Importing `router` from `@trpc/server` can inadvertently import the `http` module

**Solution from issue:**
```js
const ignorePlugin = require("esbuild-plugin-ignore");
require("esbuild").build({
    entryPoints: ["src/worker.ts"],
    bundle: true,
    outfile: "dist/worker.js",
    target: "chrome96",
    plugins: [
        ignorePlugin([
            {
                resourceRegExp: /http$/,
                contextRegExp: /.*/,
            },
        ]),
    ],
});
```

**Status:** Issue was superseded by #1597 and closed in 2022

### 2. DigitalOcean Force Rebuild
**Source:** https://docs.digitalocean.com/products/app-platform/how-to/restart-rebuild-app/

**Key Points:**
- **Restart** redeploys exact copy WITHOUT fetching updates from repo
- **Force Rebuild** redeploys WITH latest changes from repo
- Can clear build cache during force rebuild
- API endpoint: `POST https://api.digitalocean.com/v2/apps/{app_id}/deployments`
- CLI command: `doctl apps create-deployment <app_id> --force-rebuild`

**Important:** Force rebuild option has checkbox to "clear the build cache" - this may be critical!

### 3. DigitalOcean + pnpm Issues
**Source:** https://www.digitalocean.com/community/questions/app-platform-build-with-pnpm-command-possible

**Problem:** App Platform doesn't support pnpm out of the box
**Workaround:** Use Dockerfile build instead

**Source:** https://github.com/pnpm/pnpm/issues/9233
**Problem:** pnpm install broke after version 10.6.1
**Evidence:** User reported it worked with pnpm 10.5.2 but failed with newer versions on DigitalOcean

## Analysis

### Root Cause Hypothesis
The deployment failures are likely caused by:

1. **Build cache corruption** - Old cached dependencies preventing new code from building
2. **pnpm version incompatibility** - DigitalOcean may be using a problematic pnpm version
3. **esbuild bundling** - The import path fix may not be enough if esbuild has issues with tRPC

### Recommended Solutions (in order of likelihood)

#### Solution 1: Clear Build Cache
When forcing rebuild, ensure "clear build cache" is checked. This will:
- Remove cached node_modules
- Force fresh dependency installation
- Rebuild from scratch

#### Solution 2: Check Build Logs for Specific Error
The user mentioned "Missing trpc export" error - need to see FULL build logs to understand:
- Is it still the import path issue?
- Is it an esbuild bundling problem?
- Is it a pnpm/npm issue?

#### Solution 3: Add esbuild Plugin for tRPC
If the issue is esbuild bundling, add the ignore plugin:
```js
// In the build script
plugins: [
    {
        name: 'ignore-http',
        setup(build) {
            build.onResolve({ filter: /^http$/ }, () => ({ external: true }))
        }
    }
]
```

#### Solution 4: Use Dockerfile Instead
If App Platform's buildpack continues to fail, switch to Dockerfile deployment which gives more control over the build process.

## Next Steps

1. **Get full build logs** from latest deployment attempt
2. **Try force rebuild with cache clearing** 
3. **Check pnpm version** in build logs
4. **Consider adding esbuild plugin** if bundling is the issue
5. **Switch to Dockerfile** as last resort
