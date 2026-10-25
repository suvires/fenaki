import type { Payload } from 'payload'
import type { Store } from './organizationsImport.ts'

/** The organizations import's store, backed by Payload's local API (no user: the system). */
export function payloadStore(payload: Payload): Store {
  return {
    async organizations() {
      const found = await payload.find({
        collection: 'organizations',
        select: { name: true, website: true, notes: true },
        depth: 0,
        limit: 0,
        pagination: false,
      })
      return found.docs
    },
    async createOrganization(data) {
      const created = await payload.create({ collection: 'organizations', data: data as never })
      return created.id
    },
    async updateOrganization(id, data) {
      await payload.update({ collection: 'organizations', id, data: data as never })
    },
    async contactEmails() {
      const found = await payload.find({
        collection: 'contacts',
        select: { email: true },
        depth: 0,
        limit: 0,
        pagination: false,
      })
      return new Set(found.docs.map((c) => c.email.toLowerCase()))
    },
    async createContact(data) {
      await payload.create({ collection: 'contacts', data })
    },
  }
}
