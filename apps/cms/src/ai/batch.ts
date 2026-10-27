import type { PayloadRequest } from 'payload'
import {
  addUsage,
  loadReviewInput,
  noUsage,
  readResponse,
  reviewModel,
  reviewParams,
  storeReviewed,
  type ReviewClient,
  type Usage,
} from './review.ts'

/** The most shorts one nightly batch takes, so a surprise backlog costs a bounded amount. */
export const BATCH_LIMIT = 500

const customId = (shortId: number) => `short-${shortId}`
const shortIdOf = (id: string) => {
  const match = /^short-(\d+)$/.exec(id)
  return match ? Number(match[1]) : null
}

export interface BatchSummary {
  submitted: number
  collected: number
  pending: number
  usage: Usage
}

/** Frees a short from a batch that will never answer, so the next run submits it again. */
const release = (req: PayloadRequest, shortId: number) =>
  req.payload.update({
    collection: 'shorts',
    id: shortId,
    data: { aiReview: { status: null, batchId: null } },
    req,
  })

/**
 * Reads the batches submitted on earlier nights: the ones that ended are stored on their shorts,
 * the others wait. Half price, in exchange for waiting up to a day.
 */
export async function collectBatches(
  req: PayloadRequest,
  client: ReviewClient,
  summary: BatchSummary,
): Promise<void> {
  const waiting = await req.payload.find({
    collection: 'shorts',
    where: { 'aiReview.status': { equals: 'batched' } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const byBatch = new Map<string, number[]>()
  for (const short of waiting.docs) {
    const batchId = short.aiReview?.batchId
    if (!batchId) {
      await release(req, short.id)
      continue
    }
    byBatch.set(batchId, [...(byBatch.get(batchId) ?? []), short.id])
  }

  for (const [batchId, shortIds] of byBatch) {
    const batch = await client.messages.batches.retrieve(batchId)
    if (batch.processing_status !== 'ended') {
      summary.pending += shortIds.length
      continue
    }
    const answered = new Set<number>()
    for await (const entry of await client.messages.batches.results(batchId)) {
      const shortId = shortIdOf(entry.custom_id)
      if (shortId === null) continue
      answered.add(shortId)
      const { result } = entry
      if (result.type === 'succeeded') {
        addUsage(summary.usage, result.message)
        await storeReviewed(req, shortId, readResponse(result.message))
        summary.collected += 1
      } else if (result.type === 'errored' && result.error.type === 'error') {
        const error = result.error.error
        // A request the API rejected will be rejected again; anything else is worth another try.
        if (error.type === 'invalid_request_error')
          await storeReviewed(req, shortId, { kind: 'unusable', reason: error.message })
        else await release(req, shortId)
      } else await release(req, shortId)
    }
    for (const shortId of shortIds) if (!answered.has(shortId)) await release(req, shortId)
  }
}

/** Sends the shorts in review that have no analysis yet as one batch. */
export async function submitBatch(
  req: PayloadRequest,
  client: ReviewClient,
  summary: BatchSummary,
): Promise<void> {
  const pending = await req.payload.find({
    collection: 'shorts',
    where: { status: { equals: 'review' }, 'aiReview.status': { exists: false } },
    depth: 0,
    limit: BATCH_LIMIT,
    pagination: false,
    sort: 'id',
    req,
  })
  const requests: { custom_id: string; params: ReturnType<typeof reviewParams> }[] = []
  const model = reviewModel()
  for (const short of pending.docs) {
    const loaded = await loadReviewInput(req, short.id)
    if (loaded)
      requests.push({ custom_id: customId(short.id), params: reviewParams(loaded.input, model) })
  }
  if (requests.length === 0) return
  const batch = await client.messages.batches.create({ requests })
  for (const request of requests) {
    const shortId = shortIdOf(request.custom_id)
    if (shortId !== null)
      await req.payload.update({
        collection: 'shorts',
        id: shortId,
        data: { aiReview: { status: 'batched', batchId: batch.id, model } },
        req,
      })
  }
  summary.submitted = requests.length
}

/** The nightly pass: collect what ended, then submit what is new. */
/** `submit` false only collects: what an editor uses to check the spend before the next batch. */
export async function runBatchReview(
  req: PayloadRequest,
  client: ReviewClient,
  submit = true,
): Promise<BatchSummary> {
  const summary: BatchSummary = { submitted: 0, collected: 0, pending: 0, usage: noUsage() }
  await collectBatches(req, client, summary)
  if (submit) await submitBatch(req, client, summary)
  req.payload.logger.info(
    `aiReview: batch pass — ${summary.collected} collected, ${summary.pending} still waiting, ${summary.submitted} submitted (${summary.usage.input} in, ${summary.usage.output} out tokens)`,
  )
  return summary
}
