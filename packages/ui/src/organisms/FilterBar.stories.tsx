import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilterBar } from './FilterBar.tsx'

const meta = {
  title: 'Organisms/FilterBar',
  component: FilterBar,
  args: {
    label: 'Filtros',
    countLabel: (count: number) => `${count} cortos`,
    groups: [
      {
        key: 'genre',
        label: 'Género',
        options: [
          { label: 'Drama', href: '?genre=drama', count: 412 },
          { label: 'Terror', href: '?', count: 96, selected: true },
        ],
      },
      {
        key: 'theme',
        label: 'Tema',
        options: [{ label: 'Familia', href: '?theme=family', count: 120 }],
      },
      {
        key: 'duration',
        label: 'Duración',
        options: [
          { label: 'Menos de 5 min', href: '?duration=short', count: 17 },
          { label: 'De 5 a 15 min', href: '?duration=mid', count: 32 },
        ],
      },
      {
        key: 'type',
        label: 'Tipo',
        options: [{ label: 'Ficción', href: '?type=fiction', count: 300 }],
      },
      {
        key: 'lang',
        label: 'Idioma',
        options: [{ label: 'Español', href: '?lang=es', count: 800 }],
      },
      {
        key: 'country',
        label: 'País',
        options: [{ label: 'México', href: '?country=MX', count: 90 }],
      },
    ],
    more: {
      label: 'Más filtros',
      toggles: {
        key: 'toggles',
        label: 'Más filtros',
        options: [{ label: 'Con premios', href: '?awards=1', count: 52 }],
      },
      groups: [
        {
          key: 'decade',
          label: 'Década',
          options: [{ label: '2020–2029', href: '?decade=2020', count: 70 }],
        },
      ],
    },
    sort: {
      label: 'Orden',
      name: 'Orden: Últimos añadidos',
      options: [
        { label: 'Últimos añadidos', href: '?', selected: true },
        { label: 'Año de producción', href: '?sort=year' },
        { label: 'Más cortos primero', href: '?sort=shortest' },
      ],
    },
    sheet: {
      button: 'Filtros',
      title: 'Filtros',
      selected: 1,
      results: { label: 'Ver 96 cortos', href: '?genre=horror' },
      closeLabel: 'Cerrar',
    },
  },
} satisfies Meta<typeof FilterBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
