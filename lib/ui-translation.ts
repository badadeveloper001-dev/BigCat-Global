import patterns from './locales/zh-patterns.json'
import chinese from './locales/zh.json'
import part0 from './locales/zh-1.json'
import part1 from './locales/zh-2.json'
const catalogue: Record<string, string> = { ...chinese, ...part0, ...part1 }
export function decodeUiText(text: string) {
 const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”' }
 return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo);/g, entity => entities[entity] || entity)
}
const templatePatterns = Object.entries(patterns).map(([source, translation]) => {
 const indexes: number[] = []
 const pattern = source.split(/(\{\d+\})/g).map(part => {
  if (/^\{\d+\}$/.test(part)) { indexes.push(Number(part.slice(1, -1))); return '(.*?)' }
  return part.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')
 }).join('')
 return { regex: new RegExp('^' + pattern + '$'), translation, indexes }
})
export function translateUiText(text: string, language: string) {
 if (language !== 'zh') return decodeUiText(text)
 const normalized = text.replace(/\s+/g, ' ').trim()
 const exact = catalogue[text] || catalogue[normalized]
 if (exact) return exact
 for (const { regex, translation, indexes } of templatePatterns) {
  const match = normalized.match(regex)
  if (match) return translation.replace(/\{(\d+)\}/g, (_, index) => { const value = match[indexes.indexOf(Number(index)) + 1] || ''; return catalogue[value] || value })
 }
 return decodeUiText(text)
}

export function translateBrowserUiText(text: string) { return translateUiText(text, typeof document !== 'undefined' && document.documentElement.lang.startsWith('zh') ? 'zh' : 'en') }
