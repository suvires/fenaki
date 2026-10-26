import type { Meta, StoryObj } from '@storybook/react-vite'
import { Prose } from '../components/Prose.tsx'

const meta = {
  title: 'Content/Prose',
  component: Prose,
  args: {
    children: (
      <>
        <h1>Aviso legal</h1>
        <p>Última actualización: [FECHA DE PUBLICACIÓN]</p>
        <h2>1. Titularidad</h2>
        <p>
          El sitio web <strong>fenaki.tv</strong> es titularidad de:
        </p>
        <table>
          <thead>
            <tr>
              <th>Dato</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Titular</td>
              <td>[NOMBRE Y APELLIDOS]</td>
            </tr>
            <tr>
              <td>Correo electrónico de contacto</td>
              <td>[CORREO DE CONTACTO]</td>
            </tr>
          </tbody>
        </table>
        <h3>4.3 Si crees que un contenido infringe tus derechos</h3>
        <p>
          Consulta el <a href="#">procedimiento de retirada de contenidos</a>. Respondemos en un
          plazo máximo de 48 horas.
        </p>
        <ul>
          <li>
            Uso de <code>localStorage</code> para recordar preferencias.
          </li>
          <li>Ninguna cookie de analítica.</li>
        </ul>
      </>
    ),
  },
} satisfies Meta<typeof Prose>

export default meta
type Story = StoryObj<typeof meta>

export const LegalPage: Story = {}
