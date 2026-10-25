/**
 * A per-key limit on requests in a sliding window, in memory. It only slows down abuse of the
 * waitlist form (sending confirmation emails to many addresses); nothing is persisted.
 */
export function createRateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 10_000) {
      for (const [k, times] of hits)
        if (times.every((time) => now - time >= windowMs)) hits.delete(k)
    }
    return true
  }
}
