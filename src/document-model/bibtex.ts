import { isValidId } from './ids'
import type { CslItem, CslName } from './types'

/**
 * Basic BibTeX import → CSL-JSON. Supports the common entry types and fields; braces, quotes,
 * "#" concatenation of literals and the usual LaTeX accents. Unknown fields are ignored.
 */

const TYPE_MAP: Record<string, string> = {
  article: 'article-journal',
  book: 'book',
  booklet: 'book',
  inbook: 'chapter',
  incollection: 'chapter',
  inproceedings: 'paper-conference',
  conference: 'paper-conference',
  phdthesis: 'thesis',
  mastersthesis: 'thesis',
  thesis: 'thesis',
  techreport: 'report',
  report: 'report',
  online: 'webpage',
  misc: 'webpage',
  manual: 'book',
  unpublished: 'manuscript',
}

const ACCENTS: Record<string, Record<string, string>> = {
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', c: 'ć' },
  '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', O: 'Ò' },
  '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', O: 'Ô' },
  '~': { a: 'ã', o: 'õ', n: 'ñ', A: 'Ã', O: 'Õ', N: 'Ñ' },
  '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' },
  c: { c: 'ç', C: 'Ç' },
}

export interface BibtexResult {
  items: Array<CslItem>
  errors: Array<string>
}

export function parseBibtex(source: string, existingIds: ReadonlyArray<string> = []): BibtexResult {
  const items: Array<CslItem> = []
  const errors: Array<string> = []
  const used = new Set(existingIds)
  let pos = 0

  while (pos < source.length) {
    const at = source.indexOf('@', pos)
    if (at < 0) break
    const header = /^@\s*([A-Za-z]+)\s*([{(])/.exec(source.slice(at))
    if (!header) {
      pos = at + 1
      continue
    }
    const type = header[1].toLowerCase()
    const open = at + header[0].length - 1
    const close = matching(source, open)
    if (close < 0) {
      errors.push(`Entrada @${type} sem fechamento.`)
      break
    }
    pos = close + 1
    if (type === 'comment' || type === 'preamble' || type === 'string') continue

    const body = source.slice(open + 1, close)
    const comma = body.indexOf(',')
    const key = (comma < 0 ? body : body.slice(0, comma)).trim()
    const fields = parseFields(comma < 0 ? '' : body.slice(comma + 1))

    try {
      items.push(toCsl(type, uniqueId(key, used), fields))
    } catch (e) {
      errors.push(`${key || type}: ${(e as Error).message}`)
    }
  }

  if (items.length === 0 && errors.length === 0) errors.push('Nenhuma entrada BibTeX encontrada.')
  return { items, errors }
}

function matching(text: string, open: number): number {
  const closeChar = text[open] === '{' ? '}' : ')'
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') {
      i++
      continue
    }
    if (c === text[open] || (text[open] === '(' && c === '{')) depth++
    else if (c === closeChar || (text[open] === '(' && c === '}')) depth--
    if (depth === 0) return i
  }
  return -1
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {}
  let i = 0
  while (i < body.length) {
    const m = /^\s*,?\s*([A-Za-z][\w-]*)\s*=\s*/.exec(body.slice(i))
    if (!m) break
    i += m[0].length
    const name = m[1].toLowerCase()
    let value = ''
    // value: {..} | ".." | number/macro, possibly joined with #
    for (;;) {
      while (body[i] === ' ' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t') i++
      if (body[i] === '{') {
        const end = matching(body, i)
        value += body.slice(i + 1, end < 0 ? body.length : end)
        i = end < 0 ? body.length : end + 1
      } else if (body[i] === '"') {
        let end = i + 1
        let depth = 0
        while (end < body.length && !(body[end] === '"' && depth === 0)) {
          if (body[end] === '{') depth++
          if (body[end] === '}') depth--
          end++
        }
        value += body.slice(i + 1, end)
        i = end + 1
      } else {
        const lit = /^[^,#\s]+/.exec(body.slice(i))
        if (lit) {
          value += lit[0]
          i += lit[0].length
        }
      }
      while (body[i] === ' ' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t') i++
      if (body[i] === '#') {
        i++
        continue
      }
      break
    }
    fields[name] = clean(value)
  }
  return fields
}

/** LaTeX accents and braces → Unicode text. */
export function clean(value: string): string {
  let text = value.replace(/\{\\([`'^~"])\s*\{?([A-Za-z])\}?\}|\\([`'^~"])\s*\{?([A-Za-z])\}?/g, (_, a1, l1, a2, l2) => {
    return accented(a1 ?? a2, l1 ?? l2)
  })
  text = text.replace(/\{?\\c\s*\{?([cC])\}?\}?/g, (_, l: string) => ACCENTS.c[l])
  text = text.replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/--/g, '–').replace(/~/g, ' ')
  return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

function accented(accent: string, letter: string): string {
  const table = Object.hasOwn(ACCENTS, accent) ? ACCENTS[accent] : undefined
  return table && Object.hasOwn(table, letter) ? table[letter] : letter
}

function uniqueId(key: string, used: Set<string>): string {
  let base = key.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[-_]+/, '').slice(0, 56) || 'ref'
  if (!isValidId(base)) base = `ref-${base}`
  let id = base
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`
  used.add(id)
  return id
}

export function parseNames(value: string): Array<CslName> {
  return value
    .split(/\s+and\s+/i)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name): CslName => {
      if (name.includes(',')) {
        const [family, given] = name.split(',', 2).map((s) => s.trim())
        return { family, given: given || null, literal: null }
      }
      const parts = name.split(/\s+/)
      if (parts.length === 1) return { family: null, given: null, literal: name }
      return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' '), literal: null }
    })
}

function toCsl(bibType: string, id: string, f: Record<string, string>): CslItem {
  if (!f.title) throw new Error('campo "title" ausente')
  const type = Object.hasOwn(TYPE_MAP, bibType) ? TYPE_MAP[bibType] : 'book'
  const year = Number.parseInt(Object.hasOwn(f, 'year') ? f.year : '', 10)
  const pick = (...names: Array<string>) => names.map((n) => f[n]).find((v) => v) ?? null

  let genre: string | null = null
  if (bibType === 'phdthesis') genre = 'Tese (Doutorado)'
  else if (bibType === 'mastersthesis') genre = 'Dissertação (Mestrado)'
  if (f.type) genre = f.type

  return {
    id,
    type,
    title: f.title,
    author: f.author ? parseNames(f.author) : null,
    editor: f.editor ? parseNames(f.editor) : null,
    issued: Number.isFinite(year) ? { 'date-parts': [[year]], literal: null } : null,
    accessed: null,
    'container-title': pick('journal', 'booktitle', 'journaltitle'),
    publisher: pick('publisher', 'school', 'institution', 'organization'),
    'publisher-place': pick('address', 'location'),
    edition: pick('edition'),
    volume: pick('volume'),
    issue: pick('number', 'issue'),
    page: f.pages ? f.pages.replace('–', '-') : null,
    genre,
    number: null,
    URL: pick('url'),
    DOI: pick('doi'),
    ISBN: pick('isbn'),
    ISSN: pick('issn'),
  }
}
