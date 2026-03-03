# Seeding & Photo Backfill Runbook

**Version**: 2.0  
**Last Updated**: 2026-03-03  
**Status**: Active

This runbook covers how to seed realistic inventory photos safely in staging, keep the same behavior after promotion, and quickly disable synthetic fallback once client-owned catalog data is live.

---

## 1. What This Controls

`pnpm seed:new:complete` now does two things:

1. Canonical data seed (`pnpm seed:new`)
2. Safe batch photo backfill (`pnpm seed:batch-images:apply`)

Photo source order for each batch with zero `product_images` rows:

1. `batches.metadata.mediaFiles`
2. `productMedia` legacy image
3. Open-source flower fallback catalog (Wikimedia)

Open-source fallback can be disabled with:

```bash
SEED_OPEN_SOURCE_FLOWER_FALLBACK=false
```

---

## 2. Deployment Reality (TERP)

TERP deploy path is:

1. PR merged into `main`
2. GitHub sync merges `main` into `staging`
3. DigitalOcean deploys staging
4. Staging is verified
5. Evan manually promotes that build to production

Important: seeding does **not** auto-run on every deploy. You run it intentionally from a controlled job/console step.

---

## 3. Staging Procedure (Recommended First)

### 3.1 Set variables on staging app

In DigitalOcean App Platform (staging app variables):

```bash
SEED_OPEN_SOURCE_FLOWER_FALLBACK=true
```

(If omitted, default behavior is also enabled.)

### 3.2 Dry-run first

From staging app console/job:

```bash
pnpm seed:new --table=product_images --size=small --dry-run --force
pnpm seed:batch-images:safe --limit 200
```

### 3.3 Apply

```bash
pnpm seed:new:complete
```

### 3.4 Verify

- Open `/photography` queue and confirm SKUs show expected photos
- Spot-check multiple batches where `metadata.mediaFiles` is missing
- Confirm no duplicate image spam (idempotent behavior)

---

## 4. After Staging Promotion to Production

When the verified staging build is promoted to production, the code path is identical.

To keep the same behavior in production before real catalog media is ready:

```bash
SEED_OPEN_SOURCE_FLOWER_FALLBACK=true
```

Then run the same controlled command:

```bash
pnpm seed:new:complete
```

---

## 5. Fast Cancel (Real Client Data Go-Live)

Once real products/SKUs/photos are actively managed by clients, disable synthetic fallback immediately:

```bash
SEED_OPEN_SOURCE_FLOWER_FALLBACK=false
```

Then use one of these commands for safe behavior:

```bash
# Full seed path, but real-media-only mode
pnpm seed:new:complete:real-only

# Backfill-only path, real-media-only mode
pnpm seed:batch-images:apply:real-only
```

Effect:

- Seeder still links real batch/product media where available
- Seeder will skip batches with no real media instead of injecting synthetic fallback images

---

## 6. Rollback & Safety

### 6.1 Stop future synthetic inserts

Set:

```bash
SEED_OPEN_SOURCE_FLOWER_FALLBACK=false
```

This is the primary kill switch.

### 6.2 Remove previously inserted seeded rows (optional)

Only if needed for cleanup, run explicit SQL targeting seeded fallback captions containing `Wikimedia Commons`.

Always back up first.

---

## 7. Operational Notes

- `seed-batch-images-safe.ts` is idempotent for missing-image batches only.
- It only touches batches with zero non-deleted `product_images` rows.
- No code change is required to switch modes; only env var + command choice.

---

## 8. Command Quick Reference

```bash
# Canonical staging/demo behavior
pnpm seed:new:complete

# Real-client-safe behavior (no synthetic fallback)
pnpm seed:new:complete:real-only

# Backfill-only preview
pnpm seed:batch-images:safe --limit 200

# Backfill-only apply (synthetic allowed)
pnpm seed:batch-images:apply

# Backfill-only apply (synthetic disabled)
pnpm seed:batch-images:apply:real-only
```
