# Staged workflow files

Files here are kept **outside** `.github/workflows/` because the Manus GitHub App currently lacks the `workflows: write` permission (see [`INFRA_ACCESS.md`](../INFRA_ACCESS.md) §6).

Once the permission is granted, promote them with:

```bash
git mv docs/agent-context/staged/droid-dispatch.yml.new .github/workflows/droid-dispatch.yml
git commit -m "chore(ci): add programmatic droid dispatch workflow"
git push
```

No code changes are required beyond the rename.
