import { APIError, type CollectionConfig } from 'payload'
import { isAdmin, isAdminUser, isStaff } from '../access.ts'
import { LEGAL_BASES } from '../crm/constants.ts'
import { crmErrors } from '../crm/errors.ts'
import { groups, inLanguage, label, options } from '../labels.ts'

/** People we may write to, each with the legal basis for doing so. Never public. */
export const Contacts: CollectionConfig = {
  slug: 'contacts',
  labels: { singular: label('Contact', 'Contacto'), plural: label('Contacts', 'Contactos') },
  admin: {
    useAsTitle: 'email',
    group: groups.sales,
    defaultColumns: ['email', 'name', 'organization', 'legalBasis', 'doNotContact'],
    listSearchableFields: ['email', 'name'],
  },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && typeof data.email === 'string') data.email = data.email.trim().toLowerCase()
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const was = Boolean(originalDoc?.doNotContact)
        if (data.doNotContact === false && was && !isAdminUser(req.user) && req.user)
          throw new APIError(
            inLanguage(crmErrors.agentClearsDoNotContact, req.i18n?.language),
            403,
            undefined,
            true,
          )
        if (data.doNotContact && !was && !data.doNotContactDate && !originalDoc?.doNotContactDate)
          data.doNotContactDate = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    { name: 'email', label: label('Email', 'Correo'), type: 'email', required: true, unique: true },
    {
      type: 'row',
      fields: [
        { name: 'name', label: label('Name', 'Nombre'), type: 'text' },
        { name: 'role', label: label('Role', 'Cargo'), type: 'text' },
      ],
    },
    {
      name: 'organization',
      label: label('Organization', 'Organización'),
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'legalBasis',
          label: label('Legal basis', 'Base legal'),
          type: 'select',
          required: true,
          options: options(LEGAL_BASES),
        },
        {
          name: 'legalEvidence',
          label: label('Evidence (URL or note)', 'Prueba (URL o nota)'),
          type: 'text',
          required: true,
          admin: {
            description: label(
              'Where the basis can be checked: the page that publishes the address, the earlier thread…',
              'Dónde se puede comprobar la base: la página que publica la dirección, el hilo anterior…',
            ),
          },
        },
      ],
    },
    {
      name: 'doNotContact',
      label: label('Do not contact', 'No contactar'),
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: label(
          'Nothing is ever sent to a contact with this mark.',
          'No se envía nada a un contacto con esta marca.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'doNotContactDate',
          label: label('Marked on', 'Marcado el'),
          type: 'date',
          admin: { condition: (data) => Boolean(data?.doNotContact) },
        },
        {
          name: 'doNotContactReason',
          label: label('Reason', 'Motivo'),
          type: 'text',
          admin: { condition: (data) => Boolean(data?.doNotContact) },
        },
      ],
    },
  ],
}
