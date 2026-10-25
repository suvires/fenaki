import { describe, expect, it } from 'vitest'
import { checkDailyLimit, dailyLimit, followUpAfter, startOfDay } from '../src/crm/limits.ts'

describe('dailyLimit', () => {
  it('is 20 unless CRM_DAILY_SEND_LIMIT says otherwise', () => {
    expect(dailyLimit({})).toBe(20)
    expect(dailyLimit({ CRM_DAILY_SEND_LIMIT: '5' })).toBe(5)
    expect(dailyLimit({ CRM_DAILY_SEND_LIMIT: '0' })).toBe(0)
    expect(dailyLimit({ CRM_DAILY_SEND_LIMIT: '' })).toBe(20)
    expect(dailyLimit({ CRM_DAILY_SEND_LIMIT: 'many' })).toBe(20)
    expect(dailyLimit({ CRM_DAILY_SEND_LIMIT: '-3' })).toBe(20)
  })
})

describe('checkDailyLimit', () => {
  it('allows up to the limit and refuses the next one', () => {
    expect(checkDailyLimit(19, 20)).toEqual({ allowed: true, remaining: 1 })
    expect(checkDailyLimit(20, 20)).toEqual({ allowed: false, limit: 20 })
    expect(checkDailyLimit(0, 0)).toEqual({ allowed: false, limit: 0 })
  })
})

describe('startOfDay', () => {
  it('is local midnight in Madrid, in winter and in summer', () => {
    expect(startOfDay(new Date('2026-12-15T10:30:00Z')).toISOString()).toBe(
      '2026-12-14T23:00:00.000Z',
    )
    expect(startOfDay(new Date('2026-07-15T10:30:00Z')).toISOString()).toBe(
      '2026-07-14T22:00:00.000Z',
    )
  })

  it('puts 23:30 UTC in the next Madrid day', () => {
    expect(startOfDay(new Date('2026-12-15T23:30:00Z')).toISOString()).toBe(
      '2026-12-15T23:00:00.000Z',
    )
  })
})

describe('followUpAfter', () => {
  it('is seven days later by default', () => {
    expect(followUpAfter(new Date('2026-11-02T10:00:00Z')).toISOString()).toBe(
      '2026-11-09T10:00:00.000Z',
    )
  })
})
