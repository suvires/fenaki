import type { Access, FieldAccess } from 'payload'

/**
 * Users have a role. `admin` is the human: full access. `agent` is the AI coordinator, used
 * through an API key: it works on the sales CRM (organizations, contacts, draft messages) and can
 * read the rest, but changes nothing in the catalog and approves or sends nothing.
 */
export type Role = 'admin' | 'agent'

export const roles: Role[] = ['admin', 'agent']

/** Anything that may be the signed-in account of a request: staff, a viewer or nobody. */
type MaybeUser = object | null | undefined

const prop = (user: MaybeUser, key: string): unknown =>
  user ? (user as Record<string, unknown>)[key] : undefined

/** A staff account (the `users` collection). Viewers (`members`) are signed in too, but never staff. */
export const isStaffAccount = (user: MaybeUser): boolean => prop(user, 'collection') === 'users'

/** A signed-in viewer (the `members` collection). */
export const isMemberUser = (user: MaybeUser): boolean => prop(user, 'collection') === 'members'

export const isAdminUser = (user: MaybeUser): boolean => prop(user, 'role') === 'admin'

export const isAgentUser = (user: MaybeUser): boolean => prop(user, 'role') === 'agent'

/** Admins and agents: whoever may work in the CRM. */
export const isStaffUser = (user: MaybeUser): boolean => isAdminUser(user) || isAgentUser(user)

/** Only admins: the catalog, rights, sponsorship and users. */
export const isAdmin: Access = ({ req }) => isAdminUser(req.user)

/** Admins and agents, for the sales CRM. Never the public. */
export const isStaff: Access = ({ req }) => isStaffUser(req.user)

/** Staff only: fields (rights, notes) that a signed-in viewer must not read either. */
export const isAuthenticatedField: FieldAccess = ({ req }) => isStaffAccount(req.user)

export const isAdminField: FieldAccess = ({ req }) => isAdminUser(req.user)

/** Editors see everything; the public API, and signed-in viewers, only see published documents. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  isStaffAccount(req.user) ? true : { status: { equals: 'published' } }

/** A signed-in viewer's own rows: `{ member: { equals: id } }`. Admins see all, everyone else none. */
export const ownRowsOrAdmin: Access = ({ req }) => {
  if (isAdminUser(req.user)) return true
  return isMemberUser(req.user) && req.user ? { member: { equals: req.user.id } } : false
}

/** A signed-in viewer's own rows, for writes: admins read them but never edit them. */
export const ownRows: Access = ({ req }) =>
  isMemberUser(req.user) && req.user ? { member: { equals: req.user.id } } : false

export const isMember: Access = ({ req }) => isMemberUser(req.user)
