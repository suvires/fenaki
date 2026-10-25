import { DEFAULT_DAILY_LIMIT, DEFAULT_FOLLOW_UP_DAYS } from './constants.ts'

type Env = Record<string, string | undefined>

/** Outbound emails allowed per day (CRM_DAILY_SEND_LIMIT), to protect the mailbox's reputation. */
export function dailyLimit(env: Env = process.env): number {
  const value = Number(env.CRM_DAILY_SEND_LIMIT)
  return Number.isInteger(value) && value >= 0 && env.CRM_DAILY_SEND_LIMIT?.trim()
    ? value
    : DEFAULT_DAILY_LIMIT
}

/** The «day» the limit counts in: Madrid's, where the human works. */
export const LIMIT_TIME_ZONE = 'Europe/Madrid'

/** The instant the calendar day containing `now` started in `timeZone`. */
export function startOfDay(now: Date, timeZone: string = LIMIT_TIME_ZONE): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  // How long into the local day it is; subtracting it from `now` lands on local midnight, also
  // on days where the clocks change (at most an hour off on those two days a year).
  const elapsed = ((get('hour') * 60 + get('minute')) * 60 + get('second')) * 1000
  return new Date(now.getTime() - elapsed - now.getMilliseconds())
}

export function followUpAfter(now: Date, days: number = DEFAULT_FOLLOW_UP_DAYS): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

export type LimitCheck = { allowed: true; remaining: number } | { allowed: false; limit: number }

export function checkDailyLimit(sentToday: number, limit: number): LimitCheck {
  return sentToday >= limit
    ? { allowed: false, limit }
    : { allowed: true, remaining: limit - sentToday }
}
