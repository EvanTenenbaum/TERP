# Image Attribution

## Seed Data Images

The placeholder images used in seed data are sourced from **Lorem Picsum** (picsum.photos).

### License
Lorem Picsum provides free placeholder images for developers. Images are from Unsplash and are free to use.

**Picsum License Summary:**
- Free for all uses (commercial and personal)
- No attribution required
- Designed specifically for placeholder/testing use

### How It Works
- Images are generated using deterministic seeds based on product/batch IDs
- Same seed always returns the same image (reproducible)
- Categories get different seed ranges for visual variety

### Note for Production
These seed images are **placeholder images for development and testing only**. For production use:
1. Replace with actual product photography through the photography workflow
2. Remove the attribution notice from the Sidebar
3. Run fresh database migration with real product images

### To Add Real Cannabis Images
1. Use the Photography Module (`/photography`) to upload real product photos
2. Or integrate with a licensed stock photo API
3. Or host your own curated image collection

---

*This file can be deleted when deploying to production with real product images.*
