import { createRichTranslator, createTranslator, formatWeekday, type Locale } from '@fenaki/i18n'
import { SignupBand } from '@fenaki/ui'
import { NEWSLETTER_SCHEDULE } from '@fenaki/waitlist'
import { NEWSLETTER_ANCHOR, paths } from '../lib/i18n.ts'
import { WaitlistForm } from './WaitlistForm.tsx'

interface NewsletterSignupProps {
  locale: Locale
}

/** The weekly selection's signup, above the footer of every catalog page. */
export function NewsletterSignup({ locale }: NewsletterSignupProps) {
  const t = createTranslator(locale)
  const note = createRichTranslator(locale)('newsletter.privacy', {
    privacyPolicy: {
      href: paths.legal(locale, 'privacidad'),
      label: t('legal.links.privacyPolicy'),
    },
  })
  return (
    <SignupBand
      id={NEWSLETTER_ANCHOR}
      title={t('newsletter.title')}
      text={t('newsletter.text', { weekday: formatWeekday(NEWSLETTER_SCHEDULE.weekday, locale) })}
      note={note.map((piece, index) =>
        typeof piece === 'string' ? (
          piece
        ) : (
          <a
            key={index}
            href={piece.href}
            className="text-accent underline underline-offset-4 hover:no-underline rounded-xs focus-visible:focus-ring"
          >
            {piece.label}
          </a>
        ),
      )}
    >
      <WaitlistForm locale={locale} kind="weekly" />
    </SignupBand>
  )
}
