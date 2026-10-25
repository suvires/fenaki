import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isAdminUser } from '../access.ts'
import { groups, label, options } from '../labels.ts'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: label('User', 'Usuario'), plural: label('Users', 'Usuarios') },
  admin: { useAsTitle: 'email', group: groups.admin, defaultColumns: ['email', 'role'] },
  // `useAPIKey`: the AI coordinator signs in with `Authorization: users API-Key <key>`.
  auth: { useAPIKey: true },
  access: {
    // Agents read themselves only; accounts and keys are managed by admins.
    read: ({ req }) =>
      isAdminUser(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // The very first account (created from the admin panel's welcome screen) is the human.
        if (operation === 'create') {
          const others = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (others.totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      label: label('Role', 'Rol'),
      type: 'select',
      required: true,
      defaultValue: 'agent',
      options: options({
        admin: label('Admin (the human)', 'Administrador (la persona)'),
        agent: label('Agent (the AI, through an API key)', 'Agente (la IA, con clave de API)'),
      }),
      access: { create: isAdminField, update: isAdminField },
      admin: {
        description: label(
          'Agents work on the sales CRM and draft emails; only admins approve and send, and change the catalog.',
          'Los agentes trabajan en el CRM comercial y redactan borradores; solo los administradores aprueban, envían y cambian el catálogo.',
        ),
      },
    },
  ],
}
