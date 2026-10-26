/**
 * When a visitor who kept a list and ratings in this browser signs in, those are added to the
 * account (the account wins where both have something) and the browser's copy is cleared.
 */
import { api } from './accountClient.ts'
import { clearLocal as clearLocalList, readLocal as readLocalList } from './myList.ts'
import { clearLocal as clearLocalRatings, readLocal as readLocalRatings } from './myRatings.ts'

/** Whether this browser holds anything to merge. */
export function hasLocalData(): boolean {
  return readLocalList().length > 0 || Object.keys(readLocalRatings()).length > 0
}

/**
 * Sends the browser's list and ratings to the account and forgets them here once the server has
 * them. Returns whether the browser has nothing left to merge.
 */
export async function mergeLocalIntoAccount(locale: string): Promise<boolean> {
  if (!hasLocalData()) return true
  const result = await api('merge', 'POST', {
    list: readLocalList().map(({ slug, savedAt }) => ({ slug, savedAt })),
    ratings: readLocalRatings(),
    locale,
  })
  if (!result.ok) return false
  clearLocalList()
  clearLocalRatings()
  return true
}
