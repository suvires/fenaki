import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../atoms/Button.tsx'
import { CollectionHero } from '../organisms/CollectionHero.tsx'
import { FilterChips } from '../molecules/FilterChips.tsx'
import { PlayerGate } from '../organisms/PlayerGate.tsx'
import { Rail } from '../organisms/Rail.tsx'
import { SearchField } from '../atoms/SearchField.tsx'
import { ShortCard } from '../molecules/ShortCard.tsx'
import { SHORTS } from './fixtures.ts'

/** Showcases composed only from system components, as in design/system. Not components to import. */
const meta = {
  title: 'Pages',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Home: Story = {
  render: () => (
    <main className="grid gap-12 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="font-display text-title uppercase">FENAKI</strong>
        <SearchField label="Buscar cortos" placeholder="Título, director o tema" />
      </div>
      <CollectionHero
        eyebrow="6 cortos"
        title="Imprescindibles del corto español"
        description="Seis cortos que marcaron una época, en los canales de sus autores."
        ctaLabel="Ver la colección"
        ctaHref="#"
        secondaryLabel="Añadir a mi lista"
        sponsor={{ label: 'Presentada por', name: 'Festival de Cine Breve' }}
        posters={SHORTS.slice(0, 3).map(({ title, director, year, tone }) => ({
          title,
          director,
          year,
          tone,
        }))}
      />
      <FilterChips
        label="Duración"
        options={[
          { value: 'short', label: 'Menos de 5 min' },
          { value: 'mid', label: 'De 5 a 15 min' },
          { value: 'long', label: 'Más de 15 min' },
          { value: 'subtitles', label: 'Con subtítulos en español' },
        ]}
      />
      <Rail title="Novedades" actionLabel="Ver todo" actionHref="#">
        {SHORTS.map((s) => (
          <ShortCard key={s.title} {...s} href="#" />
        ))}
      </Rail>
      <Rail title="Animación en menos de 10 minutos" actionLabel="Ver todo" actionHref="#">
        {[...SHORTS].reverse().map((s) => (
          <ShortCard key={s.title} {...s} href="#" />
        ))}
      </Rail>
    </main>
  ),
}

export const Short: Story = {
  render: () => (
    <main className="grid gap-8 p-6 max-w-page">
      <PlayerGate
        title="Timecode"
        playLabel="Ver ahora"
        loadedLabel="Aquí se carga el reproductor de YouTube"
        hero={{
          seconds: 900,
          details: ['2016', 'España', 'Ficción'],
          directedBy: ['Dirigido por ', { label: 'Juanjo Giménez', href: '#' }],
          synopsis:
            'Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día y él de noche, y solo se cruzan en el cambio de turno.',
          clampSynopsis: false,
          poster: { title: 'Timecode', director: 'Juanjo Giménez', year: 2016, tone: 'tungsteno' },
          secondaryAction: (
            <Button variant="secondary" size="lg" icon="plus">
              Añadir a mi lista
            </Button>
          ),
        }}
      />
      <Rail title="Si te ha gustado «Timecode»" actionLabel="Ver todo" actionHref="#">
        {SHORTS.slice(1).map((s) => (
          <ShortCard key={s.title} {...s} href="#" />
        ))}
      </Rail>
    </main>
  ),
}
