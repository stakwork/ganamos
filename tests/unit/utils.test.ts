import { describe, it, expect } from 'vitest'
import { formatSatsValue } from '@/lib/utils'

describe('formatSatsValue', () => {
  it('should format small values correctly', () => {
    expect(formatSatsValue(0)).toBe('0 sats')
    expect(formatSatsValue(1)).toBe('1 sats')
    expect(formatSatsValue(999)).toBe('999 sats')
  })

  it('should format thousands correctly', () => {
    expect(formatSatsValue(1000)).toBe('1k sats')
    expect(formatSatsValue(1500)).toBe('1.5k sats')
    expect(formatSatsValue(10000)).toBe('10k sats')
  })

  it('should format millions correctly', () => {
    expect(formatSatsValue(1000000)).toBe('1M sats')
    expect(formatSatsValue(1500000)).toBe('1.5M sats')
    expect(formatSatsValue(10000000)).toBe('10M sats')
  })
})