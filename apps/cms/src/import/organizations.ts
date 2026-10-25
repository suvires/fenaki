/**
 * Imports the organizations CSV at CRM_IMPORT_PATH (outside this repository) into the sales CRM.
 * Idempotent: organizations are matched by name and website. Reads the file, copies nothing.
 * Run with `pnpm --filter @fenaki/cms import:organizations`.
 */
import config from '@payload-config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import { importOrganizations, parseOrganizationsCsv } from '../crm/organizationsImport.ts'
import { payloadStore } from '../crm/payloadStore.ts'

const payload = await getPayload({ config })
const log = (message: string) => payload.logger.info(`import: ${message}`)

const filePath = process.env.CRM_IMPORT_PATH
if (!filePath) {
  payload.logger.error('import: set CRM_IMPORT_PATH to the organizations CSV file')
  process.exit(1)
}
const rows = parseOrganizationsCsv(await readFile(path.resolve(filePath), 'utf8'))
log(`read ${rows.length} organizations`)

const summary = await importOrganizations(rows, payloadStore(payload))
log(
  `${summary.created} organizations created, ${summary.updated} updated, ${summary.contactsCreated} contacts created, ${summary.contactsSkipped} contacts already existed, ${summary.rowsSkipped} rows skipped`,
)
process.exit(0)
