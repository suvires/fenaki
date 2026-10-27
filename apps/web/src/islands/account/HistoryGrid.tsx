import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, ShortGrid, type ShortCardProps } from '@fenaki/ui'
import { useState } from 'react'
import { api } from '../../lib/accountClient.ts'

interface HistoryGridProps {
  locale: Locale
  /** The viewings, newest first, as cards with their progress. */
  items: (Omit<ShortCardProps, 'stretch'> & { slug: string })[]
}

/**
 * The history: everything the member watched, newest first, with a way to remove one item or all
 * of them. Changes show at once; one that fails is put back.
 */
export function HistoryGrid({ locale, items: initial }: HistoryGridProps) {
  const t = createTranslator(locale)
  const [items, setItems] = useState(initial)
  const [confirming, setConfirming] = useState(false)

  async function remove(slug: string) {
    const before = items
    setItems(items.filter((item) => item.slug !== slug))
    const result = await api('viewings', 'DELETE', { slug, locale })
    if (!result.ok) setItems(before)
  }

  async function clear() {
    const before = items
    setConfirming(false)
    setItems([])
    const result = await api('viewings', 'DELETE', { all: true })
    if (!result.ok) setItems(before)
  }

  if (items.length === 0)
    return <p className="m-0 text-body-l text-secondary">{t('account.history.empty')}</p>

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <span role="status" className="text-secondary">
              {t('account.history.clearConfirm')}
            </span>
            <Button size="sm" onClick={clear}>
              {t('account.history.clearYes')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t('account.history.clearNo')}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            {t('account.history.clear')}
          </Button>
        )}
      </div>
      <ShortGrid
        items={items}
        footer={(item) => (
          <div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('account.history.removeNamed', { title: item.title })}
              onClick={() => remove((item as { slug: string }).slug)}
            >
              {t('account.history.remove')}
            </Button>
          </div>
        )}
      />
    </div>
  )
}
