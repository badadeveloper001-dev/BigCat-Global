type SupportedLanguage = 'en' | 'zh'

const translationCache = new Map<string, string>()

function hasChineseCharacters(value: string) {
  return /[\u3400-\u9FBF]/.test(value)
}

export function detectMessageLanguage(text: string): SupportedLanguage {
  return hasChineseCharacters(text) ? 'zh' : 'en'
}

async function translateWithOpenAI(text: string, source: SupportedLanguage, target: SupportedLanguage) {
  const apiKey = String(process.env.OPENAI_API_KEY || process.env.BIZPILOT_OPENAI_API_KEY || '').trim()
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.BIZPILOT_OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional commerce translator for Nigeria-China trade chat. Return only the translated message with natural business tone and preserve numbers, SKUs, units, and links exactly.',
        },
        {
          role: 'user',
          content: `Translate this message from ${source === 'zh' ? 'Chinese (Simplified)' : 'English'} to ${target === 'zh' ? 'Chinese (Simplified)' : 'English'}:\n\n${text}`,
        },
      ],
    }),
  })

  if (!response.ok) return null
  const payload = await response.json()
  const translated = String(payload?.choices?.[0]?.message?.content || '').trim()
  return translated || null
}

export async function translateMessageForUser(params: {
  text: string
  targetLanguage: SupportedLanguage
  sourceLanguage?: SupportedLanguage
}) {
  const text = String(params.text || '').trim()
  if (!text) {
    return {
      sourceLanguage: 'en' as SupportedLanguage,
      translated: false,
      translatedText: '',
    }
  }

  const sourceLanguage = params.sourceLanguage || detectMessageLanguage(text)
  const targetLanguage = params.targetLanguage

  if (sourceLanguage === targetLanguage) {
    return {
      sourceLanguage,
      translated: false,
      translatedText: text,
    }
  }

  const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`
  const cached = translationCache.get(cacheKey)
  if (cached) {
    return {
      sourceLanguage,
      translated: true,
      translatedText: cached,
    }
  }

  const translated = await translateWithOpenAI(text, sourceLanguage, targetLanguage)
  if (translated) {
    translationCache.set(cacheKey, translated)
    return {
      sourceLanguage,
      translated: true,
      translatedText: translated,
    }
  }

  return {
    sourceLanguage,
    translated: false,
    translatedText: text,
  }
}
