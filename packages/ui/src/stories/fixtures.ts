import type { ShortCardProps } from '../molecules/ShortCard.tsx'

/** The sample shorts from the design system previews. Spanish labels stand in for locale strings. */
export const SHORTS: ShortCardProps[] = [
  {
    title: 'Timecode',
    synopsis:
      'Dos guardas de un aparcamiento se cruzan cada noche en el cambio de turno y descubren que comparten algo más que un reloj de fichar.',
    director: 'Juanjo Giménez',
    year: 2016,
    seconds: 900,
    tone: 'tungsteno',
    badges: [{ label: 'Sub ES', tone: 'info' }],
  },
  {
    title: 'Cuerdas',
    synopsis:
      'Una niña que se ha quedado sola en el patio descubre que el compañero nuevo, al que nadie se acerca, puede enseñarle a mirar el mundo de otra manera.',
    director: 'Pedro Solís García',
    year: 2013,
    seconds: 660,
    tone: 'sala',
    badges: [{ label: 'Animación' }],
  },
  {
    title: 'Madre',
    synopsis:
      'Una madre recibe una llamada de su hijo, que está solo en una playa de Francia, y la tensión crece en cada minuto de conversación.',
    director: 'Rodrigo Sorogoyen',
    year: 2017,
    seconds: 1080,
    tone: 'plata',
  },
  {
    title: 'Alike',
    synopsis:
      'Un padre y su hijo recorren una ciudad gris donde todos hacen lo mismo, hasta que el niño empieza a perder los colores.',
    director: 'Daniel Martínez Lara y Rafa Cano Méndez',
    year: 2015,
    seconds: 480,
    tone: 'sala',
    badges: [{ label: 'Sin diálogos' }],
  },
  {
    title: '7:35 de la mañana',
    synopsis:
      'En una cafetería, un hombre se levanta a las siete y treinta y cinco con un propósito que nadie imagina.',
    director: 'Nacho Vigalondo',
    year: 2003,
    seconds: 480,
    tone: 'tungsteno',
  },
  {
    title: 'Aquel no era yo',
    synopsis:
      'Un niño soldado y un cooperante occidental se cruzan en un lugar donde las decisiones tienen un precio demasiado alto.',
    director: 'Esteban Crespo',
    year: 2012,
    seconds: 1440,
    tone: 'plata',
    badges: [{ label: 'Nuevo', tone: 'accent' }],
  },
]
