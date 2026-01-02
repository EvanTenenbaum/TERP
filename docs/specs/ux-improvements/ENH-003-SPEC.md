# Specification: ENH-003 - Consolidate Duplicate Pages

**Status:** Draft | **Priority:** MEDIUM | **Estimate:** 4h | **Module:** Navigation, Settings, Pricing

---

## Problem Statement

Two areas have duplicate navigation entries that confuse users:

1. **Locations:** Exists as both `/locations` (standalone) AND `/settings?tab=locations` (Settings tab)
2. **Pricing:** Split into `/pricing/rules` and `/pricing/profiles` when they could be tabs

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Remove `/locations` from main navigation | Must Have |
| FR-02 | Redirect `/locations` to `/settings?tab=locations` | Must Have |
| FR-03 | Combine Pricing Rules and Pricing Profiles into single page | Must Have |
| FR-04 | Redirect old pricing URLs to new combined page | Must Have |
| FR-05 | Update all internal links to use new URLs | Must Have |

## Changes

### Locations Consolidation

**Before:**
- Navigation: "Locations" → `/locations`
- Settings: "Locations" tab → `/settings?tab=locations`

**After:**
- Navigation: Remove "Locations" entry
- Settings: "Locations" tab → `/settings?tab=locations` (unchanged)
- Redirect: `/locations` → `/settings?tab=locations`

### Pricing Consolidation

**Before:**
- Navigation: "Pricing Rules" → `/pricing/rules`
- Navigation: "Pricing Profiles" → `/pricing/profiles`

**After:**
- Navigation: "Pricing" → `/pricing`
- Tabs: "Rules" | "Profiles"
- Redirects: `/pricing/rules` → `/pricing?tab=rules`, `/pricing/profiles` → `/pricing?tab=profiles`

## Technical Specification

### Route Configuration
```typescript
// App.tsx
<Route path="/locations" element={<Navigate to="/settings?tab=locations" replace />} />
<Route path="/pricing/rules" element={<Navigate to="/pricing?tab=rules" replace />} />
<Route path="/pricing/profiles" element={<Navigate to="/pricing?tab=profiles" replace />} />
<Route path="/pricing" element={<PricingPage />} />
```

### Combined Pricing Page
```typescript
export const PricingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rules';

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Pricing</h1>
      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <PricingRulesContent />
        </TabsContent>
        <TabsContent value="profiles">
          <PricingProfilesContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Navigation Configuration Update
```typescript
// Remove from navigation.ts
{ path: '/locations', label: 'Locations', icon: MapPin }, // REMOVE
{ path: '/pricing/rules', label: 'Pricing Rules', icon: DollarSign }, // REMOVE
{ path: '/pricing/profiles', label: 'Pricing Profiles', icon: Tags }, // REMOVE

// Add to navigation.ts
{ path: '/pricing', label: 'Pricing', icon: DollarSign }, // ADD
```

## Net Navigation Change

| Before | After | Change |
|--------|-------|--------|
| 27 items | 25 items | -2 items |

## Acceptance Criteria

- [ ] `/locations` removed from navigation
- [ ] `/locations` redirects to `/settings?tab=locations`
- [ ] `/pricing` shows combined page with Rules and Profiles tabs
- [ ] `/pricing/rules` redirects to `/pricing?tab=rules`
- [ ] `/pricing/profiles` redirects to `/pricing?tab=profiles`
- [ ] All internal links updated to use new URLs
- [ ] No broken links in application
