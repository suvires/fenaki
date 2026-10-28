import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Dialog, ShortGrid, type ShortCardProps } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { api } from '../../lib/accountClient.ts'
import { onRemovedFromHistory, removeFromHistory } from '../../lib/history.ts'

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

  // Removed from the card's preview (its aspa) or from the button under the card.
  useEffect(
    () =>
      onRemovedFromHistory((slug) =>
        setItems((before) => before.filter((item) => item.slug !== slug)),
      ),
    [],
  )

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
        items={items.map((item) => ({ ...item, removableFrom: 'history' as const }))}
        // Where there is no floating preview (touch screens), the card has the button under it.
        footer={(item) => (
          <div className="[@media(hover:hover)_and_(pointer:fine)]:hidden">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('account.history.removeNamed', { title: item.title })}
              onClick={() => void removeFromHistory((item as { slug: string }).slug, locale)}
            >
              {t('account.history.remove')}
            </Button>
          </div>
        )}
      />
    </div>
  )
}
