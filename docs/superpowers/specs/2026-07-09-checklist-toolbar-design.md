# Checklist Tool + Toolbar Reorganization

## Summary

Add a task list / checklist feature to the TipTap editor and reorganize the mobile toolbar into a single horizontally scrollable row for a cleaner, more compact layout.

## Checklist Feature

### Extensions
- Install `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- Add to the editor's extension list alongside existing StarterKit, Underline, Table, etc.

### Behavior
- Tapping the checklist button converts the current block to a `<ul data-type="taskList">` with `<li data-type="taskItem">` containing a checkbox
- The button shows `active` state when the cursor is inside a task list
- Clicking the checkbox in the editor toggles the `done` attribute on the task item
- In read mode (entry-content), checkboxes render as `<ul data-type="taskList">` and are styled consistently

### Toolbar Button
- New `faCheckSquare` (or similar) icon button placed next to the existing Bullet List and Numbered List buttons
- Group: Bullet List | Numbered List | Task List — three adjacent buttons

### CSS Styling
- Style task list `<ul data-type="taskList">` in both `.ProseMirror` and `.entry-content`:
  - Remove default list-style (disc/ decimal) — replaced by checkboxes
  - Indent similar to other lists
  - Padding-left for list items
- Style `<li data-type="taskItem">` with checkbox:
  - Inline-flex layout with the checkbox and content side by side
  - Checkbox: custom-styled square (2px border, rounded-sm, teal on checked)
  - When `done` attribute present: checkbox background teal with checkmark, content gets line-through + muted color
  - Dark mode variants

## Toolbar Reorganization

### Layout Change
- The toolbar container (`overflow-x-auto flex-nowrap scrollbar-none`):
  - `overflow-x-auto` — scrollable horizontally when content overflows
  - `flex-nowrap` — single row, no wrapping
  - `scrollbar-none` — hide scrollbar for clean look
- Removes `flex-wrap` and the wrapping behavior

### Button Order
Single scrollable row: `B I U S | H1 | Bullet Num Task | Quote Code Table | Image Audio | L C R J | Undo Redo`

All existing `Btn` and `Divider` components remain unchanged — only the container classes change.

## Files Changed
- `package.json` — add `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- `src/components/RichEditor.tsx` — add extensions, toolbar button, new container classes
- `src/index.css` — task list styling for both `.ProseMirror` and `.entry-content`
