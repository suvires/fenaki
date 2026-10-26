import { postgresAdapter } from '@payloadcms/db-postgres'
import { es } from '@payloadcms/translations/languages/es'
import { en } from '@payloadcms/translations/languages/en'
import { defaultLocale, locales } from '@fenaki/i18n'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Contacts } from './collections/Contacts.ts'
import { InboxState } from './collections/InboxState.ts'
import { HomePage } from './collections/HomePage.ts'
import { Ranking } from './collections/Ranking.ts'
import { Ratings } from './collections/Ratings.ts'
import { Messages } from './collections/Messages.ts'
import { Organizations } from './collections/Organizations.ts'
import { Collections } from './collections/Collections.ts'
import { LicenseDocuments } from './collections/LicenseDocuments.ts'
import { Licenses } from './collections/Licenses.ts'
import { ListItems } from './collections/ListItems.ts'
import { Members } from './collections/Members.ts'
import { Media } from './collections/Media.ts'
import { People } from './collections/People.ts'
import { Shorts } from './collections/Shorts.ts'
import { Showcases } from './collections/Showcases.ts'
import { Sources } from './collections/Sources.ts'
import { Sponsors } from './collections/Sponsors.ts'
import { Stills } from './collections/Stills.ts'
import { Users } from './collections/Users.ts'
import { Viewings } from './collections/Viewings.ts'
import { emailAdapter } from './email.ts'
import { checkEmbedsTask } from './jobs/checkEmbeds.ts'
import { computeRankingTask } from './jobs/computeRanking.ts'
import { indexShortTask } from './jobs/indexShort.ts'
import { purgeWaitlistTask } from './jobs/purgeWaitlist.ts'
import { syncInboxTask } from './jobs/syncInbox.ts'
import { initSentry, reportApiError } from './sentry.ts'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET ?? '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · FENAKI' },
    components: {
      afterNavLinks: [
        '/admin/TodayLink.tsx#TodayLink',
        '/admin/EmbedProblemsLink.tsx#EmbedProblemsLink',
      ],
      views: {
        embedProblems: {
          Component: '/admin/EmbedProblems.tsx#EmbedProblems',
          path: '/embed-problems',
        },
        today: {
          Component: '/admin/Today.tsx#Today',
          path: '/today',
        },
      },
    },
  },
  i18n: { supportedLanguages: { es, en }, fallbackLanguage: 'es' },
  // Content locales come from @fenaki/i18n: adding `en` there enables it here.
  localization: {
    locales: locales.map((code) => ({
      code,
      label: new Intl.DisplayNames(code, { type: 'language' }).of(code) ?? code,
    })),
    defaultLocale,
    fallback: true,
  },
  collections: [
    Shorts,
    Sources,
    People,
    Collections,
    Showcases,
    Media,
    Stills,
    Licenses,
    LicenseDocuments,
    Sponsors,
    Organizations,
    Contacts,
    Messages,
    Users,
    Members,
    ListItems,
    Ratings,
    Viewings,
  ],
  globals: [InboxState, HomePage, Ranking],
  cors: [process.env.WEB_URL ?? 'http://localhost:4321'],
  // The schema changes only through migrations (`pnpm migrate`), in development too, so the
  // first deployment runs exactly what was tested locally.
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // Jobs run in a separate process (`pnpm --filter @fenaki/cms jobs`), never inside the web server.
  jobs: {
    tasks: [indexShortTask, purgeWaitlistTask, checkEmbedsTask, computeRankingTask, syncInboxTask],
    deleteJobOnComplete: true,
  },
  // SMTP (Amazon SES in production) when SMTP_HOST is set; otherwise emails go to the console.
  email: emailAdapter(),
  // Sentry when SENTRY_DSN is set, in every process that loads Payload: the admin server, the jobs
  // worker and the CLI.
  onInit: () => initSentry(),
  hooks: { afterError: [reportApiError] },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  sharp,
  telemetry: false,
})
