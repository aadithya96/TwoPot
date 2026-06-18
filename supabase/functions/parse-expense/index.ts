// supabase/functions/parse-expense/index.ts
//
// Deno Edge Function. Turns a casual natural-language note ("250 groceries
// yesterday") into structured expense fields — amount, date, description, and a
// best-match category — for prefilling the add-expense form. Requires an
// ANTHROPIC_API_KEY secret (shared with scan-receipt).

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

/** Structured expense fields parsed from a natural-language note. */
interface ParsedExpense {
  amountRupees: number | null
  date: string | null
  description: string | null
  categoryName: string | null
}

interface RequestBody {
  text: string
  today: string
  categories: string[]
}

function buildPrompt(text: string, today: string, categories: string[]): string {
  const categoryList = categories.length > 0 ? categories.join(', ') : '(none)'
  return (
    `You convert a casual expense note into structured data. Today is ${today}. ` +
    `Available categories: ${categoryList}. ` +
    'Respond with ONLY a JSON object (no markdown, no prose) of the form ' +
    '{"amountRupees": number|null, "date": string|null, "description": string|null, "categoryName": string|null}. ' +
    '"amountRupees" is the spend amount in rupees. ' +
    '"date" is ISO YYYY-MM-DD; resolve relative dates like "yesterday" or "last friday" against today. ' +
    '"description" is a short human label for the expense. ' +
    '"categoryName" must be EXACTLY one of the available categories, or null if none fit. ' +
    'Use null for anything not present. ' +
    `Note: "${text}"`
  )
}

/** Strips optional ```json fences and parses the model output into a ParsedExpense. */
function parseModelJson(text: string, categories: string[]): ParsedExpense {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const parsed = JSON.parse(cleaned) as Partial<ParsedExpense>

  const amount = typeof parsed.amountRupees === 'number' && Number.isFinite(parsed.amountRupees)
    ? parsed.amountRupees
    : null
  const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ? parsed.date
    : null
  const description = typeof parsed.description === 'string' && parsed.description.trim() !== ''
    ? parsed.description.trim()
    : null
  // Only accept a category that exactly matches one we offered (case-insensitive).
  const categoryName = typeof parsed.categoryName === 'string'
    ? categories.find((name) => name.toLowerCase() === parsed.categoryName!.toLowerCase()) ?? null
    : null

  return { amountRupees: amount, date, description, categoryName }
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

  let body: RequestBody
  try {
    body = await req.json()
    if (typeof body.text !== 'string' || body.text.trim() === '') throw new Error('missing text')
  } catch {
    return new Response(JSON.stringify({ error: 'Expected JSON body with a "text" string' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const today = typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10)
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === 'string')
    : []

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
      messages: [{ role: 'user', content: buildPrompt(body.text, today, categories) }],
    }),
  })

  if (!apiResponse.ok) {
    const detail = await apiResponse.text()
    console.error(`Anthropic API error ${apiResponse.status}: ${detail}`)
    return new Response(JSON.stringify({ error: 'Parse failed' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  const payload = await apiResponse.json()
  const modelText: string = payload?.content?.[0]?.text ?? ''

  let result: ParsedExpense
  try {
    result = parseModelJson(modelText, categories)
  } catch {
    console.error(`Failed to parse model output: ${modelText}`)
    return new Response(JSON.stringify({ error: 'Could not understand that note' }), {
      status: 422,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify(result), { headers: JSON_HEADERS })
})
