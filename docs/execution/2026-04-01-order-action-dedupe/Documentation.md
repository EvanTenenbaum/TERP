# User-Facing Notes

- The sheet-native sales order / quote composer now keeps a single visible save/finalize action stack instead of duplicating those controls in the top toolbar and the draft-status card.
- The remaining action stack now reflects disabled states for unavailable customers and invalid drafts before the user clicks.

# QA Notes

- Local proof is complete:
  - sale mode shows one visible `Save Draft` and one `Confirm Order`
  - quote mode shows one visible `Save Draft` and one `Confirm Quote`
  - unavailable customer route shows the warning state and no visible action buttons
- Live staging QA should confirm the same counts after merge and deploy.
