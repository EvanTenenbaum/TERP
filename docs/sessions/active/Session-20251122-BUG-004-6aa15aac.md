# Session: Session-20251122-BUG-004-6aa15aac

**Task ID:** BUG-004
**Agent:** Auto (TERP Roadmap Manager)
**Started:** 2025-11-22T00:00:00Z
**Expected Completion:** 2025-11-22
**Module:** `client/src/components/inventory/PurchaseModal.tsx`, `server/routers/inventory.ts`

---

## Progress

- [x] Phase 1: Pre-Flight Check
- [x] Phase 2: Session Startup
- [ ] Phase 3: Development
- [ ] Phase 4: Completion

---

## Notes

**Problem:**
PurchaseModal and EditBatchModal allow users to upload media files (photos, COAs) but these files are never saved to the server. Files are stored in component state but not included in mutation payload.

**Fix Strategy:**
1. Check current file upload implementation
2. Create file upload endpoint if needed
3. Update PurchaseModal to send files with FormData
4. Update EditBatchModal similarly
5. Update server endpoint to handle file uploads
6. Store files and link to purchases/batches

