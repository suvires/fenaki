import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access.ts'
import { groups, label } from '../labels.ts'

/**
 * Editorial choices for the home page. The hero shows `heroShort` while it is published; without
 * one (or once it is unpublished) it shows the latest published short.
 */
export const HomePage: GlobalConfig = {
  slug: 'home',
  label: label('Home page', 'Portada'),
  admin: { group: groups.catalog },
  access: { read: () => true, update: isAdmin },
  fields: [
    {
      name: 'heroShort',
      label: label('Short in the hero', 'Corto destacado en el hero'),
      type: 'relationship',
      relationTo: 'shorts',
      filterOptions: { status: { equals: 'published' } },
      admin: {
        description: label(
          'Empty: the latest published short. If the chosen one is unpublished, the latest one shows.',
          'Vacío: el último corto publicado. Si el elegido deja de estar publicado, se muestra el último.',
        ),
      },
    },
  ],
}
