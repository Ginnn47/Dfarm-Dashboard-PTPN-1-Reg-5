import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Entrance Animation 1: useDashboardEntranceAnimation composable exists and has correct contract', () => {
  const filePath = path.resolve(process.cwd(), 'app/composables/useDashboardEntranceAnimation.ts')
  assert.equal(fs.existsSync(filePath), true, 'Composable file must exist')

  const content = fs.readFileSync(filePath, 'utf-8')
  assert.equal(content.includes("export function useDashboardEntranceAnimation"), true, 'Must export useDashboardEntranceAnimation')
  assert.equal(content.includes("prefersReducedMotion"), true, 'Must export or include prefersReducedMotion')
  assert.equal(content.includes("clearProps: 'all'"), true, 'Must clean up inline styles using clearProps all')
  assert.equal(content.includes("power2.out"), true, 'Must use power2.out or standard smooth deceleration')
  assert.equal(content.includes("gsap.killTweensOf"), true, 'Must kill active tweens on unmount')
  assert.equal(content.includes("hasAnimated"), true, 'Must guard against re-animation on filter changes')
})

test('Entrance Animation 2: Reduced motion accessibility check is robust and SSR-safe', () => {
  const filePath = path.resolve(process.cwd(), 'app/composables/useDashboardEntranceAnimation.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(content.includes("typeof window !== 'undefined'"), true, 'Must be SSR safe')
  assert.equal(content.includes("(prefers-reduced-motion: reduce)"), true, 'Must query prefers-reduced-motion')
})

test('Entrance Animation 3: Stagger and timing align with DFARM design system', () => {
  const filePath = path.resolve(process.cwd(), 'app/composables/useDashboardEntranceAnimation.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(content.includes("duration = 0.55"), true, 'Default duration should be subtle (~0.55s)')
  assert.equal(content.includes("stagger = 0.06"), true, 'Default stagger should be gentle (~0.06s)')
  assert.equal(content.includes("yOffset = 16"), true, 'Default upward travel should be 16px')
})

test('Entrance Animation 4: Production Dashboard integrates standard entrance animation', () => {
  const filePath = path.resolve(process.cwd(), 'app/pages/production/index.vue')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(content.includes('useDashboardEntranceAnimation(pageContainer'), true, 'Production page must call useDashboardEntranceAnimation')
  assert.equal(content.includes('ref="pageContainer"'), true, 'Production page must bind pageContainer ref')
  assert.equal(content.includes('data-animate-section'), true, 'Production page must mark sections with data-animate-section')
})

test('Entrance Animation 5: Lead Measure Karet integrates standard entrance animation', () => {
  const filePath = path.resolve(process.cwd(), 'app/pages/production/lead-measure-karet/index.vue')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(content.includes('useDashboardEntranceAnimation(pageContainer'), true, 'Lead Measure page must call useDashboardEntranceAnimation')
  assert.equal(content.includes('ref="pageContainer"'), true, 'Lead Measure page must bind pageContainer ref')
  assert.equal(content.includes('data-animate-section'), true, 'Lead Measure page must mark sections with data-animate-section')
})

test('Entrance Animation 6: Investment On-Farm integrates standard entrance animation', () => {
  const filePath = path.resolve(process.cwd(), 'app/pages/investment/on-farm/index.vue')
  const content = fs.readFileSync(filePath, 'utf-8')

  assert.equal(content.includes('useDashboardEntranceAnimation(pageContainer'), true, 'On-Farm page must call useDashboardEntranceAnimation')
  assert.equal(content.includes('ref="pageContainer"'), true, 'On-Farm page must bind pageContainer ref')
  assert.equal(content.includes('data-animate-section'), true, 'On-Farm page must mark sections with data-animate-section')
})

test('Entrance Animation 7: Placeholder pages (Finance, Off-Farm) are intentionally excluded', () => {
  const financePath = path.resolve(process.cwd(), 'app/pages/finance/index.vue')
  const offFarmPath = path.resolve(process.cwd(), 'app/pages/investment/off-farm/index.vue')

  const financeContent = fs.readFileSync(financePath, 'utf-8')
  const offFarmContent = fs.readFileSync(offFarmPath, 'utf-8')

  assert.equal(financeContent.includes('UnderDevelopment'), true, 'Finance is placeholder and not animated')
  assert.equal(financeContent.includes('useDashboardEntranceAnimation'), false, 'Finance must not call entrance animation')

  assert.equal(offFarmContent.includes('UnderDevelopment'), true, 'Off-Farm is placeholder and not animated')
  assert.equal(offFarmContent.includes('useDashboardEntranceAnimation'), false, 'Off-Farm must not call entrance animation')
})
