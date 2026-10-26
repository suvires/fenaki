/** Whether text over a still is light (the still is dark) or dark (the still is light). */
export type StillTextColor = 'light' | 'dark'

/** The text color class for text laid over a still. */
export const stillTextClass = (color: StillTextColor | undefined) =>
  color === 'dark' ? 'text-ink-inverse' : 'text-ink'
