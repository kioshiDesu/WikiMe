# Task 1 Report: Add searchIndex table to DB schema

## Status: DONE

## Changes
- Added `SearchIndexEntry` interface with fields: `id?: number`, `entryId: number`, `token: string`
- Added `searchIndex!: Table<SearchIndexEntry, number>` table declaration to `WikiMeDB`
- Incremented DB version from 4 to 5 with `searchIndex: '++id, entryId, token'` in the stores schema
- Kept existing version 4 upgrade logic intact
- `SearchIndexEntry` is exported from the module

## Build output
`webpack 5.108.3 compiled with 3 warnings in 24819 ms` — only the 3 standard bundle size warnings, no errors.

## Concerns
None.
