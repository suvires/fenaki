import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { CollectionHero } from '../components/CollectionHero.tsx'
import { Duration } from '../components/Duration.tsx'
import { FilterChips } from '../components/FilterChips.tsx'
import { LicenseNote } from '../components/LicenseNote.tsx'
import { PlayerGate } from '../components/PlayerGate.tsx'
import { Rail } from '../components/Rail.tsx'
import { SearchField } from '../components/SearchField.tsx'
import { ShortCard } from '../components/ShortCard.tsx'
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
        <strong className="font-display text-title uppercase">Fenaki</strong>
        <SearchField label="Buscar cortos" placeholder="Título, director o tema" />
      </div>
      <CollectionHero
        eyebrow="Colección · 6 cortos"
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
    <main className="grid gap-6 p-6 max-w-article">
      <PlayerGate
        title="Timecode"
        message="Este corto se reproduce desde YouTube. Al darle a reproducir, YouTube puede guardar cookies en tu navegador."
        playLabel="Ver ahora"
        moreLabel="Más sobre las cookies"
        moreHref="#"
        loadedLabel="Aquí se carga el reproductor de YouTube"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Duration seconds={900} />
        <Badge>Ficción</Badge>
        <Badge tone="info">Sub ES</Badge>
        <span className="text-meta text-ink-muted">España · 2016</span>
      </div>
      <p className="m-0 max-w-synopsis text-body-l">
        Luna y Diego son los vigilantes de un aparcamiento. Ella trabaja de día y él de noche, y
        solo se cruzan en el cambio de turno.
      </p>
      <p className="m-0 text-ink-muted">Dirigido por Juanjo Giménez</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon="plus">
          Añadir a mi lista
        </Button>
      </div>
      <LicenseNote route="embed" routeLabel="Embed oficial">
        Se reproduce desde el canal de YouTube de su productora. Fenaki no aloja ni modifica el
        corto.
      </LicenseNote>
      <Rail title="Si te ha gustado" actionLabel="Ver todo" actionHref="#">
        {SHORTS.slice(1).map((s) => (
          <ShortCard key={s.title} {...s} href="#" />
        ))}
      </Rail>
    </main>
  ),
}
