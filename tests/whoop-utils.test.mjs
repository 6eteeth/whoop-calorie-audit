import { afterEach, test } from 'vitest'
import assert from 'node:assert/strict'
import { dateWithOffset, WHOOP_API_BASE, whoopFetchAll } from '../netlify/functions/_whoop-utils.mjs'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('fetches every WHOOP page using nextToken and combines its records', async () => {
  const urls = []
  const pages = [
    { records: [{ id: 1 }], next_token: 'token with symbols/+=' },
    { records: [{ id: 2 }], next_token: 'last-token' },
    { records: [{ id: 3 }] },
  ]
  globalThis.fetch = async url => {
    urls.push(url)
    return new Response(JSON.stringify(pages.shift()), { status: 200 })
  }

  const records = await whoopFetchAll('/v2/cycle?limit=25&start=2026-01-01', 'access-token')

  assert.deepEqual(records, [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.deepEqual(urls, [
    `${WHOOP_API_BASE}/v2/cycle?limit=25&start=2026-01-01`,
    `${WHOOP_API_BASE}/v2/cycle?limit=25&start=2026-01-01&nextToken=token%20with%20symbols%2F%2B%3D`,
    `${WHOOP_API_BASE}/v2/cycle?limit=25&start=2026-01-01&nextToken=last-token`,
  ])
})

test('returns an empty list when a WHOOP collection has no records', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ records: [], next_token: null }), { status: 200 })

  assert.deepEqual(await whoopFetchAll('/v2/activity/workout?limit=25', 'access-token'), [])
})

test('dateWithOffset maps instants across both sides of UTC midnight', () => {
  assert.equal(dateWithOffset('2026-08-05T02:30:00.000Z', '-07:00'), '2026-08-04')
  assert.equal(dateWithOffset('2026-08-04T22:30:00.000Z', '+05:30'), '2026-08-05')
})
