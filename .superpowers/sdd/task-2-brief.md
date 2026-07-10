# Task 2: Create searchIndex utility

**Files:**
- Create: `src/utils/searchIndex.ts`

**What to do:**
Create a utility file with these exports:

1. `stripHtml(html: string): string` — creates a temp div, sets innerHTML, returns textContent
2. `tokenize(text: string): string[]` — lowercase, split on whitespace/punctuation (`[\s,.;:!?()\[\]{}"'/\\@#$%^&*+=<>~`|]+`), deduplicate via Set, filter out empty strings, return array
3. `buildSearchIndex(entryId: number, title: string, contentHtml: string, db: WikiMeDB): Promise<void>` — builds index for one entry: strips HTML from contentHtml, combines with title, tokenizes, deletes existing tokens for that entryId, bulk-adds new tokens
4. `rebuildAllSearchIndexes(db: WikiMeDB): Promise<void>` — bulk rebuild for all entries: checks if already up-to-date (searchIndex count >= entry count), if so skips; otherwise clears searchIndex, iterates entries in chunks of 100, tokenizes and bulk-adds
5. `searchEntries(db: WikiMeDB, query: string): Promise<number[]>` — lowercase/trim query, if empty return [], use `db.searchIndex.where('token').startsWith(q).distinct().toArray()`, deduplicate entryIds with `new Set()`, return entryIds

**Import types from:**
```ts
import type { WikiMeDB } from '../db/db'
```

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
