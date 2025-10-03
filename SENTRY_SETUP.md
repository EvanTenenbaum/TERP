# Sentry Error Tracking - Setup Complete ✅

**Date:** October 3, 2025  
**Status:** Successfully Integrated and Deployed  
**Sentry Organization:** evan-tenenbaum  
**Sentry Project:** terp  
**Production URL:** https://terp.vercel.app

---

## ✅ What Was Configured

### Sentry Configuration Files

**1. Client Configuration** (`sentry.client.config.ts`)
- Captures errors in the browser/client-side
- Enables session replay for debugging
- Configured with 100% error sampling
- 10% session replay sampling (adjustable for production)
- Masks all text and blocks media in replays for privacy

**2. Server Configuration** (`sentry.server.config.ts`)
- Captures errors in Next.js server-side code
- Monitors API routes and server components
- 100% transaction tracing for performance monitoring

**3. Edge Configuration** (`sentry.edge.config.ts`)
- Captures errors in Edge Runtime (middleware, edge functions)
- Optimized for edge computing environments

**4. Instrumentation** (`instrumentation.ts`)
- Automatic error capture via Next.js instrumentation hook
- Captures request context for better debugging
- Loads appropriate Sentry config based on runtime

**5. Next.js Integration** (`next.config.js`)
- Wrapped with `withSentryConfig` for automatic instrumentation
- Source map upload to Sentry for readable stack traces
- React component annotation for better error context
- Monitoring tunnel route (`/monitoring`) to bypass ad-blockers
- Automatic Vercel Cron monitoring integration
- Tree-shaking of Sentry logger statements in production

---

## 🔑 Environment Variables

### SENTRY_DSN (Configured in all environments)

```
https://49d710b0553f85412afab709c676869e@o4510082976251909.ingest.de.sentry.io/4510124065488976
```

**Added to:**
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🎯 Features Enabled

### Error Tracking
- **Automatic error capture** - All unhandled exceptions are sent to Sentry
- **Stack traces** - Source maps uploaded for readable error locations
- **Context capture** - Request URL, user agent, and environment data
- **Error grouping** - Similar errors grouped together automatically

### Performance Monitoring
- **Transaction tracing** - 100% of transactions monitored
- **API route monitoring** - Track response times and errors
- **Database query tracking** - Monitor slow queries (if instrumented)
- **Custom spans** - Can add custom performance measurements

### Session Replay
- **Error reproduction** - Watch user sessions that encountered errors
- **Privacy protection** - All text masked, media blocked
- **10% sampling** - Captures 10% of sessions (100% of error sessions)
- **Network activity** - See API calls made during the session

### Vercel Integration
- **Cron monitoring** - Automatic monitoring of scheduled tasks
- **Deployment tracking** - Link errors to specific deployments
- **Source map upload** - Automatic during Vercel builds
- **Environment detection** - Separate tracking for prod/preview/dev

---

## 📊 Sentry Dashboard

Access your Sentry dashboard at:
**https://sentry.io/organizations/evan-tenenbaum/projects/terp/**

### What You'll See

**Issues Tab:**
- All errors grouped by type
- Frequency and impact metrics
- Stack traces with source code context
- User impact and affected users

**Performance Tab:**
- Transaction duration trends
- Slowest endpoints
- Database query performance
- Custom span measurements

**Replays Tab:**
- Session recordings of errors
- User interaction timeline
- Network request/response data
- Console logs and errors

**Crons Tab:**
- Scheduled task execution status
- Success/failure rates
- Execution duration
- Missed executions alerts

---

## 🧪 Testing Sentry Integration

### Test Error Capture

Add a test error endpoint to verify Sentry is working:

```typescript
// src/app/api/sentry-test/route.ts
export const dynamic = 'force-dynamic';

export async function GET() {
  throw new Error('This is a test error for Sentry!');
}
```

Then visit: `https://terp.vercel.app/api/sentry-test`

You should see the error appear in your Sentry dashboard within seconds.

### Test Client-Side Error

Add a test button to any page:

```typescript
import * as Sentry from "@sentry/nextjs";

function TestButton() {
  const handleClick = () => {
    Sentry.captureException(new Error('Client-side test error'));
  };
  
  return <button onClick={handleClick}>Test Sentry</button>;
}
```

### Manual Error Capture

You can manually capture errors anywhere in your code:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Some risky operation
  await riskyFunction();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'payment-processing',
    },
    extra: {
      orderId: order.id,
      amount: order.total,
    },
  });
  throw error; // Re-throw if needed
}
```

---

## 📈 Advanced Usage

### Custom Performance Tracking

Track specific operations:

```typescript
import * as Sentry from "@sentry/nextjs";

