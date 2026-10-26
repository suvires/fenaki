/**
 * What the three owner-only collections (list items, ratings, viewings) share: a `member` field,
 * the short it is about, one row per member and short, a cap per member, and only published
 * shorts. Members reach their own rows only (`ownRowsOrAdmin`); admins read them all.
 */
import type { CollectionBeforeValidateHook, Field, Where } from 'payload'
import { ValidationError } from 'payload'
import { isMemberUser } from '../access.ts'
import { inLanguage, label, messages } from '../labels.ts'

export const memberField: Field = {
  name: 'member',
  label: label('Member', 'Miembro'),
  type: 'relationship',
  relationTo: 'members',
  required: true,
  index: true,
  admin: { readOnly: true },
}

export const shortField: Field = {
  name: 'short',
  label: label('Short', 'Corto'),
  type: 'relationship',
  relationTo: 'shorts',
  required: true,
  index: true,
  admin: { readOnly: true },
}

/** One row per member and short. */
export const oneRowPerMemberAndShort = [{ fields: ['member', 'short'], unique: true }]

const idOf = (value: unknown): unknown =>
  typeof value === 'object' && value !== null ? (value as { id: unknown }).id : value

type Owned = 'list-items' | 'ratings' | 'viewings'

/**
 * Before validating a member's write: the row is theirs whatever they send, it cannot be moved to
 * another member or short, and a new row is only for a published short. The oldest rows go when
 * the member is over the cap.
 */
export function ownedRow(collection: Owned, cap: number): CollectionBeforeValidateHook {
  return async ({ data, operation, originalDoc, req }) => {
    if (!data || !isMemberUser(req.user) || !req.user) return data
    if (operation === 'update') {
      // A row stays with its member and short: whatever they send is put back.
      data.member = idOf(originalDoc?.member)
      data.short = idOf(originalDoc?.short)
      return data
    }
    data.member = req.user.id
    const shortId = idOf(data.short) as number | undefined
    const short = shortId
      ? await req.payload.findByID({
          collection: 'shorts',
          id: shortId,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
          select: { status: true },
          req,
        })
      : null
    if (short?.status !== 'published')
      throw new ValidationError(
        {
          errors: [
            { message: inLanguage(messages.shortNotPublished, req.i18n?.language), path: 'short' },
          ],
        },
        req.t,
      )
    await trimToCap(collection, req.user.id, cap, req)
    return data
  }
}

/** Makes room for one more row: deletes the member's oldest rows past the cap. */
async function trimToCap(
  collection: Owned,
  memberId: number | string,
  cap: number,
  req: Parameters<CollectionBeforeValidateHook>[0]['req'],
) {
  const where: Where = { member: { equals: memberId } }
  const count = await req.payload.count({ collection, where, overrideAccess: true, req })
  const excess = count.totalDocs - (cap - 1)
  if (excess <= 0) return
  const oldest = await req.payload.find({
    collection,
    where,
    sort: 'updatedAt',
    limit: excess,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { member: true },
    req,
  })
  if (oldest.docs.length > 0)
    await req.payload.delete({
      collection,
      where: { id: { in: oldest.docs.map((doc) => doc.id) } },
      overrideAccess: true,
      req,
    })
}
