// supabase/functions/scan-receipt/index.ts
//
// Deno Edge Function. Given the URL of an uploaded image — a paper receipt or a
// screenshot of an online order (Blinkit, Swiggy, Zomato, Amazon, etc.) —
// fetches the image and asks a vision-capable model to extract the total
// amount, date, merchant name, and best-matching category, returning them as
// structured JSON for the add-expense form to prefill. Requires an
// ANTHROPIC_API_KEY secret to be configured.

import { encodeBase64 } from 'jsr:@std/encoding/base64'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

/** Structured fields extracted from a receipt or order-screenshot image. */
interface ReceiptScan {
  amountRupees: number | null
  date: string | null
  merchant: string | null
  category: string | null
}

/**
 * Builds the vision prompt. When the household's category names are supplied,
 * the model is asked to also pick the single best-matching category so an
 * order screenshot can be categorised automatically.
 */
function buildExtractionPrompt(categories: string[]): string {
  const shape =
    '{"amountRupees": number|null, "date": string|null, "merchant": string|null, "category": string|null}'
  const categoryLine =
    categories.length > 0
      ? `"category" MUST be exactly one of these names (or null if none fit): ${categories.join(', ')}. `
      : '"category" is a short spending category, or null. '
  return (
    'Extract details from this image. It is either a paper receipt or a screenshot of an ' +
    'online order (e.g. Blinkit, Swiggy, Zomato, Amazon, Instamart). ' +
    `Respond with ONLY a JSON object (no markdown, no prose) of the form ${shape}. ` +
    '"amountRupees" is the grand total actually paid, as a number in rupees (e.g. 1234.50). ' +
    '"date" is the order or purchase date in ISO YYYY-MM-DD format. ' +
    '"merchant" is the store, restaurant, or app name. ' +
    categoryLine +
    'Use null for any value not clearly visible.'
  )
}

/** Strips optional ```json fences and parses the model output into a ReceiptScan. */
function parseModelJson(text: string, categories: string[]): ReceiptScan {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const parsed = JSON.parse(cleaned) as Partial<ReceiptScan>
  const amount = typeof parsed.amountRupees === 'number' && Number.isFinite(parsed.amountRupees)
    ? parsed.amountRupees
    : null
  const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ? parsed.date
    : null
  const merchant = typeof parsed.merchant === 'string' && parsed.merchant.trim() !== ''
    ? parsed.merchant.trim()
    : null
  // Only accept a category that matches one the household actually has (when a
  // list was provided), so the client can map it straight back to an id.
  const rawCategory = typeof parsed.category === 'string' ? parsed.category.trim() : ''
  const category =
    rawCategory === ''
      ? null
      : categories.length > 0
        ? categories.find((name) => name.toLowerCase() === rawCategory.toLowerCase()) ?? null
        : rawCategory
  return { amountRupees: amount, date, merchant, category }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  let imageUrl: string
  let categories: string[]
  try {
    const body = await req.json()
    imageUrl = body.imageUrl
    if (typeof imageUrl !== 'string' || imageUrl === '') throw new Error('missing imageUrl')
    categories = Array.isArray(body.categories)
      ? body.categories.filter((name: unknown): name is string => typeof name === 'string')
      : []
  } catch {
    return new Response(JSON.stringify({ error: 'Expected JSON body with an "imageUrl" string' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  // Fetch the (signed) receipt image and base64-encode it for the vision API.
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    return new Response(JSON.stringify({ error: 'Could not fetch receipt image' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }
  const mediaType = imageResponse.headers.get('content-type') ?? 'image/jpeg'
  const imageData = encodeBase64(await imageResponse.arrayBuffer())

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
            { type: 'text', text: buildExtractionPrompt(categories) },
          ],
        },
      ],
    }),
  })

  if (!apiResponse.ok) {
    const detail = await apiResponse.text()
    console.error(`Anthropic API error ${apiResponse.status}: ${detail}`)
    return new Response(JSON.stringify({ error: 'Receipt scan failed' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  const payload = await apiResponse.json()
  const text: string = payload?.content?.[0]?.text ?? ''

  let result: ReceiptScan
  try {
    result = parseModelJson(text, categories)
  } catch {
    console.error(`Failed to parse model output: ${text}`)
    return new Response(JSON.stringify({ error: 'Could not read receipt' }), {
      status: 422,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify(result), { headers: JSON_HEADERS })
})
