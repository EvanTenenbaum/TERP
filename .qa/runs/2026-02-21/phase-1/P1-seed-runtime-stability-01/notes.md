# Notes

- Feature-flag tables are missing in the local schema snapshot; redesign seed now skips feature-flag seeding with explicit warnings instead of schema mutation.
- Runtime still logs fingerprint mismatch warnings in detect-only mode (expected, non-mutating).
