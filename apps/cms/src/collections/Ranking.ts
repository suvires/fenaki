import type { GlobalConfig } from 'payload'
import { groups, label } from '../labels.ts'

/**
 * The «Lo más visto» Top 10: the most played published shorts of the last seven days, most played
 * first. Written only by the nightly `computeRanking` job from Umami's play events; the site reads
 * it through the REST API and shows the rail only when it holds ten shorts. Unpublished shorts are
 * hidden from anonymous readers by the shorts' own access rules.
 */
export const Ranking: GlobalConfig = {
  slug: 'ranking',
  label: label('Top 10', 'Lo más visto'),
  admin: {
    group: groups.catalog,
    description: label(
      'Computed every night from the plays of the last 7 days. Read only.',
      'Se calcula cada noche con las reproducciones de los últimos 7 días. Solo lectura.',
    ),
  },
  access: { read: () => true, update: () => false },
  fields: [
    {
      name: 'shorts',
      label: label('Shorts', 'Cortos'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: { readOnly: true },
    },
    {
      name: 'computedAt',
      label: label('Computed at', 'Calculado el'),
      type: 'date',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'windowStart',
      label: label('Window start', 'Inicio de la ventana'),
      type: 'date',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'windowEnd',
      label: label('Window end', 'Fin de la ventana'),
      type: 'date',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
