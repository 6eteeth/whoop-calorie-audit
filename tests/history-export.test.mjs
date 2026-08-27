import { test } from 'vitest'
import assert from 'node:assert/strict'

import { historyCsv, historyExportColumns } from '../src/lib/historyExport.js'

test('exports one chronological row per day with every configured field', () => {
  const csv = historyCsv([
    { entry_date: '2026-08-27', weight_lb: 180, calories_eaten: 2400, carbs_g: 250, fat_g: 80, protein_g: 170, whoop_day_strain: 14.2 },
    { entry_date: '2026-08-26', weight_lb: 181, calories_eaten: 2300, carbs_g: 240, fat_g: 75, protein_g: 166, whoop_recovery_score: 82 },
  ])
  const rows = csv.split('\r\n')

  assert.equal(rows.length, 3)
  assert.equal(rows[0].split(',').length, historyExportColumns.length)
  assert.ok(rows[0].includes('WHOOP sleep duration (minutes)'))
  assert.ok(rows[1].startsWith('2026-08-26,181,2300,240,75,166'))
  assert.ok(rows[2].startsWith('2026-08-27,180,2400,250,80,170'))
})

test('preserves commas, quotes, and line breaks in exported notes', () => {
  const csv = historyCsv([{ entry_date: '2026-08-27', notes: 'Felt "great",\nstrong session' }])

  assert.ok(csv.includes('"Felt ""great"",\nstrong session"'))
})
