# Prompt for Next Manus Session

Copy and paste this prompt into your next Manus chat to continue exactly where we left off:

---

## PROMPT START

I'm continuing development on the TERP ERP system. The previous session completed the **Sales Sheet Module - Phase 1 (Backend)** and created comprehensive handoff documentation.

**GitHub Repository:** https://github.com/EvanTenenbaum/TERP

**Project Context:**
- TERP is a cannabis ERP system built with React (frontend), tRPC (API), Drizzle ORM (database), and MySQL
- We've completed: Freeform Note Widget, Client Management System, Credit Intelligence System, Performance Optimizations
- Current focus: Sales Sheet Module with dynamic pricing engine

**What's Complete (Phase 1):**
✅ Database schema (4 tables: pricing_rules, pricing_profiles, sales_sheet_templates, sales_sheet_history)
✅ Pricing engine backend (`/server/pricingEngine.ts` - 370+ lines)
✅ tRPC endpoints (11 endpoints in `/server/routers.ts`)
✅ Comprehensive documentation in `/docs/`

**What's Remaining (Phases 2-6):**
⏳ Phase 2: Pricing Rules UI & Client Integration (15-20 hours)
⏳ Phase 3: Sales Sheet Core (20-25 hours)
⏳ Phase 4: Customization & Templates (10-15 hours)
⏳ Phase 5: Export & History (15-20 hours)
⏳ Phase 6: Testing & Polish (5-10 hours)

**Immediate Task:**
Start with **Phase 2** by building:
1. `PricingRulesPage.tsx` - Manage pricing rules (create, edit, delete, rule builder UI)
2. `PricingProfilesPage.tsx` - Manage pricing profiles (collections of rules)
3. Update `ClientProfilePage.tsx` - Add "Pricing Configuration" tab for buyers
4. Add navigation links to sidebar
5. Add routes to App.tsx

**Key Requirements:**
- Use existing tRPC endpoints (`trpc.pricing.*`)
- Follow TERP coding standards (see `/docs/PARALLEL_DEVELOPMENT_PROTOCOL.md`)
- Use shadcn/ui components exclusively
- Tailwind CSS for styling (mobile-first, responsive)
- TypeScript with zero errors
- No placeholders or TODOs

**Documentation to Review:**
1. `/docs/SALES_SHEET_HANDOFF.md` - Complete handoff document with all details
2. `/docs/SALES_SHEET_SPEC.md` - Original specification (300+ lines)
3. `/docs/PARALLEL_DEVELOPMENT_PROTOCOL.md` - TERP development standards
4. `/docs/SALES_SHEET_IMPLEMENTATION_STATUS.md` - Detailed status and next steps

**Development Protocol:**
- Update `/home/ubuntu/terp-redesign/todo.md` before starting (mark tasks as [ ] in progress)
- Follow TERP coding standards (absolute imports with @, consistent naming, error handling)
- Save checkpoints after completing each phase
- Run `webdev_check_status` before checkpoints
- Push to GitHub after each checkpoint

**Questions to Answer:**
1. Should we use existing `batches` table for inventory data or create mock data?
2. Client-side (jsPDF) or server-side (pdfkit) for PDF generation?
3. Should we parallelize Phases 3-5 after completing Phase 2?

**Success Criteria for Phase 2:**
- [ ] PricingRulesPage.tsx complete with full CRUD
- [ ] PricingProfilesPage.tsx complete with profile management
- [ ] Client Profile has "Pricing Configuration" tab
- [ ] Navigation links added to sidebar
- [ ] Routes added to App.tsx
- [ ] TypeScript compiles with 0 errors
- [ ] All UI is mobile-responsive
- [ ] Follows TERP design system
- [ ] Checkpoint saved and pushed to GitHub

**Start by:**
1. Reading `/docs/SALES_SHEET_HANDOFF.md` (most important)
2. Checking current project status with `webdev_check_status`
3. Reviewing existing code: `/server/pricingEngine.ts` and `/server/routers.ts` (pricing router)
4. Building PricingRulesPage.tsx first (foundation for everything else)

**Important Notes:**
- The pricing engine backend is fully functional and tested
- All tRPC endpoints are ready to use
- Database schema is complete (no changes needed)
- Focus on building clean, production-ready UI components
- Reference existing pages (ClientsListPage.tsx, ClientProfilePage.tsx) for patterns

Please confirm you've reviewed the handoff documentation and are ready to start Phase 2.

## PROMPT END

---

## Additional Context (if needed)

If the AI asks for clarification, provide these details:

**Pricing Rules UI Requirements:**
- Table view with columns: Name, Adjustment Type, Adjustment Value, Conditions Summary, Priority, Status, Actions
- Search and filter functionality
- Create Rule dialog with:
  - Name input
  - Description textarea
  - Adjustment type dropdown (4 options: % Markup, % Markdown, $ Markup, $ Markdown)
  - Adjustment value number input
  - Condition builder (add/remove conditions dynamically)
  - Logic type selector (AND/OR)
  - Priority number input
  - Preview section showing sample calculations
- Edit Rule dialog (same as create, pre-filled)
- Delete confirmation dialog
- Mobile-responsive design

**Pricing Profiles UI Requirements:**
- Table view with columns: Name, Description, Rules Count, Created By, Actions
- Create Profile dialog with:
  - Name input
  - Description textarea
  - Multi-select for rules (checkboxes)
  - Priority adjustment per selected rule
  - Preview impact on sample items
- Edit Profile dialog (same as create, pre-filled)
- Delete confirmation dialog
- "Apply to Client" action (opens client selector)

**Client Profile Integration:**
- Add new tab: "Pricing Configuration" (only show for buyers)
- Display current pricing setup (profile name or "Custom Rules")
- Option 1: Select pricing profile (dropdown with all profiles)
- Option 2: Create custom pricing rules (inline rule builder)
- "Save as Profile" checkbox for custom rules
- Display applied rules in table with visual breakdown
- Show sample price calculations

**tRPC Endpoint Usage Examples:**
```typescript
// List all rules
const { data: rules } = trpc.pricing.listRules.useQuery();

// Create rule
const createRule = trpc.pricing.createRule.useMutation({
  onSuccess: () => {
    utils.pricing.listRules.invalidate();
  },
});

// Apply profile to client
const applyProfile = trpc.pricing.applyProfileToClient.useMutation({
  onSuccess: () => {
    utils.clients.getById.invalidate({ id: clientId });
  },
});
```

**File Locations:**
- Frontend pages: `/client/src/pages/`
- Frontend components: `/client/src/components/pricing/`
- Backend: `/server/pricingEngine.ts` (already complete)
- Routes: `/client/src/App.tsx`
- Navigation: `/client/src/components/layout/AppSidebar.tsx`
- Types: `/drizzle/schema.ts` (import from here)

**Design System:**
- Use shadcn/ui components: Button, Input, Select, Dialog, Table, Card, Badge, Checkbox, Textarea
- Icons from lucide-react: Plus, Edit, Trash, Search, Settings, TrendingUp, etc.
- Tailwind classes for layout: grid, flex, gap-4, p-4, rounded-lg, shadow-md
- Responsive breakpoints: sm:, md:, lg:, xl:
- Color scheme: Primary (blue), Success (green), Danger (red), Warning (yellow)

**Common Patterns:**
```typescript
// Page structure
export default function PricingRulesPage() {
  const { data, isLoading } = trpc.pricing.listRules.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pricing Rules</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>
      <Table>...</Table>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>...</Dialog>
    </div>
  );
}
```

Good luck! The foundation is solid, and the path forward is clear. 🚀

