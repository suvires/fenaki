import { ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { Showcases } from '../src/collections/Showcases.ts'

interface FakeShort {
  id: number
  title: string
  official: boolean
  license?: string
  branded?: boolean
}

/**
 * Answers the three queries the showcase rules make: official sources, sources with their
 * license, and shorts by id (optionally only branded ones).
 */
type Where = Record<string, { in?: number[] } | undefined>

function fakeRequest(shorts: FakeShort[]) {
  const find = async ({ collection, where }: { collection: string; where: Where }) => {
    const ids = (where.short ?? where.id)?.in ?? []
    const picked = shorts.filter((s) => ids.includes(s.id))
    if (collection === 'sources' && where['channel.name'])
      return { docs: picked.filter((s) => s.official).map((s) => ({ short: s.id })) }
    if (collection === 'sources')
      return {
        docs: picked.map((s) => ({
          short: s.id,
          license: { type: s.license ?? 'platform-terms' },
        })),
      }
    const branded = where.brandedContent ? picked.filter((s) => s.branded) : picked
    return { docs: branded.map((s) => ({ id: s.id, title: s.title })) }
  }
  return { payload: { find }, i18n: { language: 'es' } } as unknown as PayloadRequest
}

const validate = async (data: Record<string, unknown>, shorts: FakeShort[]) => {
  const hook = Showcases.hooks?.beforeValidate?.[0]
  if (!hook) throw new Error('no hook')
  return hook({ data, req: fakeRequest(shorts) } as never)
}

const messagesOf = async (promise: Promise<unknown>) => {
  try {
    await promise
    return []
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    return error.data.errors.map((e) => `${e.path}: ${e.message}`)
  }
}

const official: FakeShort = { id: 1, title: 'Cuerdas', official: true }

describe('showcase rules', () => {
  it('accepts shorts on official channels', async () => {
    expect(await messagesOf(validate({ kind: 'school', shorts: [1] }, [official]))).toEqual([])
  })

  it('rejects shorts with no official channel on record, and NC ones', async () => {
    const shorts = [
      official,
      { id: 2, title: 'Subida pirata', official: false },
      { id: 3, title: 'Libre', official: true, license: 'cc-by-nc' },
    ]
    const errors = await messagesOf(validate({ kind: 'school', shorts: [1, 2, 3] }, shorts))
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/canales oficiales.*Subida pirata$/)
    expect(errors[1]).toMatch(/no comercial.*Libre$/)
  })

  it('rejects branded shorts only when someone presents the showcase', async () => {
    const shorts = [{ ...official, branded: true }]
    expect(await messagesOf(validate({ kind: 'school', shorts: [1] }, shorts))).toEqual([])
    expect(
      await messagesOf(validate({ kind: 'school', shorts: [1], presentedBy: 9 }, shorts)),
    ).toEqual([expect.stringMatching(/^shorts: .*contenido de marca/)])
  })

  it('publishes a festival showcase only once nothing is on the circuit', async () => {
    const festival = { kind: 'festival', shorts: [1], status: 'published' }
    expect(await messagesOf(validate(festival, [official]))).toEqual([
      expect.stringMatching(/^offCircuitConfirmed: /),
    ])
    expect(
      await messagesOf(validate({ ...festival, offCircuitConfirmed: true }, [official])),
    ).toEqual([])
    expect(await messagesOf(validate({ ...festival, status: 'draft' }, [official]))).toEqual([])
  })
})
