import Anthropic from '@anthropic-ai/sdk'
import type { PayloadRequest } from 'payload'
import type { Channel, Short, Source } from '../payload-types.ts'
import { slugify } from '../fields/slug.ts'
import { shortLanguageFields } from '../ingest/languages.ts'
import { reviewText, SYSTEM_PROMPT, thumbnailUrl, type ReviewInput } from './prompt.ts'
import { parseReview, REVIEW_SCHEMA, type ShortReview } from './schema.ts'

/** Opus 5.5 by default: reading a description, a thumbnail and the rules well is the whole job. */
export const DEFAULT_MODEL = 'claude-opus-5-5'
const MAX_TOKENS = 8000

/** The slice of the SDK the review uses, so tests can stand in for the API. */
export interface ReviewClient {
  messages: Pick<Anthropic['messages'], 'create'> & {
    batches: Pick<Anthropic['messages']['batches'], 'create' | 'retrieve' | 'results'>
  }
}

/** The feature is off without a key; everything else in the CMS works. */
export const aiConfigured = (env: Record<string, string | undefined> = process.env) =>
  Boolean(env.ANTHROPIC_API_KEY)

export const reviewModel = (env: Record<string, string | undefined> = process.env) =>
  env.AI_REVIEW_MODEL || DEFAULT_MODEL

/** The SDK client, or null without a key. It retries 429 and 5xx twice by itself. */
export function reviewClient(env: Record<string, string | undefined> = process.env) {
  return env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null
}

type Params = Anthropic.MessageCreateParamsNonStreaming

/** Request parameters for one short. No `temperature`: the 5.x models reject sampling controls. */
export function reviewParams(input: ReviewInput, model = reviewModel(), withImage = true): Params {
  const image = withImage ? thumbnailUrl(input.source) : null
  return {
    model,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: REVIEW_SCHEMA as unknown as Record<string, unknown> },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...(image
            ? [{ type: 'image' as const, source: { type: 'url' as const, url: image } }]
            : []),
          { type: 'text' as const, text: reviewText(input) },
        ],
      },
    ],
  }
}

/** What reading one response comes to. */
export type Reviewed =
  | { kind: 'review'; review: ShortReview }
  /** The model declined (`stop_reason: refusal`): an editor looks at it. */
  | { kind: 'refused'; category: string | null; explanation: string | null }
  /** Cut off or malformed: nothing usable. */
  | { kind: 'unusable'; reason: string }

export interface Usage {
  input: number
  output: number
  cacheRead: number
}

export const noUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0 })

export function addUsage(total: Usage, message: Pick<Anthropic.Message, 'usage'>) {
  total.input += message.usage.input_tokens
  total.output += message.usage.output_tokens
  total.cacheRead += message.usage.cache_read_input_tokens ?? 0
}

/** Reads a response: the review, a refusal, or why it is not usable. */
export function readResponse(message: Anthropic.Message): Reviewed {
  if (message.stop_reason === 'refusal') {
    const details = message.stop_details
    return {
      kind: 'refused',
      category: details?.category ?? null,
      explanation: details?.explanation ?? null,
    }
  }
  if (message.stop_reason === 'max_tokens')
    return { kind: 'unusable', reason: 'The answer was cut off at the token limit.' }
  const block = message.content.find((part) => part.type === 'text')
  const review = block?.type === 'text' ? parseReview(block.text) : null
  return review
    ? { kind: 'review', review }
    : { kind: 'unusable', reason: 'The answer did not match the schema.' }
}

/**
 * Asks Claude about one short. Transient API errors (rate limit, 5xx, network) are thrown for the
 * job to retry; a request the API rejects is returned as unusable. If the thumbnail cannot be
 * fetched the request is repeated without it.
 */
export async function askForReview(
  client: ReviewClient,
  input: ReviewInput,
  usage: Usage = noUsage(),
): Promise<Reviewed> {
  const attempt = async (withImage: boolean) => {
    const message = await client.messages.create(reviewParams(input, reviewModel(), withImage))
    addUsage(usage, message)
    return readResponse(message)
  }
  try {
    return await attempt(true)
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError && thumbnailUrl(input.source)) {
      try {
        return await attempt(false)
      } catch (second) {
        return failure(second)
      }
    }
    return failure(error)
  }
}

