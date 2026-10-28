/**
 * A member's rows in the CMS: «Mi lista», ratings and viewings («Seguir viendo» and the history).
 * Every call carries the member's token, so the CMS' own access rules apply: a member only ever
 * reaches their own rows. Shorts are identified by slug outside and by id inside.
 */
import type { Locale } from '@fenaki/i18n'
import { cms, type CmsResult, type Page } from './payload.ts'
import type { PlayerProvider } from '../playerConsent.ts'
import type { RatingValue } from './rules.ts'
import type { SessionMember } from './session.ts'

/** The member's session is no longer valid (expired or revoked). Routes answer 401. */
export class SessionExpired extends Error {}

function ensure<T>(result: CmsResult<T>, accepted: number[] = [200, 201]): CmsResult<T> {
  if (result.status === 401 || result.status === 403) throw new SessionExpired()
  if (!accepted.includes(result.status)) throw new Error(`CMS answered ${result.status}`)
  return result
}

export interface ListEntry {
  slug: string
  /** Epoch milliseconds. */
  savedAt: number
}

export interface ViewingEntry {
  slug: string
  position: number
  duration: number
  completed: boolean
  /** Epoch milliseconds. */
  updatedAt: number
}

export interface AccountState {
  list: ListEntry[]
  ratings: Record<string, RatingValue>
  playerConsent: PlayerProvider[]
}

type Related = number | { id: number; slug?: string | null } | null | undefined

/** The slug of a populated short; undefined when it is not readable (no longer published). */
const slugOf = (short: Related): string | undefined =>
  typeof short === 'object' && short !== null && short.slug ? short.slug : undefined

/** Only the short's slug is populated, and only the fields each list needs are selected. */
const WITH_SLUG = { depth: 1, 'populate[shorts][slug]': true } as const

export const MAX_LIST = 200
export const MAX_RATINGS = 1000

export async function loadList(member: SessionMember, locale: Locale): Promise<ListEntry[]> {
  const result = ensure(
    await cms<Page<{ short: Related; savedAt: string }>>('list-items', {
      token: member.token,
      query: {
        ...WITH_SLUG,
        locale,
        limit: MAX_LIST,
        sort: '-savedAt',
        'select[short]': true,
        'select[savedAt]': true,
      },
    }),
    [200],
  )
  return (result.data?.docs ?? []).flatMap((row) => {
    const slug = slugOf(row.short)
    return slug ? [{ slug, savedAt: Date.parse(row.savedAt) }] : []
  })
}

export async function loadRatings(
  member: SessionMember,
  locale: Locale,
): Promise<Record<string, RatingValue>> {
  const result = ensure(
    await cms<Page<{ short: Related; value: RatingValue }>>('ratings', {
      token: member.token,
      query: {
        ...WITH_SLUG,
        locale,
        limit: MAX_RATINGS,
        sort: 'updatedAt',
        'select[short]': true,
        'select[value]': true,
      },
    }),
    [200],
  )
  return Object.fromEntries(
    (result.data?.docs ?? []).flatMap((row) => {
      const slug = slugOf(row.short)
      return slug ? [[slug, row.value] as const] : []
    }),
  )
}

/** The member's viewings, newest first: the unfinished ones («Seguir viendo») or all (history). */
export async function loadViewings(
  member: SessionMember,
  locale: Locale,
  options: { unfinished?: boolean; limit?: number } = {},
): Promise<ViewingEntry[]> {
  const result = ensure(
    await cms<
      Page<{
        short: Related
        positionSeconds: number
        durationSeconds: number
        completed?: boolean | null
        updatedAt: string
      }>
    >('viewings', {
      token: member.token,
      query: {
        ...WITH_SLUG,
        locale,
        limit: options.limit ?? 200,
        sort: '-updatedAt',
        ...(options.unfinished ? { 'where[completed][equals]': false } : {}),
        'select[short]': true,
        'select[positionSeconds]': true,
        'select[durationSeconds]': true,
        'select[completed]': true,
        'select[updatedAt]': true,
      },
    }),
    [200],
  )
  return (result.data?.docs ?? []).flatMap((row) => {
    const slug = slugOf(row.short)
    return slug
      ? [
          {
            slug,
            position: row.positionSeconds,
            duration: row.durationSeconds,
            completed: Boolean(row.completed),
            updatedAt: Date.parse(row.updatedAt),
          },
        ]
      : []
  })
}

