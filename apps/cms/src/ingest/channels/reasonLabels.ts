import { label, type AdminLabel } from '../../labels.ts'
import type { LEDGER_SKIP_REASONS } from '../../collections/ScannedVideos.ts'

/** Why a scanned video was left out, in the panel's two languages. */
export const skipReasonLabels = {
  duplicate: label('Already in the catalog', 'Ya está en el catálogo'),
  private: label('Private', 'Privado'),
  'not-embeddable': label('Embedding disabled', 'Inserción desactivada'),
  'age-restricted': label('Age restricted', 'Restringido por edad'),
  unavailable: label('Unavailable', 'No disponible'),
  'unknown-duration': label('Running time unknown', 'Duración desconocida'),
  'too-short': label('Too short', 'Demasiado corto'),
  'too-long': label('Too long', 'Demasiado largo'),
  'not-a-short': label('Trailer, clip or similar', 'Tráiler, clip o similar'),
  'not-in-catalog-language': label(
    'Not in a catalog language',
    'No está en un idioma del catálogo',
  ),
  failed: label('Could not be checked or saved', 'No se pudo comprobar o guardar'),
} satisfies Record<(typeof LEDGER_SKIP_REASONS)[number], AdminLabel>
