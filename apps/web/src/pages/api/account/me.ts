import { accountRoute, json } from '../../../lib/account/route.ts'

/** Who is signed in, for the page's scripts. Never the token. */
export const GET = accountRoute({ limit: 'session', member: true }, async ({ member }) =>
  json({ member: { email: member.email, name: member.name ?? null } }),
)
