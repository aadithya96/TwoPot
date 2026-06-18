// supabase/functions/scan-receipt/index.ts
//
// Deno Edge Function. Given the URL of an uploaded receipt image, fetches the
// image and asks a vision-capable model to extract the total amount, date, and
// merchant name, returning them as structured JSON for the add-expense form to
// prefill. Requires an ANTHROPIC_API_KEY secret to be configured.

import { encodeBase64 } from 'jsr:@std/encoding/base64'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

/** Structured fields extracted from a receipt image. */
interface ReceiptScan {
  amountRupees: number | null
  date: string | null
  merchant: string | null
}

const EXTRACTION_PROMPT =
  'Extract details from this receipt image. Respond with ONLY a JSON object (no markdown, no prose) ' +
  'of the form {"amountRupees": number|null, "date": string|null, "merchant": string|null}. ' +
  '"amountRupees" is the grand total actually paid, as a number in rupees (e.g. 1234.50). ' +
  '"date" is the purchase date in ISO YYYY-MM-DD format. ' +
  '"merchant" is the store or business name. Use null for any value not clearly visible.'

/** Strips optional ```json fences and parses the model output into a ReceiptScan. */
function parseModelJson(text: string): ReceiptScan {
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
  return { amountRupees: amount, date, merchant }
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
  try {
    const body = await req.json()
    imageUrl = body.imageUrl
    if (typeof imageUrl !== 'string' || imageUrl === '') throw new Error('missing imageUrl')
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
            { type: 'text', text: EXTRACTION_PROMPT },
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
    result = parseModelJson(text)
  } catch {
    console.error(`Failed to parse model output: ${text}`)
    return new Response(JSON.stringify({ error: 'Could not read receipt' }), {
      status: 422,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify(result), { headers: JSON_HEADERS })
})
