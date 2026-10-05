import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { interpolateTemplatePlaceholders } from './interpolateTemplatePlaceholders'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 15, 12))
})
afterEach(() => vi.useRealTimers())

it('uses the invoice language and handles the previous year and repeated placeholders', () => {
  const text = '{{previousMonth}} / {{month}} / {{month}} / {{date}}'
  expect(interpolateTemplatePlaceholders(text, 'en')).toBe(
    'December / January / January / 2026-01-15'
  )
  expect(interpolateTemplatePlaceholders(text, 'cs')).toBe(
    'prosinec / leden / leden / 2026-01-15'
  )
})

it('handles empty notes and leaves unknown placeholders unchanged', () => {
  expect(interpolateTemplatePlaceholders(null)).toBe('')
  expect(interpolateTemplatePlaceholders()).toBe('')
  expect(interpolateTemplatePlaceholders('Services {{unknown}}')).toBe(
    'Services {{unknown}}'
  )
})
