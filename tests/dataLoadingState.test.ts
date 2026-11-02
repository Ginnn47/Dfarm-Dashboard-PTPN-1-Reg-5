import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('DataLoadingState 1: Reusable component exists in app/components/dashboard/reusable/', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/reusable/DataLoadingState.vue')
  assert.equal(fs.existsSync(compPath), true, 'DataLoadingState.vue must exist in app/components/dashboard/reusable/')

  const content = fs.readFileSync(compPath, 'utf-8')
  assert.equal(content.includes('/images/loaderbg.png'), true, 'Must use /images/loaderbg.png background')
  assert.equal(content.includes('ptpnWave'), true, 'Must define ptpnWave animation keyframes')
  assert.equal(content.includes('prefers-reduced-motion'), true, 'Must handle reduced motion accessibility')
})

test('DataLoadingState 2: PTPN brand palette and error palette definitions', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/reusable/DataLoadingState.vue')
  const content = fs.readFileSync(compPath, 'utf-8')

  // PTPN brand palette
  assert.equal(content.includes('#22A95C'), true, 'Must include PTPN Emerald Green #22A95C')
  assert.equal(content.includes('#F4A21B'), true, 'Must include PTPN Golden Amber #F4A21B')
  assert.equal(content.includes('#4F8BFF'), true, 'Must include PTPN Sky Blue #4F8BFF')

  // Warm orange-to-red palette
  assert.equal(content.includes('#e89005'), true, 'Must include warm orange Bar 1 #e89005')
  assert.equal(content.includes('#ec7505'), true, 'Must include warm orange Bar 2 #ec7505')
  assert.equal(content.includes('#d84a05'), true, 'Must include deep orange Bar 3 #d84a05')
  assert.equal(content.includes('#f42b03'), true, 'Must include vivid red Bar 4 #f42b03')
})

test('DataLoadingState 3: Component API contract (props, emit, and slots)', () => {
  const compPath = path.resolve(process.cwd(), 'app/components/dashboard/reusable/DataLoadingState.vue')
  const content = fs.readFileSync(compPath, 'utf-8')

  // Required props & defaults
  assert.equal(content.includes('status?:'), true, 'Must accept status prop')
  assert.equal(content.includes('showRetry?:'), true, 'Must accept showRetry prop')
  assert.equal(content.includes('retryText?:'), true, 'Must accept retryText prop')
  assert.equal(content.includes('palette?:'), true, 'Must accept palette prop')

  // Emit & slot
  assert.equal(content.includes("emit('retry')") || content.includes("$emit('retry')"), true, 'Must emit retry')
  assert.equal(content.includes('<slot name="actions"'), true, 'Must support #actions slot')
})

test('DataLoadingState 4: Integrated into Lead Measure Karet page', () => {
  const pagePath = path.resolve(process.cwd(), 'app/pages/production/lead-measure-karet/index.vue')
  const content = fs.readFileSync(pagePath, 'utf-8')

  assert.equal(content.includes('<DataLoadingState'), true, 'Lead Measure Karet must render DataLoadingState')
  assert.equal(content.includes('status="loading"'), true, 'Must use loading status')
  assert.equal(content.includes('status="error"'), true, 'Must use error status')
  assert.equal(content.includes(':show-retry="true"'), true, 'Must enable show-retry on error')
  assert.equal(content.includes('@retry="refreshLeadMeasureSource"'), true, 'Must bind retry event to refresh function')
  assert.equal(content.includes('#actions'), true, 'Must provide page-specific actions slot')
  assert.equal(content.includes('Kembali ke Development Data'), true, 'Must provide return to development button')
  assert.equal(content.includes('Kelola Pengaturan Sumber Data'), true, 'Must provide manage data source button')
})

test('DataLoadingState 5: Integrated into Production page', () => {
  const pagePath = path.resolve(process.cwd(), 'app/pages/production/index.vue')
  const content = fs.readFileSync(pagePath, 'utf-8')

  assert.equal(content.includes('<DataLoadingState'), true, 'Production must render DataLoadingState')
  assert.equal(content.includes('status="loading"'), true, 'Must use loading status')
  assert.equal(content.includes('status="error"'), true, 'Must use error status')
  assert.equal(content.includes(':show-retry="isError"'), true, 'Must bind show-retry on error')
  assert.equal(content.includes('@retry="refreshSource"'), true, 'Must bind retry event to refresh function')
  assert.equal(content.includes('Kembali ke Development Data'), true, 'Must provide return to development button')
  assert.equal(content.includes('Kelola Pengaturan Sumber Data'), true, 'Must provide manage data source button')
})

test('DataLoadingState 6: Integrated into Investment On-Farm page', () => {
  const pagePath = path.resolve(process.cwd(), 'app/pages/investment/on-farm/index.vue')
  const content = fs.readFileSync(pagePath, 'utf-8')

  assert.equal(content.includes('<DataLoadingState'), true, 'Investment On-Farm must render DataLoadingState')
  assert.equal(content.includes('status="loading"'), true, 'Must use loading status')
  assert.equal(content.includes('status="error"'), true, 'Must use error status')
  assert.equal(content.includes(':show-retry="true"'), true, 'Must enable show-retry on error')
  assert.equal(content.includes('@retry="retryOnFarmRemote"'), true, 'Must bind retry event to refresh function')
  assert.equal(content.includes('Kembali ke Development Data'), true, 'Must provide return to development button')
  assert.equal(content.includes('Kelola Pengaturan Sumber Data'), true, 'Must provide manage data source button')
})
