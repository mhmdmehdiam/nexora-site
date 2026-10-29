/**
 * Optional LLM layer for the AI analysis endpoint.
 *
 * Works with any OpenAI-compatible API (OpenAI, OpenRouter, Groq, DeepSeek,
 * Together, a self-hosted vLLM, …) — set:
 *   LLM_API_KEY   = your key
 *   LLM_BASE_URL  = https://api.openai.com/v1   (default)
 *   LLM_MODEL     = gpt-4o-mini                 (default)
 *
 * When no key is configured the endpoint falls back to the rule-based
 * insights that already ship — so the feature degrades gracefully instead
 * of breaking.
 *
 * PRIVACY: only aggregate numbers are sent (revenue, counts, product names,
 * growth rate). No customer names, emails, phones, or addresses ever leave
 * the server.
 */

export interface LlmInsightInput {
  recentRevenue: number
  previousRevenue: number
  growthRate: number
  recentSalesCount: number
  predictedNextMonth: number
  repeatCustomerCount: number
  topProducts: { name: string; qty: number; revenue: number }[]
  lowStockProducts: { name: string; stock: number; minStock: number }[]
  categoryBreakdown?: { category: string | null; revenue: number }[]
  businessName?: string
}

export interface LlmInsightResult {
  ok: boolean
  insights: string[]
  error?: string
  model?: string
}

export function llmEnabled(): boolean {
  return Boolean(process.env.LLM_API_KEY)
}

function buildPrompt(input: LlmInsightInput): string {
  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n))

  const top = input.topProducts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name} — ${fmt(p.revenue)} تومان (${p.qty} عدد)`)
    .join('\n')

  const low = input.lowStockProducts
    .slice(0, 5)
    .map((p) => `- ${p.name}: موجودی ${p.stock} (حد هشدار ${p.minStock})`)
    .join('\n')

  const cats = (input.categoryBreakdown || [])
    .slice(0, 5)
    .map((c) => `- ${c.category || 'بدون دسته'}: ${fmt(c.revenue)} تومان`)
    .join('\n')

  return `تو یک تحلیل‌گر کسب‌وکار فارسی‌زبان هستی. بر اساس داده‌های زیر، ۳ تا ۵ بینش کوتاه و عملی به فارسی بنویس.

قواعد:
- هر بینش حداکثر ۲۵ کلمه باشد
- مستقیم و بدون مقدمه بنویس (بدون «بر اساس داده‌ها…»)
- هر بینش با یک ایموجی مناسب شروع شود
- اگر عددی منفی است، علت احتمالی و یک اقدام مشخص پیشنهاد بده
- هیچ عددی را از خودت نساز — فقط از داده‌های زیر استفاده کن

داده‌های ۳۰ روز اخیر:
- درآمد: ${fmt(input.recentRevenue)} تومان
- درآمد ۳۰ روز قبل: ${fmt(input.previousRevenue)} تومان
- نرخ رشد: ${input.growthRate.toFixed(1)}٪
- تعداد فروش: ${input.recentSalesCount}
- پیش‌بینی ماه بعد: ${fmt(input.predictedNextMonth)} تومان
- مشتریان تکراری: ${input.repeatCustomerCount}

پرفروش‌ترین محصولات:
${top || '- داده‌ای نیست'}

محصولات با موجودی کم:
${low || '- هیچ'}

درآمد به تفکیک دسته:
${cats || '- داده‌ای نیست'}

پاسخ را فقط به صورت لیست، هر بینش در یک خط و با «- » شروع کن.`
}

export async function generateLlmInsights(input: LlmInsightInput): Promise<LlmInsightResult> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) return { ok: false, insights: [], error: 'LLM_API_KEY not configured' }

  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = process.env.LLM_MODEL || 'gpt-4o-mini'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'تو یک تحلیل‌گر کسب‌وکار فارسی‌زبان هستی که پاسخ‌های کوتاه، دقیق و عملی می‌دهد.',
          },
          { role: 'user', content: buildPrompt(input) },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[llm] HTTP', res.status, text.slice(0, 200))
      return { ok: false, insights: [], error: `LLM HTTP ${res.status}`, model }
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content || ''

    const insights = content
      .split('\n')
      .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
      .filter((line) => line.length > 4)
      .slice(0, 6)

    if (insights.length === 0) {
      return { ok: false, insights: [], error: 'LLM returned an empty response', model }
    }

    return { ok: true, insights, model }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError'
    console.error('[llm]', aborted ? 'timeout' : err)
    return {
      ok: false,
      insights: [],
      error: aborted ? 'LLM timeout' : 'LLM request failed',
      model,
    }
  } finally {
    clearTimeout(timeout)
  }
}
