# Task 10: Version cascade on delete — Report

**Status:** DONE

**Build:** `webpack 5.108.3 compiled successfully` (3 warnings — bundle size only, no errors)

**Changes made:**
1. `src/hooks/useCategories.ts:35-43` — `deleteCategory` now fetches entryIds, guards with `if (entryIds.length > 0)` before deleting from `searchIndex` and `versions`, then deletes category and entries.
2. `src/hooks/useSections.ts:35-52` — `deleteSection` now iterates categories to collect all entryIds, guards with `if (entryIds.length > 0)` before deleting from `searchIndex` and `versions`, then cascades entries → categories → section.
3. `src/components/AppShell.tsx:93-95` — Trash cleanup now deletes from `searchIndex` and `versions` before deleting each expired entry.
4. `src/hooks/useEntries.ts:126` — `cleanupTrash` now deletes from `searchIndex` before deleting each expired entry (was already deleting versions).

**Concerns:** None.
