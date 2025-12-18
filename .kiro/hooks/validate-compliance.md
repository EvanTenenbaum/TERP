---
name: Validate Protocol Compliance
trigger: on_message
enabled: true
---

# Protocol Compliance Validator

Before processing any request, verify:

1. ✅ All steering files are loaded (check context)
2. ✅ Request doesn't violate any critical rules
3. ✅ If modifying roadmap, run `pnpm roadmap:validate`
4. ✅ If editing code, check for errors (Kiro: `getDiagnostics` | External: `pnpm typecheck`)
5. ✅ If deploying, verify with `./scripts/watch-deploy.sh`

**If any check fails, STOP and report the issue.**
