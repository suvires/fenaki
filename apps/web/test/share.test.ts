import { describe, expect, it } from 'vitest'
import { shareTargets } from '../src/lib/share.ts'

describe('shareTargets', () => {
  const url = 'https://fenaki.tv/es/cortos/timecode'
  const targets = shareTargets(url, 'Mira «Timecode» en FENAKI', (network) => network)

  it('gives a share link per network and app, with the address and text encoded', () => {
    expect(targets.map((target) => target.label)).toEqual([
      'whatsapp',
      'telegram',
      'x',
      'facebook',
      'bluesky',
      'threads',
      'linkedin',
      'email',
    ])
    const whatsapp = new URL(targets[0]?.href ?? '')
    expect(whatsapp.origin).toBe('https://wa.me')
    expect(whatsapp.searchParams.get('text')).toBe(`Mira «Timecode» en FENAKI ${url}`)
    expect(new URL(targets[3]?.href ?? '').searchParams.get('u')).toBe(url)
    expect(targets[7]?.href.startsWith('mailto:?subject=')).toBe(true)
  })

  it('adds the attributes of each link when asked', () => {
    const withEvents = shareTargets(url, 'texto', String, (network) => ({
      'data-umami-event': 'share',
      'data-umami-event-network': network,
    }))
    expect(withEvents[2]?.attributes).toEqual({
      'data-umami-event': 'share',
      'data-umami-event-network': 'x',
    })
  })
})
