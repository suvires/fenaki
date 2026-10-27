import type { Preview } from '@storybook/react-vite'
import './storybook.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i } },
    // Brad Frost's levels, smallest first; page compositions last.
    options: {
      storySort: { order: ['Foundations', 'Atoms', 'Molecules', 'Organisms', 'Pages'] },
    },
  },
  tags: ['autodocs'],
}

export default preview
