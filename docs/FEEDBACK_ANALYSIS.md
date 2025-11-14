# Feedback Analysis - New vs Existing Tasks

**Date:** November 14, 2025  
**Source:** Video walkthrough bug report

---

## Analysis Summary

**Total Issues in Feedback:** 16 bugs + 10 feature requests = 26 items  
**Already in Roadmap:** 3 items  
**New Issues:** 23 items

---

## Already Covered by Existing Roadmap

| Feedback ID | Description                           | Existing Task                     |
| :---------- | :------------------------------------ | :-------------------------------- |
| Bug #12     | Global search bar not functional      | QA-012                            |
| Bug #13     | "Create a list" button non-functional | QA-021 (partially - save buttons) |
| Bug #16     | "Create Event" button non-functional  | QA-019 (Calendar save button)     |

---

## NEW BUGS - Need New Tasks

### High Priority Bugs (10)

| ID  | Bug Description                                        | Category       |
| :-- | :----------------------------------------------------- | :------------- |
| 1   | Old sidebar navigation appears on dashboard (mobile)   | UI/Navigation  |
| 4   | Settings icon unresponsive                             | Navigation     |
| 5   | User profile icon unresponsive                         | Navigation     |
| 6   | "Custom" layout preset results in blank dashboard      | Dashboard      |
| 7   | Widget Visibility options disappear with Custom layout | Dashboard      |
| 10  | All dashboard widgets show "No data available"         | Data/Dashboard |
| 15  | No option to select users when creating shared list    | To-Do List     |

### Medium Priority Bugs (6)

| ID  | Bug Description                                    | Category      |
| :-- | :------------------------------------------------- | :------------ |
| 2   | Inbox button acts as link instead of dropdown      | Navigation    |
| 3   | No in-app back buttons                             | UX/Navigation |
| 8   | Comments feature non-functional                    | Comments      |
| 9   | @ tagging in comments likely broken                | Comments      |
| 11  | Time period filters on widgets don't work          | Dashboard     |
| 14  | List Name field not visually indicated as required | Forms/UX      |

---

## NEW FEATURE REQUESTS - Need New Tasks

### High Priority Features (5)

| ID  | Feature Request                              | Category     |
| :-- | :------------------------------------------- | :----------- |
| 1/4 | Merge Inbox and To-Do List (mentioned twice) | Architecture |
| 7   | Rethink Event Creation Form (major overhaul) | Calendar     |
| 8   | Add Event Attendees functionality            | Calendar     |
| 9   | Event Invitation Workflow                    | Calendar     |
| 10  | Link Events to Clients                       | Calendar/CRM |

### Medium Priority Features (5)

| ID  | Feature Request                         | Category       |
| :-- | :-------------------------------------- | :------------- |
| 2   | Investigate @ tagging workflow          | Comments/Tasks |
| 3   | Mobile responsiveness review            | Mobile/UX      |
| 5   | Click to create event on calendar       | Calendar/UX    |
| 6   | Default calendar view to business hours | Calendar/UX    |

---

## Categorization for Task Creation

### Navigation & UI (7 bugs)

- Old sidebar (Bug #1)
- Inbox dropdown (Bug #2)
- No back buttons (Bug #3)
- Settings icon (Bug #4)
- Profile icon (Bug #5)

### Dashboard (4 bugs)

- Custom layout blank (Bug #6)
- Widget visibility disappears (Bug #7)
- No data in widgets (Bug #10)
- Time filters don't work (Bug #11)

### Comments System (2 bugs)

- Comments non-functional (Bug #8)
- @ tagging broken (Bug #9)

### To-Do Lists (2 bugs)

- No user selection for shared lists (Bug #15)
- List name field not marked required (Bug #14)

### Calendar (5 feature requests)

- Event form overhaul (Feature #7)
- Event attendees (Feature #8)
- Event invitations (Feature #9)
- Link to clients (Feature #10)
- Click to create (Feature #5)
- Business hours view (Feature #6)

### Architecture (1 feature request)

- Merge Inbox/To-Do (Features #1/#4)

### Mobile (1 feature request)

- Mobile responsiveness (Feature #3)

### Tagging Workflow (1 feature request)

- @ mention workflow (Feature #2)

---

## Recommended New Task IDs

**QA-028 through QA-050** (23 new tasks)

### Bugs (16 tasks)

- QA-028: Fix old sidebar navigation on dashboard
- QA-029: Fix Inbox dropdown navigation
- QA-030: Add in-app back buttons
- QA-031: Fix Settings icon responsiveness
- QA-032: Fix User profile icon responsiveness
- QA-033: Fix Custom layout blank dashboard
- QA-034: Fix Widget Visibility disappearing
- QA-035: Fix dashboard widgets showing no data
- QA-036: Fix time period filters on widgets
- QA-037: Fix Comments submission
- QA-038: Fix @ tagging in comments
- QA-039: Add user selection for shared lists
- QA-040: Mark List Name field as required

### Features (7 tasks)

- QA-041: Merge Inbox and To-Do List modules
- QA-042: Redesign Event Creation Form
- QA-043: Add Event Attendees functionality
- QA-044: Implement Event Invitation Workflow
- QA-045: Link Events to Clients
- QA-046: Add click-to-create event on calendar
- QA-047: Set default calendar view to business hours
- QA-048: Design @ mention workflow
- QA-049: Conduct mobile responsiveness review
- QA-050: Implement mobile responsiveness fixes

---

## Priority Recommendations

### P0 - CRITICAL (Add to current sprint)

- QA-035: Dashboard widgets no data (blocks dashboard use)
- QA-031: Settings icon broken (core navigation)
- QA-032: Profile icon broken (core navigation)

### P1 - HIGH (Next sprint)

- QA-028: Old sidebar (UX issue)
- QA-033: Custom layout blank
- QA-037: Comments broken
- QA-039: Shared list user selection

### P2 - MEDIUM (Backlog)

- All other bugs and features