/** Retryable errors are rethrown; the rest end the attempt with a note. */
function failure(error: unknown): Reviewed {
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError
  )
    throw error
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  )
    return { kind: 'unusable', reason: 'The Anthropic key was not accepted.' }
  if (error instanceof Anthropic.NotFoundError)
    return { kind: 'unusable', reason: `The model ${reviewModel()} was not found.` }
  if (error instanceof Anthropic.APIError)
    return { kind: 'unusable', reason: `The API answered ${error.status}: ${error.message}` }
  throw error
}

const idOf = (ref: number | { id: number } | null | undefined) =>
  ref && typeof ref === 'object' ? ref.id : (ref ?? undefined)

/** Gathers what the model is told about a short: its first source, channel and license. */
export async function loadReviewInput(
  req: PayloadRequest,
  shortId: number,
): Promise<{ short: Short; input: ReviewInput } | null> {
  const short = await req.payload
    .findByID({ collection: 'shorts', id: shortId, locale: 'es', depth: 0, req })
    .catch(() => null)
  if (!short) return null
  const sources = await req.payload.find({
    collection: 'sources',
    where: { short: { equals: shortId } },
    depth: 1,
    limit: 1,
    sort: 'id',
    req,
  })
  const source = sources.docs[0]
  if (!source) return null
  const channelId = idOf(source.ingestChannel) ?? idOf(short.ingestChannel)
  const channel = channelId
    ? ((await req.payload
        .findByID({ collection: 'channels', id: channelId, depth: 0, req })
        .catch(() => null)) as Channel | null)
    : null
  const license = typeof source.license === 'object' ? source.license : null
  return {
    short,
    input: {
      short,
      source: source as Source,
      channel,
      licenseNote: license
        ? `${license.name} (route: ${license.route}${license.type ? `, type: ${license.type}` : ''})`
        : null,
    },
  }
}

/** The group's fields from a review, as Payload stores them. */
export function reviewData(review: ShortReview, model: string) {
  return {
    status: 'analyzed' as const,
    analyzedAt: new Date().toISOString(),
    model,
    batchId: null,
    error: null,
    recommendation: review.recommendation,
    reason: review.reason,
    isCompleteShort: review.isCompleteShort,
    notCompleteReason: review.notCompleteReason,
    spokenLanguage: review.spokenLanguage,
    spokenLanguageOther: review.spokenLanguageOther,
    spanishSubtitles: review.spanishSubtitles,
    title: review.title,
    year: review.year,
    country: review.country,
    credits: review.credits,
    genre: review.genre,
    technique: review.technique,
    brandedContent: review.brandedContent,
    brand: review.brand,
    restrictions: review.restrictions,
    reuploadSigns: review.reuploadSigns,
    synopsis: review.synopsis,
  }
}

/** Saves the outcome on the short: the proposal, or a note saying why there is none. */
export async function storeReviewed(
  req: PayloadRequest,
  shortId: number,
  reviewed: Reviewed,
  model = reviewModel(),
): Promise<void> {
  const now = new Date().toISOString()
  const aiReview =
    reviewed.kind === 'review'
      ? reviewData(reviewed.review, model)
      : reviewed.kind === 'refused'
        ? {
            status: 'refused' as const,
            analyzedAt: now,
            model,
            batchId: null,
            recommendation: 'needs-human' as const,
            reason: 'The model declined to analyse this video.',
            error: [reviewed.category, reviewed.explanation].filter(Boolean).join(': ') || null,
          }
        : {
            status: 'failed' as const,
            analyzedAt: now,
            model,
            batchId: null,
            recommendation: 'needs-human' as const,
            reason: 'The analysis did not produce a usable answer.',
            error: reviewed.reason,
          }
  await req.payload.update({ collection: 'shorts', id: shortId, data: { aiReview }, req })
}

/** Analyses one short with a normal request and stores the result. Returns it. */
export async function analyzeShort(
  req: PayloadRequest,
  shortId: number,
  client: ReviewClient | null = reviewClient(),
): Promise<Reviewed | null> {
  if (!client) return null
  const loaded = await loadReviewInput(req, shortId)
  if (!loaded) return null
  const usage = noUsage()
  const reviewed = await askForReview(client, loaded.input, usage)
  await storeReviewed(req, shortId, reviewed)
  req.payload.logger.info(
    `aiReview: «${loaded.short.title}» → ${reviewed.kind === 'review' ? reviewed.review.recommendation : reviewed.kind} (${usage.input} in, ${usage.output} out, ${usage.cacheRead} cached tokens)`,
  )
  return reviewed
}

