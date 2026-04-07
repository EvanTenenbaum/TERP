# User-Facing Notes

- This remediation wave is focused on clarity, not a full visual redesign.
- The intended UX goal is: deep links land on the right surface, "start a new order" feels distinct from "browse orders," and mobile controls remain discoverable.
- The Sales Catalogue empty state is not being redesigned in this wave; it stays deferred unless a narrowly scoped follow-up is carved out.
- The sales workspace now uses `New Order` as the user-facing entry label while keeping the underlying `create-order` route stable.

# Runbook Updates

- Add the malformed sales deep link to the regression suite once the implementation lands.
- Keep the screenshot and Claude review packet with this roadmap so future QA can compare against the same problem statement.
- If browser or screenshot proof is ambiguous because of staging-only Agentation console noise, treat that as a verification risk and resolve the console noise before accepting the evidence.

# Follow-Ups

- Decide whether the `Create Order` tab should be renamed to `New Order` in a broader copy and navigation pass.
- Revisit Sales Catalogue toolbar density and handoff-action hierarchy after the route and mobile issues are closed.
- Triage staging-only Agentation console noise separately from the workspace UX lane.
