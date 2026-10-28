import type { Field } from 'payload'
import { isAuthenticatedField } from '../access.ts'
import type {
  AWARD_RESULTS,
  CREDIT_ROLES,
  GENRES,
  NOT_COMPLETE_REASONS,
  RECOMMENDATIONS,
  SPOKEN_KINDS,
  SUBTITLE_ANSWERS,
  TECHNIQUES,
} from '../ai/schema.ts'
import { GENRE_LABELS, THEME_LABELS } from '../catalog/taxonomy.ts'
import { label, options, type AdminLabel } from '../labels.ts'

const labels = {
  recommendation: {
    publish: label('Publish', 'Publicar'),
    discard: label('Discard', 'Descartar'),
    'needs-human': label('Needs a person', 'Necesita una persona'),
  } satisfies Record<(typeof RECOMMENDATIONS)[number], AdminLabel>,
  notComplete: {
    trailer: label('Trailer or teaser', 'Tráiler o teaser'),
    'making-of': label('Making of', 'Making of'),
    episode: label('Episode of a series', 'Episodio de una serie'),
    ad: label('Advertisement', 'Anuncio'),
    gala: label('Gala or ceremony', 'Gala o ceremonia'),
    clip: label('Clip or excerpt', 'Clip o fragmento'),
    interview: label('Interview', 'Entrevista'),
    compilation: label('Compilation', 'Recopilación'),
    other: label('Something else', 'Otra cosa'),
  } satisfies Record<(typeof NOT_COMPLETE_REASONS)[number], AdminLabel>,
  spoken: {
    es: label('Spanish', 'Español'),
    none: label('No dialogue', 'Sin diálogos'),
    other: label('Another language', 'Otro idioma'),
  } satisfies Record<(typeof SPOKEN_KINDS)[number], AdminLabel>,
  answer: {
    yes: label('Yes', 'Sí'),
    no: label('No', 'No'),
    unknown: label('Unknown', 'No se sabe'),
  } satisfies Record<(typeof SUBTITLE_ANSWERS)[number], AdminLabel>,
  genre: {
    fiction: label('Fiction', 'Ficción'),
    documentary: label('Documentary', 'Documental'),
    animation: label('Animation', 'Animación'),
    experimental: label('Experimental', 'Experimental'),
  } satisfies Record<(typeof GENRES)[number], AdminLabel>,
  technique: {
    animation: label('Animation', 'Animación'),
    'live-action': label('Live action', 'Imagen real'),
    mixed: label('Mixed', 'Mixta'),
    unknown: label('Unknown', 'No se sabe'),
  } satisfies Record<(typeof TECHNIQUES)[number], AdminLabel>,
  awardResult: {
    won: label('Won', 'Ganador'),
    nominated: label('Nominated', 'Nominado'),
    selected: label('Official selection', 'Selección oficial'),
    shortlisted: label('Shortlisted', 'Preseleccionado'),
  } satisfies Record<(typeof AWARD_RESULTS)[number], AdminLabel>,
  role: {
    director: label('Director', 'Dirección'),
    writer: label('Writer', 'Guion'),
    producer: label('Producer', 'Producción'),
    cinematographer: label('Cinematographer', 'Fotografía'),
    editor: label('Editor', 'Montaje'),
    composer: label('Composer', 'Música'),
    cast: label('Cast', 'Reparto'),
  } satisfies Record<(typeof CREDIT_ROLES)[number], AdminLabel>,
}

const select = (
  name: string,
  text: AdminLabel,
  values: Record<string, AdminLabel>,
  extra: { index?: boolean } = {},
): Field => ({ name, label: text, type: 'select', options: options(values), ...extra })

/**
 * «Propuesta de la IA»: what Claude suggests about a short in review. Read-only for people (an
 * API user cannot write it either): the jobs write it, and «Aplicar propuesta» copies it into the
 * short's own fields, only where they are empty.
 */
