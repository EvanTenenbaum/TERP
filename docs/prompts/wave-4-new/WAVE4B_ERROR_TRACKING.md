# Agent Prompt: Wave 4B - Error Tracking (Sentry)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing error tracking in TERP using Sentry.

### Your Mission

Set up Sentry integration for production error tracking, add error boundaries, and configure source maps for meaningful stack traces.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md` (search for ST-008)
2. **Active Tasks:** `docs/roadmaps/ACTIVE_TASKS_SECTION.md`
3. **Existing Prompt:** `docs/prompts/ST-008.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feat/sentry-error-tracking
```

### File Ownership

**You have permission to modify/create these files:**

- `client/src/lib/sentry.ts` (new)
- `client/src/components/ErrorBoundary.tsx` (new or modify)
- `server/utils/sentry.ts` (new)
- `server/index.ts` (add Sentry init)
- `vite.config.ts` (source maps)
- `.env.example` (add Sentry DSN)
- `package.json` (add Sentry packages)

---

## 2. Your Task (8-16h)

### ST-008: Implement Error Tracking (Sentry)

**Objectives:**

1. Set up Sentry integration for production error tracking
2. Add error boundaries to React components
3. Configure source maps for meaningful stack traces
4. Test error reporting in staging environment

**Implementation Steps:**

### Step 1: Install Sentry Packages

```bash
pnpm add @sentry/react @sentry/node @sentry/vite-plugin
```

### Step 2: Create Client-Side Sentry Configuration

Create `client/src/lib/sentry.ts`:

```typescript
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1, // 10% of transactions
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}
```

### Step 3: Create Error Boundary Component

Create `client/src/components/ErrorBoundary.tsx`:

```typescript
import * as Sentry from "@sentry/react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">
            We've been notified and are working on a fix.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 4: Create Server-Side Sentry Configuration

Create `server/utils/sentry.ts`:

```typescript
import * as Sentry from "@sentry/node";

export function initServerSentry() {
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export function captureServerError(
  error: Error,
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("Server Error:", error, context);
  }
}
```

### Step 5: Configure Source Maps in Vite

Update `vite.config.ts`:

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
  plugins: [
    // ... existing plugins
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

### Step 6: Update Environment Variables

Add to `.env.example`:

```
# Sentry Error Tracking
VITE_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

### Step 7: Wrap App with Error Boundary

In `client/src/App.tsx` or `client/src/main.tsx`:

```typescript
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSentry } from "./lib/sentry";

initSentry();

function App() {
  return (
    <ErrorBoundary>
      {/* ... existing app content */}
    </ErrorBoundary>
  );
}
```

### Step 8: Add Error Boundaries to Key Components

Wrap these components with ErrorBoundary:

- Dashboard widgets
- Data tables
- Forms
- Charts/visualizations

---

## 3. Deliverables Checklist

- [ ] Sentry SDK installed (`@sentry/react`, `@sentry/node`)
- [ ] `client/src/lib/sentry.ts` configured
- [ ] `server/utils/sentry.ts` configured
- [ ] Error boundaries added to key React components
- [ ] Source maps configured for production builds
- [ ] Environment variables documented in `.env.example`
- [ ] Error reporting tested (throw test error, verify in Sentry dashboard)
- [ ] Documentation of Sentry setup and usage
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors

---

## 4. Testing

### Test Error Capture

Add a temporary test button to verify Sentry is working:

```typescript
<button onClick={() => {
  throw new Error("Test Sentry Error");
}}>
  Test Sentry
</button>
```

### Verify in Sentry Dashboard

1. Trigger the test error
2. Check Sentry dashboard for the error
3. Verify source maps are working (readable stack traces)
4. Remove test button after verification

---

## 5. Completion Protocol

1. **Implement all tasks** on your `feat/sentry-error-tracking` branch
2. **Run `pnpm check`** to ensure no TypeScript errors
3. **Create a Pull Request** to `main`:

```
feat: ST-008 - Implement Sentry error tracking

- Added @sentry/react and @sentry/node packages
- Created client and server Sentry configurations
- Added ErrorBoundary component with fallback UI
- Configured source maps for production builds
- Added environment variable documentation
```

---

## 6. Notes

- **DO NOT commit actual Sentry DSN** - use environment variables
- **Source maps should only be uploaded in CI/CD** - not locally
- **Error boundaries should not break existing functionality** - test thoroughly
- **Consider rate limiting** - Sentry has quotas, use appropriate sample rates

---

Good luck! Error tracking is essential for production reliability.
