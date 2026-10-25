import type { TaskConfig } from 'payload'
import { searchClient } from '../search/client.ts'
import {
  SHORTS_INDEX_SETTINGS,
  shortsIndexName,
  toSearchDocument,
  type IndexableShort,
} from '../search/document.ts'

const configuredIndexes = new Set<string>()

/**
 * Syncs one short to the search index of every locale: upserts it when published,
 * removes it otherwise (draft, withdrawn or deleted).
 */
export const indexShortTask: TaskConfig<{
  input: { shortId: number }
  output: { action: string }
}> = {
  slug: 'indexShort',
  label: 'Index short in Meilisearch',
  retries: 3,
  inputSchema: [{ name: 'shortId', type: 'number', required: true }],
  outputSchema: [{ name: 'action', type: 'text', required: true }],
  handler: async ({ input, req }) => {
    const { payload } = req
    const locales = payload.config.localization ? payload.config.localization.localeCodes : ['es']
    const meili = searchClient()
    const actions: string[] = []

    for (const locale of locales) {
      const uid = shortsIndexName(locale)
      const index = meili.index(uid)
      if (!configuredIndexes.has(uid)) {
        const exists = await meili.getIndex(uid).then(
          () => true,
          () => false,
        )
        if (!exists) await meili.createIndex(uid, { primaryKey: 'id' }).waitTask()
        await index.updateSettings(SHORTS_INDEX_SETTINGS).waitTask()
        configuredIndexes.add(uid)
      }

      const short = await payload
        .findByID({
          collection: 'shorts',
          id: input.shortId,
          locale: locale as 'es',
          depth: 2,
          overrideAccess: true,
          disableErrors: true,
          req,
        })
        .catch(() => null)

      if (short && short.status === 'published') {
        await index.addDocuments([toSearchDocument(short as IndexableShort)]).waitTask()
        actions.push(`${locale}:upsert`)
      } else {
        await index.deleteDocument(input.shortId).waitTask()
        actions.push(`${locale}:delete`)
      }
    }

    return { output: { action: actions.join(',') } }
  },
}
