import type { Locale } from '@fenaki/i18n'
import { useEffect } from 'react'
import { SIGNED_OUT_EVENT } from '../../lib/accountClient.ts'
import { hasLocalData, mergeLocalIntoAccount } from '../../lib/accountSync.ts'

/**
 * On every page of a signed-in viewer: merges what the browser kept from before they signed in
 * (it normally happened at sign-in; this catches a verification link opened while signed in, or a
 * merge that failed), and reloads when the session turns out to be over.
 */
export function AccountSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    const signedOut = () => window.location.reload()
    window.addEventListener(SIGNED_OUT_EVENT, signedOut)
    if (hasLocalData())
      void mergeLocalIntoAccount(locale).then((merged) => {
        // The page was rendered without it: show the merged list and ratings.
        if (merged) window.location.reload()
      })
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut)
  }, [locale])
  return null
}
