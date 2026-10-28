import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Dialog, ShortGrid, type ShortCardProps } from '@fenaki/ui'
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
    // The pager is the server's: back to the first page, which now says the history is empty.
    else if (window.location.search) window.location.replace(window.location.pathname)
  }

  if (items.length === 0)
    return <p className="m-0 text-body-l text-secondary">{t('account.history.empty')}</p>

  return (
    <div className="grid gap-6">
      <div>
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          {t('account.history.clear')}
        </Button>
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('account.history.clearConfirm')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t('account.history.clearNo')}
            </Button>
            <Button onClick={clear}>{t('account.history.clearYes')}</Button>
          </>
        }
      >
        <p className="m-0">{t('account.history.clearText')}</p>
      </Dialog>
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
