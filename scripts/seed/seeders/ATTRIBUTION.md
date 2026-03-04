# Image Attribution

## Seed Data Flower Images

Seeded fallback flower photos now come from a curated, open-license Wikimedia Commons pool:

- Catalog file: `scripts/seed/seeders/open-source-flower-images.ts`
- Source types included: `CC BY`, `CC BY-SA`, `CC0`, and `Public domain`
- Attribution text is written into seeded `product_images.caption` for catalog-fallback images

## Why This Exists

- Keeps seeded inventory visuals realistic for QA/UI work
- Avoids random generic placeholder services
- Keeps seeding deterministic and reproducible by batch ID
- Avoids runtime API/network dependency during seeding

## Production Note

These images are for development/test realism only. Production should use real product photography uploaded through the photography workflow.
