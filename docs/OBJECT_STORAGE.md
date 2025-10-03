# Object Storage (Attachments)

## Envs
- `OBJECT_STORAGE_ENDPOINT` – S3-compatible endpoint (e.g., R2, MinIO, AWS S3).
- `OBJECT_STORAGE_BUCKET` – Bucket name.
- `OBJECT_STORAGE_REGION` – Region (optional).
- `OBJECT_STORAGE_ACCESS_KEY` – Access key ID.
- `OBJECT_STORAGE_SECRET` – Secret key.
- `UPLOAD_DIR` – Local fallback directory when endpoint is not set.

## Usage
- Upload: `POST /api/attachments/upload` with `{ name, contentBase64, contentType?, entity?, entityId? }`.
- List: `GET /api/attachments/list` (stub – wire to DB if you track metadata).
- Read (local fallback): `GET /api/attachments/file?key=...`.
- Archive/Delete: `POST /api/attachments/[id]/archive` with `{ key }`.

## Notes
- For production, prefer S3-compatible storage and generate signed URLs for direct client upload.
- Current implementation uploads via server and returns the object `key`. Add an `Attachment` table for indexing and RBAC filtering.
- Ensure `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are installed.
