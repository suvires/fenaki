/**
 * A small client for listmonk's API: the waitlist and the newsletter live there, never in the
 * web app's own storage. Server-side only: it carries the API token.
 */

export interface ListmonkConfig {
  url: string
  user: string
  token: string
}

export type SubscriptionStatus = 'unconfirmed' | 'confirmed' | 'unsubscribed'

export interface ListmonkList {
  id: number
  uuid: string
  name: string
  tags: string[]
}

export interface ListmonkSubscription {
  id: number
  uuid: string
  subscription_status: SubscriptionStatus
  subscription_created_at: string
}

export interface ListmonkSubscriber {
  id: number
  uuid: string
  email: string
  name: string
  status: 'enabled' | 'disabled' | 'blocklisted'
  attribs: Record<string, unknown>
  lists: ListmonkSubscription[]
}

export interface ListmonkTemplate {
  id: number
  name: string
  type: string
}

export class ListmonkError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ListmonkError'
    this.status = status
  }
}

/** A value for listmonk's SQL `query` filter. Callers validate first; quotes are doubled anyway. */
const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`

export function createListmonk(config: ListmonkConfig) {
  const headers = { Authorization: `token ${config.user}:${config.token}` }

  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, string> } = {},
  ): Promise<T> {
    const url = new URL(path, config.url)
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new ListmonkError(response.status, `listmonk ${method} ${url.pathname}: ${detail}`)
    }
    return ((await response.json()) as { data: T }).data
  }

  async function findSubscriber(where: string): Promise<ListmonkSubscriber | undefined> {
    const page = await request<{ results: ListmonkSubscriber[] }>('GET', '/api/subscribers', {
      query: { query: where, per_page: '1' },
    })
    return page.results[0]
  }

  return {
    request,

    async listsByTag(tag: string): Promise<ListmonkList[]> {
      const page = await request<{ results: ListmonkList[] }>('GET', '/api/lists', {
        query: { tag, per_page: 'all', minimal: 'true' },
      })
      return page.results.filter((list) => list.tags.includes(tag))
    },

    subscriberByEmail(email: string) {
      return findSubscriber(`LOWER(subscribers.email) = ${sqlString(email.toLowerCase())}`)
    },

    subscriberByUuid(uuid: string) {
      return findSubscriber(`subscribers.uuid = ${sqlString(uuid)}`)
    },

    /** Subscribes without confirming: on double opt-in lists the subscriptions stay unconfirmed. */
    createSubscriber(data: { email: string; lists: number[]; attribs: Record<string, unknown> }) {
      return request<ListmonkSubscriber>('POST', '/api/subscribers', {
        body: { ...data, status: 'enabled', preconfirm_subscriptions: false },
      })
    },

    addToLists(subscriberId: number, listIds: number[]) {
      return request<boolean>('PUT', '/api/subscribers/lists', {
        body: {
          ids: [subscriberId],
          action: 'add',
          target_list_ids: listIds,
          status: 'unconfirmed',
        },
      })
    },

    /**
     * Replaces the subscriber's attributes. PATCH, not PUT: a PUT without lists would drop every
     * subscription.
     */
    updateAttribs(subscriber: ListmonkSubscriber, attribs: Record<string, unknown>) {
      return request<ListmonkSubscriber>('PATCH', `/api/subscribers/${subscriber.id}`, {
        body: { attribs },
      })
    },

    /** Subscribers with an unconfirmed subscription to any of these lists, all pages. */
    async unconfirmedOn(listIds: number[]): Promise<ListmonkSubscriber[]> {
      const all: ListmonkSubscriber[] = []
      for (let page = 1; ; page++) {
        const url = new URL('/api/subscribers', config.url)
        for (const id of listIds) url.searchParams.append('list_id', String(id))
        url.searchParams.set('subscription_status', 'unconfirmed')
        url.searchParams.set('per_page', '100')
        url.searchParams.set('page', String(page))
        const result = await request<{ results: ListmonkSubscriber[]; total: number }>(
          'GET',
          url.pathname + url.search,
        )
        all.push(...result.results)
        if (result.results.length === 0 || all.length >= result.total) return all
      }
    },

    removeFromLists(subscriberId: number, listIds: number[]) {
      return request<boolean>('PUT', '/api/subscribers/lists', {
        body: { ids: [subscriberId], action: 'remove', target_list_ids: listIds },
      })
    },

    deleteSubscriber(subscriberId: number) {
      return request<boolean>('DELETE', `/api/subscribers/${subscriberId}`)
    },

    async templateByName(name: string): Promise<ListmonkTemplate | undefined> {
      const templates = await request<ListmonkTemplate[]>('GET', '/api/templates', {
        query: { no_body: 'true' },
      })
      return templates.find((template) => template.name === name)
    },

    sendTransactional(message: {
      subscriberId: number
      templateId: number
      data: Record<string, string>
      fromEmail?: string
    }) {
      return request<boolean>('POST', '/api/tx', {
        body: {
          subscriber_id: message.subscriberId,
          template_id: message.templateId,
          data: message.data,
          from_email: message.fromEmail,
          content_type: 'html',
        },
      })
    },

    /**
     * Confirms the subscriber's opt-in through listmonk's public endpoint, so listmonk records
     * it as it would from its own confirmation page.
     */
    async confirmOptin(subscriberUuid: string, listUuids: string[], clientIp?: string) {
      const form = new URLSearchParams({ confirm: 'true' })
      for (const uuid of listUuids) form.append('l', uuid)
      const response = await fetch(
        new URL(`/subscription/optin/${encodeURIComponent(subscriberUuid)}`, config.url),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
          },
          body: form,
        },
      )
      if (!response.ok)
        throw new ListmonkError(response.status, `listmonk opt-in confirmation failed`)
    },
  }
}

export type Listmonk = ReturnType<typeof createListmonk>
