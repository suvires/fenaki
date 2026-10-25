import type { CollectionConfig } from 'payload'
import { groups, label } from '../labels.ts'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: label('User', 'Usuario'), plural: label('Users', 'Usuarios') },
  admin: { useAsTitle: 'email', group: groups.admin },
  auth: true,
  fields: [],
}
