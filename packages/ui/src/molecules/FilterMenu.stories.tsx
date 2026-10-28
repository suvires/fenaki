import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilterMenu, FilterOptions } from './FilterMenu.tsx'

const genres = [
  { label: 'Drama', href: '?genre=drama', count: 412 },
  { label: 'Comedia', href: '?genre=comedy', count: 230, selected: true },
  { label: 'Terror', href: '?genre=horror', count: 96, selected: true },
  { label: 'Ciencia ficción', href: '?genre=science-fiction', count: 41 },
  { label: 'Musical y danza', href: '?genre=musical-dance', count: 0 },
]
const countLabel = (count: number) => `${count} cortos`

const meta = {
  title: 'Molecules/FilterMenu',
  component: FilterMenu,
  args: {
    id: 'filtro-genre',
    label: 'Género',
    children: <FilterOptions label="Género" options={genres} countLabel={countLabel} />,
  },
  // Room below for the open panel.
  decorators: [(Story) => <div className="min-h-[360px]">{Story()}</div>],
} satisfies Meta<typeof FilterMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}
export const WithChosenValues: Story = { args: { selected: 2 } }
export const Open: Story = { args: { selected: 2, defaultOpen: true } }
export const Sections: Story = {
  args: {
    id: 'filtro-more',
    label: 'Más filtros',
    selected: 1,
    defaultOpen: true,
    children: (
      <div className="grid gap-2">
        <FilterOptions
          label="Más filtros"
          options={[
            { label: 'Subtítulos en español', href: '?subs=es', count: 812 },
            { label: 'Sin diálogos', href: '?nodialogue=1', count: 133, selected: true },
            { label: 'Con premios', href: '?awards=1', count: 520 },
          ]}
          countLabel={countLabel}
        />
        <FilterOptions
          label="Década"
          heading
          options={[
            { label: '2020–2029', href: '?decade=2020', count: 2100 },
            { label: '2010–2019', href: '?decade=2010', count: 3400 },
          ]}
          countLabel={countLabel}
        />
      </div>
    ),
  },
}
