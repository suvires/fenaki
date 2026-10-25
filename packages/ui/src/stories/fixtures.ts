import type { ShortCardProps } from '../components/ShortCard.tsx'

/** The sample shorts from the design system previews. Spanish labels stand in for locale strings. */
export const SHORTS: ShortCardProps[] = [
  {
    title: 'Timecode',
    director: 'Juanjo Giménez',
    year: 2016,
    seconds: 900,
    tone: 'tungsteno',
    badges: [{ label: 'Sub ES', tone: 'info' }],
  },
  {
    title: 'Cuerdas',
    director: 'Pedro Solís García',
    year: 2013,
    seconds: 660,
    tone: 'sala',
    badges: [{ label: 'Animación' }],
  },
  { title: 'Madre', director: 'Rodrigo Sorogoyen', year: 2017, seconds: 1080, tone: 'plata' },
  {
    title: 'Alike',
    director: 'Daniel Martínez Lara y Rafa Cano Méndez',
    year: 2015,
    seconds: 480,
    tone: 'sala',
    badges: [{ label: 'Sin diálogos' }],
  },
  {
    title: '7:35 de la mañana',
    director: 'Nacho Vigalondo',
    year: 2003,
    seconds: 480,
    tone: 'tungsteno',
  },
  {
    title: 'Aquel no era yo',
    director: 'Esteban Crespo',
    year: 2012,
    seconds: 1440,
    tone: 'plata',
    badges: [{ label: 'Nuevo', tone: 'accent' }],
  },
]
