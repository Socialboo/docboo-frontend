import type { CitationInline, CslItem, CslName } from './types'

/**
 * Author-date labels for the editor and the HTML preview. Approximation of the exporter's rules
 * (the .docx/PDF are formatted by the backend): up to three authors listed, four or more → "et al.",
 * institutional authors in uppercase, title's first word when there is no author.
 */

const PT = 'pt-BR'

export function yearOf(item: CslItem): string {
  const year = item.issued?.['date-parts']?.[0]?.[0]
  return year ? String(year) : '[s. d.]'
}

function names(item: CslItem): Array<string> {
  const list: Array<CslName> = item.author?.length ? item.author : (item.editor ?? [])
  return list.map((n) => n.literal ?? n.family ?? n.given ?? '').filter((n) => n.length > 0)
}

export function authorLabel(item: CslItem, uppercase: boolean): string {
  let list = names(item)
  if (list.length === 0) {
    const first = (item.title ?? '').split(/\s+/).find(Boolean) ?? ''
    return `${uppercase ? first.toLocaleUpperCase(PT) : first}...`
  }
  if (uppercase) list = list.map((n) => n.toLocaleUpperCase(PT))
  if (list.length >= 4) return `${list[0]} et al.`
  if (uppercase) return list.join('; ')
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} e ${list[1]}`
  return `${list[0]}, ${list[1]} e ${list[2]}`
}

export function formatCitation(
  citation: Pick<CitationInline, 'refIds' | 'locator' | 'mode'>,
  references: ReadonlyArray<CslItem>,
): string {
  const items = citation.refIds.map((id) => references.find((r) => r.id === id))
  const locator = citation.locator?.trim() ? `, ${citation.locator.trim()}` : ''

  if (citation.mode === 'parenthetical') {
    const parts = items.map((item, i) => {
      const label = item ? `${authorLabel(item, true)}, ${yearOf(item)}` : '[?]'
      return i === items.length - 1 ? label + locator : label
    })
    return `(${parts.join('; ')})`
  }

  const parts = items.map((item, i) => {
    if (!item) return '[?]'
    const tail = i === items.length - 1 ? locator : ''
    return `${authorLabel(item, false)} (${yearOf(item)}${tail})`
  })
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** Short description for the references panel. */
export function referenceSummary(item: CslItem): string {
  const authors = (item.author ?? item.editor ?? [])
    .map((n) => n.literal ?? [n.family?.toLocaleUpperCase(PT), n.given].filter(Boolean).join(', '))
    .join('; ')
  return [authors, item.title, yearOf(item)].filter(Boolean).join('. ')
}
