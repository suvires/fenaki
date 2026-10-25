import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { groups, label } from '../labels.ts'

/** Public images: organization logos for showcases. Never film stills. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: label('Image', 'Imagen'), plural: label('Images', 'Imágenes') },
  admin: { group: groups.sponsorship, useAsTitle: 'alt' },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    imageSizes: [{ name: 'logo', width: 480, withoutEnlargement: true }],
  },
  fields: [
    {
      name: 'alt',
      label: label('Alternative text', 'Texto alternativo'),
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: label(
          'What the image says, for people who cannot see it. For a logo, the organization’s name.',
          'Lo que dice la imagen, para quien no puede verla. En un logo, el nombre de la organización.',
        ),
      },
    },
  ],
}
