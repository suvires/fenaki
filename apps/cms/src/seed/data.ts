/**
 * Sample catalog: the six shorts from the design system previews. Real Spanish shorts so the
 * layouts read true, but durations are approximate, video ids are placeholders, and nothing here
 * has been verified on an official channel. Every document is flagged `sample: true`.
 * The sponsor «Festival de Cine Breve» and the school «Escuela de Cine de Ejemplo» are fictional.
 */
export interface SampleShort {
  title: string
  synopsis: string
  durationSeconds: number
  year: number
  country: string
  originalLanguage: string
  type: 'fiction' | 'documentary' | 'animation' | 'experimental'
  noDialogue: boolean
  posterTone: 'sala' | 'tungsteno' | 'plata'
  directors: string[]
  subtitles: string[]
  publishedAt: string
}

export const SAMPLE_SHORTS: SampleShort[] = [
  {
    title: 'Timecode',
    synopsis:
      'Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día y él de noche, y solo se cruzan en el cambio de turno.',
    durationSeconds: 900,
    year: 2016,
    country: 'ES',
    originalLanguage: 'es',
    type: 'fiction',
    noDialogue: false,
    posterTone: 'tungsteno',
    directors: ['Juanjo Giménez'],
    subtitles: ['es'],
    publishedAt: '2026-08-02T10:00:00.000Z',
  },
  {
    title: 'Cuerdas',
    synopsis:
      'María juega en el patio del colegio con Nicolás, un compañero nuevo que no puede moverse ni hablar.',
    durationSeconds: 660,
    year: 2013,
    country: 'ES',
    originalLanguage: 'es',
    type: 'animation',
    noDialogue: false,
    posterTone: 'sala',
    directors: ['Pedro Solís García'],
    subtitles: [],
    publishedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    title: 'Madre',
    synopsis:
      'Una madre recibe en casa una llamada de su hijo de seis años, que está solo en una playa y no sabe dónde está su padre.',
    durationSeconds: 1080,
    year: 2017,
    country: 'ES',
    originalLanguage: 'es',
    type: 'fiction',
    noDialogue: false,
    posterTone: 'plata',
    directors: ['Rodrigo Sorogoyen'],
    subtitles: [],
    publishedAt: '2026-09-05T10:00:00.000Z',
  },
  {
    title: 'Alike',
    synopsis:
      'En una ciudad gris donde todo es rutina, un padre intenta que su hijo no pierda el color de la creatividad.',
    durationSeconds: 480,
    year: 2015,
    country: 'ES',
    originalLanguage: 'zxx',
    type: 'animation',
    noDialogue: true,
    posterTone: 'sala',
    directors: ['Daniel Martínez Lara', 'Rafa Cano Méndez'],
    subtitles: [],
    publishedAt: '2026-09-18T10:00:00.000Z',
  },
  {
    title: '7:35 de la mañana',
    synopsis:
      'Una mujer baja a desayunar a la cafetería de siempre y encuentra a todos los clientes en silencio, pendientes de un hombre que canta.',
    durationSeconds: 480,
    year: 2003,
    country: 'ES',
    originalLanguage: 'es',
    type: 'fiction',
    noDialogue: false,
    posterTone: 'tungsteno',
    directors: ['Nacho Vigalondo'],
    subtitles: ['es'],
    publishedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    title: 'Aquel no era yo',
    synopsis:
      'Una cooperante y un niño soldado cuentan, años después, el día en que sus caminos se cruzaron en una carretera de África.',
    durationSeconds: 1440,
    year: 2012,
    country: 'ES',
    originalLanguage: 'es',
    type: 'fiction',
    noDialogue: false,
    posterTone: 'plata',
    directors: ['Esteban Crespo'],
    subtitles: ['es', 'en'],
    publishedAt: '2026-10-20T10:00:00.000Z',
  },
]

export const SAMPLE_SPONSOR = {
  name: 'Festival de Cine Breve',
  website: 'https://example.com',
  notes: 'Fictional sponsor for development.',
}

export const SAMPLE_COLLECTION = {
  title: 'Imprescindibles del corto español',
  description: 'Seis cortos que marcaron una época, en los canales de sus autores.',
  sponsorshipStartsAt: '2026-10-01T00:00:00.000Z',
  sponsorshipEndsAt: '2027-03-31T23:59:59.000Z',
}

/** A film school's showcase, presented by the sample sponsor. Fictional. */
export const SAMPLE_SHOWCASE = {
  name: 'Escuela de Cine de Ejemplo',
  kind: 'school' as const,
  website: 'https://example.com',
  intro:
    'Una escuela de cine ficticia para probar los escaparates: su selección de cortos de alumnos y antiguos alumnos.',
  /** Titles from SAMPLE_SHORTS, in display order. */
  shorts: ['Cuerdas', 'Alike', 'Madre'],
}

/**
 * A viewer account for development and the e2e tests: verified, so it signs in at once. Test
 * values, flagged as sample data; the real accounts are created by viewers through the site.
 */
export const SAMPLE_MEMBER = {
  email: 'miembro@example.com',
  password: 'fenaki-ejemplo-10',
  name: 'Miembro de ejemplo',
} as const
