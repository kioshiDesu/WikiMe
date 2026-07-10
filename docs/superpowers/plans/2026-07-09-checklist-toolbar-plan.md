# Checklist Tool + Toolbar Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add task list/checklist support to the TipTap editor and reorganize the toolbar into a single horizontally scrollable row.

**Architecture:** Two TipTap extensions (TaskList + TaskItem) render `<ul data-type="taskList">` with checkboxes. A new toolbar button toggles task lists. The toolbar container switches from `flex-wrap` to `overflow-x-auto flex-nowrap`. CSS styles both editor and read mode.

**Tech Stack:** TipTap (react), @tiptap/extension-task-list, @tiptap/extension-task-item, FontAwesome

## Global Constraints

- No new npm packages beyond `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- Follow existing RichEditor.tsx patterns for extensions, toolbar buttons, and imports
- Task list styles must work in both `.ProseMirror` (editor) and `.entry-content` (read mode)
- Use `faCheckSquare` from `@fortawesome/free-solid-svg-icons` for the toolbar button

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `@tiptap/extension-task-list` and `@tiptap/extension-task-item` available for import

- [ ] **Step 1: Install packages**

```bash
npm install @tiptap/extension-task-list @tiptap/extension-task-item
```

Expected: Packages added to `node_modules` and `package.json` dependencies.

---

### Task 2: Add task list extensions and toolbar button

**Files:**
- Modify: `src/components/RichEditor.tsx`

**Interfaces:**
- Consumes: `TaskList`, `TaskItem` from installed packages
- Produces: Editor supports `<ul data-type="taskList">` with checkbox toggling; toolbar has a new `faCheckSquare` button next to Bullet/Ordered list

- [ ] **Step 1: Add imports**

Add after the existing TipTap extension imports:

```tsx
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
```

Add `faCheckSquare` to the FontAwesome import line. Change:

```tsx
import {
  faBold, faItalic, faUnderline, faStrikethrough,
  faHeading, faListUl, faListOl, faQuoteLeft,
  faCode, faUndo, faRedo, faTable, faPalette,
  faAlignLeft, faAlignCenter, faAlignRight, faAlignJustify,
  faImage, faMicrophone, faStop, faXmark, faRotateLeft, faTrash, faCheck,
} from '@fortawesome/free-solid-svg-icons'
```

To:

```tsx
import {
  faBold, faItalic, faUnderline, faStrikethrough,
  faHeading, faListUl, faListOl, faListCheck, faQuoteLeft,
  faCode, faUndo, faRedo, faTable, faPalette,
  faAlignLeft, faAlignCenter, faAlignRight, faAlignJustify,
  faImage, faMicrophone, faStop, faXmark, faRotateLeft, faTrash, faCheck,
} from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Add extensions to the editor**

In the `extensions` array (after `TextAlign` config and before `Image`), add:

```tsx
      TaskList,
      TaskItem.configure({ nested: true }),
```

- [ ] **Step 3: Add toolbar button**

After the existing `faListOl` button (Numbered List), add:

```tsx
        <Btn action={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive('taskList')} icon={faListCheck} label="Task List" />
```

- [ ] **Step 4: Make toolbar horizontally scrollable**

Find the toolbar container div with class `flex flex-wrap gap-0.5 p-1.5`. Change it to:

```tsx
      <div className="sticky bottom-0 z-10 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-nowrap gap-0.5 p-1.5 overflow-x-auto scrollbar-none" role="toolbar" aria-label="Text formatting">
```

Key changes: `flex-wrap` → `flex-nowrap`, added `overflow-x-auto scrollbar-none`.

- [ ] **Step 5: Build and verify compilation**

```bash
npm run build 2>&1 | tail -15
```

Expected: Compiles with only the 3 bundle-size warnings (no errors).

---

### Task 3: Style task lists for editor and read mode

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `.ProseMirror` and `.entry-content` selectors already exist
- Produces: Task lists render with styled checkboxes; checked items show line-through + teal checkbox

- [ ] **Step 1: Add ProseMirror task list styles**

Add after the `.ProseMirror .selectedCell` block:

```css
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 6px 0;
}

.ProseMirror ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 3px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  background: white;
  -webkit-user-select: none;
  user-select: none;
}

.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
  display: none;
}

.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > label {
  background: #14b8a6;
  border-color: #14b8a6;
}

.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > label::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -1px;
}

.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  color: #94a3b8;
}

.dark .ProseMirror ul[data-type="taskList"] li > label {
  background: #1e293b;
  border-color: #475569;
}

.dark .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > label {
  background: #14b8a6;
  border-color: #14b8a6;
}

.dark .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
  color: #64748b;
}
```

- [ ] **Step 2: Add entry-content task list styles**

Add after the `.entry-content hr` block:

```css
.entry-content ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.entry-content ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 6px 0;
}

.entry-content ul[data-type="taskList"] li::before {
  content: '';
  flex-shrink: 0;
  margin-top: 4px;
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  box-sizing: border-box;
}

.entry-content ul[data-type="taskList"] li[data-checked="true"]::before {
  background: #14b8a6;
  border-color: #14b8a6;
}

.entry-content ul[data-type="taskList"] li[data-checked="true"]::after {
  content: '';
  position: absolute;
  margin-left: 4px;
  margin-top: 6px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.entry-content ul[data-type="taskList"] li {
  position: relative;
}

.entry-content ul[data-type="taskList"] li[data-checked="true"] {
  text-decoration: line-through;
  color: #94a3b8;
}

.dark .entry-content ul[data-type="taskList"] li::before {
  background: #1e293b;
  border-color: #475569;
}

.dark .entry-content ul[data-type="taskList"] li[data-checked="true"]::before {
  background: #14b8a6;
  border-color: #14b8a6;
}

.dark .entry-content ul[data-type="taskList"] li[data-checked="true"] {
  color: #64748b;
}
```

- [ ] **Step 3: Build and verify compilation**

```bash
npm run build 2>&1 | tail -15
```

Expected: Compiles with only the 3 bundle-size warnings (no errors).