export const aiReviewField: Field = {
  name: 'aiReview',
  label: label('AI proposal', 'Propuesta de la IA'),
  type: 'group',
  access: { read: isAuthenticatedField, create: () => false, update: () => false },
  admin: {
    description: label(
      'Claude’s suggestions for the editor. Nothing here is published, and applying it never replaces what an editor wrote.',
      'Sugerencias de Claude para el editor. Nada de esto se publica y aplicarlas nunca sustituye lo que escribió un editor.',
    ),
  },
  fields: [
    {
      name: 'actions',
      type: 'ui',
      admin: {
        condition: (data) => Boolean(data?.id),
        components: { Field: '/admin/AiReviewActions.tsx#AiReviewActions' },
      },
    },
    {
      type: 'row',
      fields: [
        select(
          'status',
          label('Status', 'Estado'),
          {
            analyzed: label('Analysed', 'Analizado'),
            batched: label('Waiting for the batch', 'Esperando al lote'),
            refused: label('Declined by the model', 'Rechazado por el modelo'),
            failed: label('Failed', 'Falló'),
          },
          { index: true },
        ),
        select('recommendation', label('Recommendation', 'Recomendación'), labels.recommendation, {
          index: true,
        }),
        { name: 'analyzedAt', label: label('Analysed on', 'Analizado el'), type: 'date' },
      ],
    },
    { name: 'reason', label: label('Why', 'Motivo'), type: 'text' },
    {
      type: 'row',
      fields: [
        {
          name: 'isCompleteShort',
          label: label('Complete short', 'Corto completo'),
          type: 'checkbox',
        },
        select(
          'notCompleteReason',
          label('If not, what it is', 'Si no, qué es'),
          labels.notComplete,
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        select('spokenLanguage', label('Spoken language', 'Idioma hablado'), labels.spoken),
        { name: 'spokenLanguageOther', label: label('Which', 'Cuál'), type: 'text' },
        select(
          'spanishSubtitles',
          label('Spanish subtitles', 'Subtítulos en español'),
          labels.answer,
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'title', label: label('Clean title', 'Título limpio'), type: 'text' },
        { name: 'year', label: label('Year', 'Año'), type: 'number' },
        { name: 'country', label: label('Country', 'País'), type: 'text' },
      ],
    },
    {
      name: 'credits',
      label: label('Credits found', 'Créditos encontrados'),
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: label('Name', 'Nombre'), type: 'text', required: true },
            select('role', label('Role', 'Función'), labels.role),
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        select('genre', label('Type', 'Tipo'), labels.genre),
        select('technique', label('Technique', 'Técnica'), labels.technique),
        {
          name: 'brandedContent',
          label: label('Branded content', 'Contenido de marca'),
          type: 'checkbox',
        },
        { name: 'brand', label: label('Brand', 'Marca'), type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'genres',
          label: label('Genres', 'Géneros'),
          type: 'select',
          hasMany: true,
          options: options(GENRE_LABELS),
        },
        {
          name: 'themes',
          label: label('Themes', 'Temas'),
          type: 'select',
          hasMany: true,
          options: options(THEME_LABELS),
        },
        {
          name: 'allAudiences',
          label: label('For all audiences', 'Para todos los públicos'),
          type: 'checkbox',
        },
        {
          name: 'titleInThumbnail',
          label: label('Title on the thumbnail', 'Título en la miniatura'),
          type: 'checkbox',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'originalTitle', label: label('Original title', 'Título original'), type: 'text' },
        { name: 'production', label: label('Production', 'Producción'), type: 'text' },
        {
          name: 'otherLanguages',
          label: label('Other spoken languages', 'Otros idiomas hablados'),
          type: 'text',
          hasMany: true,
        },
      ],
    },
    {
      name: 'awards',
      label: label('Awards found', 'Premios encontrados'),
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: label('Award', 'Premio'), type: 'text', required: true },
            select('result', label('Result', 'Resultado'), labels.awardResult),
            { name: 'year', label: label('Year', 'Año'), type: 'number' },
          ],
        },
      ],
    },
    {
      name: 'restrictions',
      label: label('Restrictions in the text', 'Restricciones en el texto'),
      type: 'textarea',
    },
    {
      name: 'reuploadSigns',
      label: label('Signs of a re-upload', 'Indicios de resubida'),
      type: 'textarea',
    },
    { name: 'synopsis', label: label('Synopsis', 'Sinopsis'), type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'model', label: label('Model', 'Modelo'), type: 'text' },
        { name: 'appliedAt', label: label('Applied on', 'Aplicada el'), type: 'date' },
        { name: 'batchId', label: label('Batch', 'Lote'), type: 'text' },
      ],
    },
    { name: 'error', label: label('Error', 'Error'), type: 'text' },
  ],
}
