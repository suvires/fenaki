import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticatedField } from '../access.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { measureTextColor } from '../ingest/stills.ts'
import { groups, label, options } from '../labels.ts'

export const STILL_ORIGINS = ['provider', 'author'] as const
export type StillOrigin = (typeof STILL_ORIGINS)[number]

/**
 * The only film stills Fenaki shows, always served from its own server (visitors never request
 * images from YouTube or Vimeo). A `provider` still is the provider's thumbnail, downloaded and
 * refreshed nightly by the embed checker. An `author` still was supplied by the rights holder:
 * the checker never replaces or deletes it.
 *
 * Decorative image: the page already names the short in text, so it has no alt text.
 */
export const TEXT_COLORS = ['light', 'dark'] as const
export type TextColorSetBy = 'auto' | 'manual'

interface TextColorData {
  textColor?: (typeof TEXT_COLORS)[number] | null
  textColorAuto?: (typeof TEXT_COLORS)[number] | null
  textColorSet?: TextColorSetBy | null
}

/**
 * Keeps the still's text colour. Every time a file arrives (an upload in the admin, the author's
 * file, the nightly refresh) the region where text sits is measured and stored as `textColorAuto`.
 * `textColor` follows it until an editor changes it: that edit marks `textColorSet` as `manual`
 * and from then on only the editor changes `textColor` (the checker's refresh keeps measuring
 * `textColorAuto`, so the editor can see what the image says).
 */
export async function applyTextColor({
  data,
  originalDoc,
  file,
  fromScript = false,
}: {
  data: TextColorData
  originalDoc?: TextColorData
  file?: { data?: Buffer } | null
  /** A script (not an editor) sets `textColor`: never counts as an editor's choice. */
  fromScript?: boolean
}): Promise<TextColorData> {
  const edited =
    !fromScript &&
    originalDoc !== undefined &&
    data.textColor != null &&
    data.textColor !== originalDoc.textColor
  const manual = edited || (data.textColorSet ?? originalDoc?.textColorSet) === 'manual'
  if (file?.data) {
    const { color } = await measureTextColor(file.data)
    data.textColorAuto = color
    if (!manual) data.textColor = color
  }
  data.textColorSet = manual ? 'manual' : 'auto'
  return data
}

export const Stills: CollectionConfig = {
  slug: 'stills',
  labels: { singular: label('Still', 'Fotograma'), plural: label('Stills', 'Fotogramas') },
  admin: {
    group: groups.catalog,
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'short', 'origin', 'textColor', 'includesTitle', 'fetchedAt'],
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // The search index carries the still's presentation: sync the short when it changes.
    afterChange: [
      async ({ doc, req }) => {
        const shortId = typeof doc.short === 'object' ? doc.short.id : doc.short
        if (shortId) await queueIndexShort(req, shortId)
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) =>
        applyTextColor({
          data,
          originalDoc,
          file: req.file,
          fromScript: req.context.textColorScript === true,
        }),
    ],
  },
  upload: {
    staticDir: 'media/stills',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    imageSizes: [
      { name: 'hero', width: 1600, withoutEnlargement: true, formatOptions: { format: 'webp' } },
      // The thumbnail of a short card in rails and grids.
      { name: 'card', width: 640, withoutEnlargement: true, formatOptions: { format: 'webp' } },
    ],
  },
  fields: [
    {
      name: 'short',
      label: label('Short', 'Corto'),
      type: 'relationship',
      relationTo: 'shorts',
      required: true,
      index: true,
    },
    {
      name: 'origin',
      label: label('Origin', 'Origen'),
      type: 'select',
      required: true,
      defaultValue: 'author',
      options: options({
        provider: label('Provider thumbnail', 'Miniatura del proveedor'),
        author: label('Supplied by the author', 'Aportado por el autor'),
      }),
      admin: {
        description: label(
          'Provider stills are refreshed every night. Author stills are never touched by the checker.',
          'Las del proveedor se renuevan cada noche. La comprobación nunca toca las del autor.',
        ),
      },
    },
    {
      name: 'source',
      label: label('Source', 'Fuente'),
      type: 'relationship',
      relationTo: 'sources',
      admin: {
        condition: (data) => data?.origin === 'provider',
        description: label(
          'The source the thumbnail was downloaded from.',
          'La fuente de la que se descargó la miniatura.',
        ),
      },
    },
    {
      name: 'fetchedAt',
      label: label('Downloaded on', 'Descargada el'),
      type: 'date',
      admin: {
        condition: (data) => data?.origin === 'provider',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      type: 'collapsible',
      label: label('Presentation', 'Presentación'),
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'textColor',
              label: label('Text color', 'Color del texto'),
              type: 'select',
              defaultValue: 'light',
              options: options({
                light: label('Light (dark image)', 'Claro (imagen oscura)'),
                dark: label('Dark (light image)', 'Oscuro (imagen clara)'),
              }),
              admin: {
                width: '50%',
                description: label(
                  'Color of the title and details the site writes over this image (home hero, cards and hover preview). Measured on upload; if you change it, the nightly refresh no longer overwrites it.',
                  'Color del título y los datos que la web escribe sobre esta imagen (portada, tarjetas y vista previa). Se mide al subirla; si lo cambias, la renovación nocturna ya no lo sobrescribe.',
                ),
              },
            },
            {
              name: 'includesTitle',
              label: label('The image includes the title', 'La imagen ya incluye el título'),
              type: 'checkbox',
              defaultValue: false,
              admin: {
                width: '50%',
                description: label(
                  'Tick it when the title is drawn on the image (a poster): cards and the preview then show no title over it, and the home hero keeps its heading for screen readers only.',
                  'Márcalo si el título ya está dibujado en la imagen (un cartel): las tarjetas y la vista previa no pondrán el título encima, y la portada conserva el encabezado solo para lectores de pantalla.',
                ),
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'textColorAuto',
              label: label('Measured text color', 'Color medido'),
              type: 'select',
              options: options({
                light: label('Light (dark image)', 'Claro (imagen oscura)'),
                dark: label('Dark (light image)', 'Oscuro (imagen clara)'),
              }),
              admin: {
                width: '50%',
                readOnly: true,
                description: label(
                  'What the lower left of the image measured, at the last upload or refresh.',
                  'Lo que midió la parte inferior izquierda de la imagen en la última subida o renovación.',
                ),
              },
            },
            {
              name: 'textColorSet',
              label: label('Text color chosen', 'Color elegido'),
              type: 'select',
              defaultValue: 'auto',
              options: options({
                auto: label('Automatic', 'Automático'),
                manual: label('By an editor', 'Por una persona'),
              }),
              admin: {
                width: '50%',
                readOnly: true,
                description: label(
                  'Set to «By an editor» when you change the text color.',
                  'Pasa a «Por una persona» cuando cambias el color del texto.',
                ),
              },
            },
          ],
        },
      ],
    },
    {
      name: 'permissionNote',
      label: label('Permission', 'Permiso'),
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: {
        condition: (data) => data?.origin === 'author',
        description: label(
          'Who granted the use of this still, and when. Internal.',
          'Quién concedió el uso de este fotograma, y cuándo. Interno.',
        ),
      },
    },
  ],
}