/** A slug no other person uses: «ana-ruiz», then «ana-ruiz-2». */
async function freePersonSlug(req: PayloadRequest, name: string): Promise<string> {
  const base = slugify(name) || 'persona'
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const taken = await req.payload.count({
      collection: 'people',
      where: { slug: { equals: slug } },
      req,
    })
    if (taken.totalDocs === 0) return slug
  }
}

const emptyText = (value: string | null | undefined) => !value || !value.trim()

/** The field names an apply filled, for the button to report. */
export type Applied = string[]

/**
 * Copies the proposal into the short's own fields, only where they are empty: an editor's value
 * is never replaced. The spoken language is the one exception for a guess (the channel's default,
 * or nothing): the proposal replaces a value nobody chose. People are matched by name or created.
 */
export async function applyReview(req: PayloadRequest, shortId: number): Promise<Applied | null> {
  const { payload } = req
  const short = await payload
    .findByID({ collection: 'shorts', id: shortId, locale: 'es', depth: 0, req })
    .catch(() => null)
  const proposal = short?.aiReview
  if (!short || !proposal || proposal.status !== 'analyzed') return null

  const applied: Applied = []
  const data: Record<string, unknown> = {}
  const fill = (field: string, value: unknown) => {
    data[field] = value
    applied.push(field)
  }

  if (emptyText(short.synopsis) && !emptyText(proposal.synopsis))
    fill('synopsis', proposal.synopsis)
  if (short.year == null && proposal.year != null) fill('year', proposal.year)
  if (emptyText(short.country) && proposal.country) fill('country', proposal.country)
  if (!short.type) {
    const type = proposal.technique === 'animation' ? 'animation' : proposal.genre
    if (type) fill('type', type)
  }

  const guessed =
    !short.originalLanguage || !short.languageSource || short.languageSource === 'channel'
  const spoken =
    proposal.spokenLanguage === 'es'
      ? ['es']
      : proposal.spokenLanguage === 'none'
        ? ['zxx']
        : proposal.spokenLanguageOther
          ? [proposal.spokenLanguageOther]
          : []
  if (guessed && spoken.length > 0 && short.languageSource !== 'provider') {
    const fields = shortLanguageFields(spoken)
    data.originalLanguage = fields.originalLanguage
    data.noDialogue = fields.noDialogue
    data.languageSource = 'ai'
    applied.push('originalLanguage')
  }

  if (proposal.brandedContent && !short.brandedContent) {
    data.brandedContent = true
    applied.push('brandedContent')
    if (emptyText(short.brand) && proposal.brand) data.brand = proposal.brand
  }

  if ((short.credits ?? []).length === 0 && (proposal.credits ?? []).length > 0) {
    const credits = []
    for (const credit of proposal.credits ?? []) {
      const found = await payload.find({
        collection: 'people',
        where: { name: { equals: credit.name } },
        limit: 1,
        depth: 0,
        req,
      })
      const person =
        found.docs[0] ??
        (await payload.create({
          collection: 'people',
          data: { name: credit.name, slug: await freePersonSlug(req, credit.name) },
          req,
        }))
      credits.push({ person: person.id, role: credit.role ?? 'director' })
    }
    fill('credits', credits)
  }

  if (applied.length > 0 || !proposal.appliedAt)
    await payload.update({
      collection: 'shorts',
      id: shortId,
      locale: 'es',
      data: { ...data, aiReview: { appliedAt: new Date().toISOString() } },
      req,
    })

  // Spanish subtitles the proposal found, on the first source, unless an editor wrote them.
  if (proposal.spanishSubtitles === 'yes') {
    const sources = await payload.find({
      collection: 'sources',
      where: { short: { equals: shortId } },
      depth: 0,
      limit: 1,
      sort: 'id',
      req,
    })
    const source = sources.docs[0]
    if (source && (source.subtitles ?? []).length === 0 && source.subtitlesSource !== 'editor') {
      await payload.update({
        collection: 'sources',
        id: source.id,
        data: { subtitles: ['es'], subtitlesSource: 'ai' },
        req,
      })
      applied.push('subtitles')
    }
  }
  return applied
}
