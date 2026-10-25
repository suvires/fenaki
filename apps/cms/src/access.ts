import type { Access, FieldAccess } from 'payload'

/**
 * Users have a role. `admin` is the human: full access. `agent` is the AI coordinator, used
 * through an API key: it works on the sales CRM (organizations, contacts, draft messages) and can
 * read the rest, but changes nothing in the catalog and approves or sends nothing.
 */
export type Role = 'admin' | 'agent'

export const roles: Role[] = ['admin', 'agent']

type MaybeUser = { role?: string | null } | null | undefined

export const isAdminUser = (user: MaybeUser): boolean => Boolean(user) && user?.role === 'admin'

export const isAgentUser = (user: MaybeUser): boolean => Boolean(user) && user?.role === 'agent'

/** Admins and agents: whoever may work in the CRM. */
export const isStaffUser = (user: MaybeUser): boolean => isAdminUser(user) || isAgentUser(user)

/** Only admins: the catalog, rights, sponsorship and users. */
export const isAdmin: Access = ({ req }) => isAdminUser(req.user)

/** Admins and agents, for the sales CRM. Never the public. */
export const isStaff: Access = ({ req }) => isStaffUser(req.user)

export const isAuthenticatedField: FieldAccess = ({ req }) => Boolean(req.user)

export const isAdminField: FieldAccess = ({ req }) => isAdminUser(req.user)

/** Editors see everything; the public API only sees published documents. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { status: { equals: 'published' } }
