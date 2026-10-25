import type { Access, FieldAccess } from 'payload'

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

export const isAuthenticatedField: FieldAccess = ({ req }) => Boolean(req.user)

/** Editors see everything; the public API only sees published documents. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { status: { equals: 'published' } }
