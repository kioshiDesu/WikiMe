// Pure logic test for saveVersion deduplication - no IndexedDB needed

const MAX_VERSIONS = 5

// The norm function from useEntries.ts
const norm = (s) => s.trim()

// Mock version data structure
function createVersion(id, entryId, title, contentHtml, savedAt) {
  return { id, entryId, title, contentHtml, savedAt }
}

// The deduplication logic from saveVersion
function shouldCreateVersion(existingVersions, newTitle, newContentHtml) {
  const all = [...existingVersions].sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime())
  if (all.length > 0) {
    const latest = all[all.length - 1]
    if (norm(latest.contentHtml) === norm(newContentHtml) && norm(latest.title) === norm(newTitle)) {
      return false // No new version needed
    }
  }
  return true // Create new version
}

function addVersion(existingVersions, newVersion) {
  const updated = [...existingVersions, newVersion].sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime())
  if (updated.length > MAX_VERSIONS) {
    const toDelete = updated.slice(0, updated.length - MAX_VERSIONS)
    return updated.slice(toDelete.length)
  }
  return updated
}

function runTests() {
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`)
      passed++
    } else {
      console.error(`✗ ${message}`)
      failed++
    }
  }

  // Test 1: No duplicate when title and content unchanged
  console.log('\n--- Test 1: No duplicate when title and content unchanged ---')
  let versions = []
  
  const shouldCreate1 = shouldCreateVersion(versions, 'Test', '<p>Hello</p>')
  assert(shouldCreate1 === true, 'First version should be created')
  
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate2 = shouldCreateVersion(versions, 'Test', '<p>Hello</p>')
  assert(shouldCreate2 === false, 'Second save with same content should NOT create duplicate')

  // Test 2: Trimmed title matches
  console.log('\n--- Test 2: Trimmed title matches stored ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, '  Test  ', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate3 = shouldCreateVersion(versions, 'Test', '<p>Hello</p>')
  assert(shouldCreate3 === false, 'Trimmed title matches - no duplicate')

  // Test 3: Content differs creates new version
  console.log('\n--- Test 3: Content differs creates new version ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate4 = shouldCreateVersion(versions, 'Test', '<p>Hello World</p>')
  assert(shouldCreate4 === true, 'Different content creates new version')
  
  versions = addVersion(versions, createVersion(2, 1, 'Test', '<p>Hello World</p>', new Date('2024-01-02')))
  assert(versions.length === 2, 'Two versions stored after different content')

  // Test 4: Title differs creates new version
  console.log('\n--- Test 4: Title differs creates new version ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate5 = shouldCreateVersion(versions, 'Different Title', '<p>Hello</p>')
  assert(shouldCreate5 === true, 'Different title creates new version')
  
  versions = addVersion(versions, createVersion(2, 1, 'Different Title', '<p>Hello</p>', new Date('2024-01-02')))
  assert(versions.length === 2, 'Two versions stored after different title')

  // Test 5: Trimming works on contentHtml
  console.log('\n--- Test 5: Trimming works on contentHtml ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate6 = shouldCreateVersion(versions, 'Test', '  <p>Hello</p>  ')
  assert(shouldCreate6 === false, 'Whitespace in contentHtml trimmed - no duplicate')

  // Test 6: Max versions limit
  console.log('\n--- Test 6: Max versions limit enforced ---')
  versions = []
  for (let i = 1; i <= 7; i++) {
    versions = addVersion(versions, createVersion(i, 1, `Title ${i}`, `<p>Content ${i}</p>`, new Date(`2024-01-0${i}`)))
  }
  assert(versions.length === MAX_VERSIONS, `Max ${MAX_VERSIONS} versions maintained`)

  // Test 7: Only title whitespace differs - should trim and match
  console.log('\n--- Test 7: Only title whitespace differs ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate7 = shouldCreateVersion(versions, '  Test  ', '<p>Hello</p>')
  assert(shouldCreate7 === false, 'Title with extra whitespace trimmed - no duplicate')

  // Test 8: Only content whitespace differs - should trim and match
  console.log('\n--- Test 8: Only content whitespace differs ---')
  versions = []
  versions = addVersion(versions, createVersion(1, 1, 'Test', '<p>Hello</p>', new Date('2024-01-01')))
  
  const shouldCreate8 = shouldCreateVersion(versions, 'Test', '\n<p>Hello</p>\t')
  assert(shouldCreate8 === false, 'Content with extra whitespace trimmed - no duplicate')

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  return failed === 0
}

const success = runTests()
process.exit(success ? 0 : 1)