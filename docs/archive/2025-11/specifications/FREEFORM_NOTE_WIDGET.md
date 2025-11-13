# Advanced Freeform Note Widget - Complete Documentation

## Overview

The **Advanced Freeform Note Widget** is a production-ready, feature-rich note-taking component built for the TERP ERP system. It provides a powerful rich-text editing experience with collaboration features, templates, and seamless backend integration.

---

## Features

### 1. Rich Text Editing (Tiptap)
- **Bold, Italic, Underline** formatting
- **Headings** (H1, H2, H3)
- **Lists**: Bullet lists, numbered lists, nested lists
- **Task Lists**: Hierarchical checkboxes with Tab/Shift+Tab indentation
- **Text Alignment**: Left, center, right
- **Floating Toolbar**: Appears on text selection for quick formatting

### 2. Backend Storage & Auto-Save
- **Auto-save**: Saves content and title automatically 1 second after user stops typing
- **Database Integration**: Full CRUD operations via tRPC
- **Loading States**: Visual feedback during save operations
- **Error Handling**: Graceful error handling with console logging

### 3. Collaboration Features
- **Comments Panel**:
  - Threaded comments with replies
  - Resolve/unresolve functionality
  - Real-time updates (refreshes every 10 seconds)
  - User attribution with avatars and timestamps
- **Activity Log Panel**:
  - Complete audit trail of all note actions
  - Color-coded activity types (Created, Updated, Commented, Shared, etc.)
  - Metadata display for detailed tracking
  - Real-time updates (refreshes every 30 seconds)

### 4. Templates System
- **6 Pre-defined Templates**:
  1. **To-Do List** - Organized task checkboxes
  2. **Meeting Notes** - Structured agenda, discussion, action items
  3. **Brainstorm** - Idea capture with nested sub-ideas
  4. **Goals & OKRs** - Objectives and key results tracking
  5. **Message Board** - Team announcements and updates
  6. **Blank Note** - Start from scratch
- **Template Selector**: Beautiful dialog with visual cards
- **One-click Application**: Instantly populates note with template content

### 5. Note Management
- **Pin/Unpin**: Keep important notes at the top
- **Archive/Restore**: Hide notes without deleting
- **Delete**: Permanent deletion with confirmation
- **Editable Title**: Click to edit note title inline
- **Share**: Share notes with other users (backend ready)

---

## Database Schema

### `freeform_notes` Table
```sql
CREATE TABLE freeform_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  content JSON,
  template_type VARCHAR(50),
  tags JSON,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  shared_with JSON,
  last_viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### `note_comments` Table
```sql
CREATE TABLE note_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id INT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES freeform_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES note_comments(id) ON DELETE CASCADE
);
```

### `note_activity` Table
```sql
CREATE TABLE note_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('CREATED', 'UPDATED', 'COMMENTED', 'SHARED', 'ARCHIVED', 'RESTORED', 'PINNED', 'UNPINNED', 'TEMPLATE_APPLIED') NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES freeform_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## API Endpoints (tRPC)

### Notes
- `freeformNotes.list` - Get all notes for user (with pagination, archive filter)
- `freeformNotes.getById` - Get single note by ID (with access control)
- `freeformNotes.create` - Create new note
- `freeformNotes.update` - Update note content/title
- `freeformNotes.delete` - Delete note (owner only)
- `freeformNotes.togglePin` - Pin/unpin note
- `freeformNotes.toggleArchive` - Archive/restore note
- `freeformNotes.share` - Share note with other users
- `freeformNotes.updateLastViewed` - Update last viewed timestamp
- `freeformNotes.search` - Search notes by title
- `freeformNotes.getByTemplate` - Get notes by template type
- `freeformNotes.getByTag` - Get notes by tag

### Comments
- `freeformNotes.comments.list` - Get all comments for a note
- `freeformNotes.comments.add` - Add comment or reply
- `freeformNotes.comments.resolve` - Resolve a comment

### Activity
- `freeformNotes.activity.list` - Get activity log for a note

---

## Component Architecture

### Main Component
**`FreeformNoteWidget.tsx`**
- Main widget container with tabbed interface
- Tiptap editor integration
- Auto-save logic with debouncing
- State management for title, content, tabs

### Sub-Components
**`CommentsPanel.tsx`**
- Displays threaded comments
- Add comment/reply functionality
- Resolve/unresolve comments
- Real-time updates

**`ActivityLogPanel.tsx`**
- Displays activity log with color-coded icons
- Formats timestamps with `date-fns`
- Shows metadata for detailed tracking

**`TemplateSelector.tsx`**
- Template gallery dialog
- 6 pre-defined templates
- One-click template application

---

## Usage