async function processOrder(orderId: string) {
  return Sentry.startSpan(
    {
      op: "order.process",
      name: `Process Order ${orderId}`,
    },
    async (span) => {
      span.setAttribute("order_id", orderId);
      
      // Your order processing logic
      const result = await doOrderProcessing(orderId);
      
      span.setAttribute("items_count", result.items.length);
      return result;
    }
  );
}
```

### User Context

Add user information to errors:

```typescript
import * as Sentry from "@sentry/nextjs";

// After user logs in
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// On logout
Sentry.setUser(null);
```

### Custom Tags

Add searchable tags to errors:

```typescript
Sentry.setTag("payment_method", "credit_card");
Sentry.setTag("customer_tier", "enterprise");
```

### Breadcrumbs

Add context leading up to an error:

```typescript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User attempted login",
  level: "info",
});
```

---

## 🔧 Configuration Adjustments

### Adjust Sampling Rates

Edit `sentry.client.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  
  // Reduce to 10% in production to save quota
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture all errors, 10% of normal sessions
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

### Filter Sensitive Data

Add to any Sentry config file:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  beforeSend(event, hint) {
    // Don't send errors containing sensitive keywords
    if (event.message?.includes('password')) {
      return null;
    }
    
    // Scrub sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    
    return event;
  },
});
```

### Ignore Specific Errors

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    /Network request failed/,
  ],
});
```

---

## 📊 Monitoring Best Practices

### 1. Set Up Alerts

In Sentry dashboard:
- Go to **Alerts** → **Create Alert**
- Set up alerts for:
  - New issues (first occurrence of an error)
  - High error frequency (e.g., >100 errors/hour)
  - Performance degradation (e.g., p95 > 2 seconds)
  - Cron job failures

### 2. Review Issues Regularly

- **Daily:** Check for new critical errors
- **Weekly:** Review performance trends
- **Monthly:** Analyze error patterns and fix root causes

### 3. Use Releases

Tag deployments to track which version introduced errors:

```bash
# During deployment
export SENTRY_RELEASE=$(git rev-parse HEAD)
```

Sentry automatically tracks releases via Vercel integration.

### 4. Monitor Quota Usage

- Free tier: 5,000 errors/month, 50 replays/month
- Check usage: Sentry Dashboard → Settings → Subscription
- Adjust sampling rates if approaching limits

---

## 🐛 Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN is set:**
   ```bash
   vercel env ls | grep SENTRY_DSN
   ```

2. **Verify Sentry is initialized:**
   - Check browser console for Sentry messages
   - Look for `[Sentry]` logs during development

3. **Test with manual capture:**
   ```typescript
   import * as Sentry from "@sentry/nextjs";
   Sentry.captureMessage("Test message");
   ```

### Source Maps Not Uploading

1. **Check Sentry auth token:**
   - Need `SENTRY_AUTH_TOKEN` for CI/CD
   - Vercel handles this automatically

2. **Verify org and project names:**
   - Check `next.config.js` has correct org/project

3. **Check build logs:**
   - Look for "Uploading source maps" messages

### High Quota Usage

1. **Reduce sampling rates** (see Configuration Adjustments above)
2. **Filter out noisy errors** (use `ignoreErrors`)
3. **Upgrade Sentry plan** if needed

---

## 📚 Resources

- **Sentry Next.js Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Sentry Dashboard:** https://sentry.io/organizations/evan-tenenbaum/projects/terp/
- **Performance Monitoring:** https://docs.sentry.io/product/performance/
- **Session Replay:** https://docs.sentry.io/product/session-replay/
- **Cron Monitoring:** https://docs.sentry.io/product/crons/

---

## ✅ Verification Checklist

- [x] Sentry client config created
- [x] Sentry server config created
- [x] Sentry edge config created
- [x] Instrumentation hook configured
- [x] Next.js config updated with Sentry plugin
- [x] SENTRY_DSN added to all Vercel environments
- [x] Build successful with Sentry integration
- [x] Deployed to production
- [x] Automatic error capture enabled
- [x] Performance monitoring enabled
- [x] Session replay enabled
- [x] Vercel Cron monitoring enabled

---

## 🎯 Next Steps

1. **Test the integration:**
   - Trigger a test error
   - Verify it appears in Sentry dashboard

2. **Set up alerts:**
   - Configure email/Slack notifications
   - Set thresholds for critical errors

3. **Monitor for a week:**
   - Review captured errors
   - Adjust sampling rates if needed
   - Fix any critical issues discovered

4. **Optional enhancements:**
   - Add user context tracking
   - Implement custom performance spans
   - Set up release tracking

---

**Status:** ✅ Sentry fully integrated and monitoring production

All errors, performance issues, and cron job executions are now automatically tracked in Sentry!
