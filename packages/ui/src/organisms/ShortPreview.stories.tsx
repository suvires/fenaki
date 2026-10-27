import type { Meta, StoryObj } from '@storybook/react-vite'
import backdrop from '../stories/assets/backdrop.jpg'
import backdropLight from '../stories/assets/backdrop-light.jpg'
import { ShortPreview } from './ShortPreview.tsx'
import { SHORTS } from '../stories/fixtures.ts'

const meta = {
  title: 'Media/ShortPreview',
  component: ShortPreview,
  args: {
    ...SHORTS[0],
    href: '#',
    typeLabel: 'Ficción',
    directedBy: 'Dirigido por Juanjo Giménez',
    floating: false,
    // 1.5 × a card, as the island sizes it.
    className: 'w-[calc(var(--size-card)*1.5)]',
    labels: {
      play: 'Ver ahora',
      addToList: 'Añadir a mi lista',
      inMyList: 'En mi lista',
      more: 'Más información',
      rating: {
        rate: 'Valorar',
        dislike: 'No es para mí',
        like: 'Me gusta',
        love: '¡Me encanta!',
      },
    },
  },
  decorators: [(Story) => <div className="p-6 pt-8">{Story()}</div>],
} satisfies Meta<typeof ShortPreview>

export default meta
type Story = StoryObj<typeof meta>

/** The still, with the title over it. */
export const WithImage: Story = { args: { image: backdrop } }
/** A light still: the editor marked dark text. */
export const WithLightImage: Story = { args: { image: backdropLight, imageTextColor: 'dark' } }
/** The still already carries the title: nothing is painted over it. */
export const ImageIncludesTitle: Story = { args: { image: backdrop, imageHasTitle: true } }
/** Without a still: the landscape typographic poster. */
export const WithPoster: Story = {}
export const SavedInMyList: Story = { args: { image: backdrop, saved: true } }
export const Liked: Story = { args: { image: backdrop, rating: 'like' } }
export const Branded: Story = {
  args: {
    image: backdrop,
    badges: [
      { label: 'Contenido de marca', tone: 'branded' },
      { label: 'Sub ES', tone: 'info' },
      { label: 'Sin diálogos' },
    ],
  },
}
/** The rating pill open over the buttons beside it, with the tooltip of «Me gusta». */
export const RatingOpen: Story = {
  args: { image: backdrop, saved: true, ratingExpanded: true, ratingTooltip: 'like' },
}
export const LongDirectorAndSynopsis: Story = {
  args: {
    ...SHORTS[3],
    image: backdrop,
    typeLabel: 'Animación',
    directedBy: 'Dirigido por Daniel Martínez Lara y Rafa Cano Méndez',
    synopsis: `${SHORTS[3]?.synopsis ?? ''} ${SHORTS[3]?.synopsis ?? ''}`,
  },
}