/** Where the member stopped in one short, if they ever started it. */
export async function loadViewing(
  member: SessionMember,
  shortId: number,
): Promise<{ position: number; duration: number; completed: boolean } | undefined> {
  const result = ensure(
    await cms<
      Page<{ positionSeconds: number; durationSeconds: number; completed?: boolean | null }>
    >('viewings', {
      token: member.token,
      query: {
        depth: 0,
        limit: 1,
        'where[short][equals]': shortId,
        'select[positionSeconds]': true,
        'select[durationSeconds]': true,
        'select[completed]': true,
      },
    }),
    [200],
  )
  const row = result.data?.docs?.[0]
  return row
    ? {
        position: row.positionSeconds,
        duration: row.durationSeconds,
        completed: Boolean(row.completed),
      }
    : undefined
}

const states = new WeakMap<SessionMember, Promise<AccountState>>()

/**
 * The list, ratings and player choices of the member, once per request: the layout and the page
 * share it.
 */
export function loadAccountState(member: SessionMember, locale: Locale): Promise<AccountState> {
  let state = states.get(member)
  if (!state) {
    state = Promise.all([loadList(member, locale), loadRatings(member, locale)]).then(
      ([list, ratings]) => ({ list, ratings, playerConsent: member.playerConsent }),
    )
    states.set(member, state)
  }
  return state
}

/** A row of one of the owner-only collections, by short. */
async function findRow(
  collection: 'list-items' | 'ratings' | 'viewings',
  member: SessionMember,
  shortId: number,
): Promise<number | undefined> {
  const found = ensure(
    await cms<Page<{ id: number }>>(collection, {
      token: member.token,
      query: { depth: 0, limit: 1, 'where[short][equals]': shortId, 'select[id]': true },
    }),
    [200],
  )
  return found.data?.docs?.[0]?.id
}

/** Creating a row that already exists (two requests at once) is the same as having created it. */
const isDuplicate = (result: CmsResult) => result.status === 400

async function upsert(
  collection: 'list-items' | 'ratings' | 'viewings',
  member: SessionMember,
  shortId: number,
  data: Record<string, unknown>,
  createOnly?: Record<string, unknown>,
): Promise<void> {
  const id = await findRow(collection, member, shortId)
  if (id !== undefined) {
    ensure(
      await cms(`${collection}/${id}`, { method: 'PATCH', token: member.token, body: data }),
      [200],
    )
    return
  }
  const created = await cms(collection, {
    method: 'POST',
    token: member.token,
    body: { short: shortId, ...data, ...createOnly },
  })
  if (!isDuplicate(created)) ensure(created, [201])
}

async function removeRows(
  collection: 'list-items' | 'ratings' | 'viewings',
  member: SessionMember,
  where: Record<string, string | number>,
): Promise<void> {
  ensure(await cms(collection, { method: 'DELETE', token: member.token, query: where }), [200])
}

/** Saving a short again moves it to the top. */
export const addToList = (member: SessionMember, shortId: number, savedAt = Date.now()) =>
  upsert('list-items', member, shortId, { savedAt: new Date(savedAt).toISOString() })

export const removeFromList = (member: SessionMember, shortId: number) =>
  removeRows('list-items', member, { 'where[short][equals]': shortId })

export const setRating = (member: SessionMember, shortId: number, value: RatingValue) =>
  upsert('ratings', member, shortId, { value })

export const clearRating = (member: SessionMember, shortId: number) =>
  removeRows('ratings', member, { 'where[short][equals]': shortId })

export const saveViewing = (
  member: SessionMember,
  shortId: number,
  position: number,
  duration: number,
) =>
  upsert('viewings', member, shortId, {
    positionSeconds: Math.floor(position),
    durationSeconds: Math.ceil(duration),
  })

export const removeViewing = (member: SessionMember, shortId: number) =>
  removeRows('viewings', member, { 'where[short][equals]': shortId })

/** The whole history: every viewing of the member. */
export const clearViewings = (member: SessionMember) =>
  removeRows('viewings', member, { 'where[member][equals]': member.id })