### Basic Usage
```tsx
import { FreeformNoteWidget } from "@/components/dashboard/widgets-v2";

// New note
<FreeformNoteWidget />

// Edit existing note
<FreeformNoteWidget noteId={123} />

// With delete callback
<FreeformNoteWidget 
  noteId={123} 
  onNoteDeleted={() => console.log("Note deleted")} 
/>
```

### Dashboard Integration
```tsx
// In DashboardV2.tsx
<div className="h-[600px]">
  <FreeformNoteWidget />
</div>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Indent list item or task item |
| `Shift+Tab` | Outdent list item or task item |
| `Cmd/Ctrl+B` | Bold |
| `Cmd/Ctrl+I` | Italic |
| `Cmd/Ctrl+U` | Underline |

---

## Styling

### Custom CSS
**`tiptap-styles.css`**
- Prose styling for editor content
- Task list checkbox styles
- Nested list indentation
- Placeholder text styling

### Tailwind Classes
- Card-based layout with borders
- Responsive design with mobile support
- Consistent spacing and typography
- Color-coded activity icons

---

## Access Control

### Note Access
- **Owner**: Full access (read, write, delete, share)
- **Shared Users**: Read and write access (cannot delete or share)
- **Others**: No access

### Comments
- All users with note access can add comments
- Only comment author can resolve comments

### Activity Log
- All users with note access can view activity log

---

## Performance Optimizations

1. **Debounced Auto-Save**: 1-second delay to reduce API calls
2. **Conditional Rendering**: Comments/Activity panels only load when tab is active
3. **Real-time Updates**: Configurable refresh intervals (10s for comments, 30s for activity)
4. **Lazy Loading**: Tiptap editor loads only when needed

---

## Future Enhancements

### Planned Features
- [ ] **Rich Media**: Image uploads, file attachments
- [ ] **Mentions**: @mention users in notes and comments
- [ ] **Tags Management**: Tag autocomplete, tag filtering
- [ ] **Export**: Export notes to PDF, Markdown, HTML
- [ ] **Version History**: Track note revisions over time
- [ ] **Real-time Collaboration**: Live editing with multiple users
- [ ] **Search**: Full-text search across note content (not just titles)
- [ ] **Custom Templates**: Allow users to create and save their own templates

### Potential Improvements
- [ ] **Offline Support**: Service worker for offline editing
- [ ] **Mobile App**: React Native version
- [ ] **Keyboard Shortcuts**: More advanced shortcuts (Cmd+K for link, etc.)
- [ ] **Drag & Drop**: Reorder list items, upload files
- [ ] **Code Blocks**: Syntax highlighting for code snippets

---

## Troubleshooting

### Common Issues

**Issue**: Auto-save not working
- **Solution**: Check network tab for API errors, verify user authentication

**Issue**: Templates not applying
- **Solution**: Ensure Tiptap editor is initialized, check console for errors

**Issue**: Comments not showing
- **Solution**: Verify note ID is valid, check user has access to note

**Issue**: Activity log empty
- **Solution**: Ensure activities are being logged in backend, check database

---

## Testing Checklist

### Functional Testing
- [x] Create new note
- [x] Edit note title
- [x] Edit note content
- [x] Auto-save triggers after 1 second
- [x] Apply template
- [x] Pin/unpin note
- [x] Archive/restore note
- [x] Delete note
- [x] Add comment
- [x] Reply to comment
- [x] Resolve comment
- [x] View activity log

### UI/UX Testing
- [x] Floating toolbar appears on text selection
- [x] Tab/Shift+Tab indentation works
- [x] Tabs switch correctly (Editor, Comments, Activity)
- [x] Loading states display correctly
- [x] Save status shows "Saving..." and "Saved"
- [x] Template selector dialog opens and closes
- [x] Responsive design works on mobile

### Error Handling
- [x] Graceful error handling for failed saves
- [x] Confirmation dialog for delete action
- [x] Access control prevents unauthorized actions

---

## Dependencies

### Frontend
- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - Basic Tiptap extensions
- `@tiptap/extension-task-list` - Task list support
- `@tiptap/extension-task-item` - Task item support
- `@tiptap/extension-placeholder` - Placeholder text
- `@tiptap/extension-text-align` - Text alignment
- `@tiptap/extension-underline` - Underline formatting
- `date-fns` - Date formatting
- `lucide-react` - Icons

### Backend
- `drizzle-orm` - Database ORM
- `@trpc/server` - API framework
- `zod` - Schema validation

---

## License

This component is part of the TERP ERP system and follows the project's licensing terms.

---

## Support

For issues, questions, or feature requests, please contact the TERP development team.

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
**Author**: TERP Development Team

