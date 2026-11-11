/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import golden from './__fixtures__/golden-tcc.json'
import { parseBibtex } from './bibtex'
import { authorLabel, formatCitation } from './citations'
import { ensureUniqueIds, isValidId } from './ids'
import {
  addSection,
  attachmentLetter,
  findSection,
  moveSection,
  newSection,
  removeSection,
  walkSections,
} from './sections'
import { blocksToTiptap, tiptapToBlocks } from './tiptap'
import type { Block, CslItem, DocumentModel } from './types'

const doc = golden as unknown as DocumentModel

describe('tiptap conversion', () => {
  const allBlocks = (): Array<Array<Block>> => {
    const result: Array<Array<Block>> = []
    walkSections(doc.textual.sections, ({ section }) => result.push(section.blocks))
    return result
  }

  test('round-trips every block of the golden sample', () => {
    for (const blocks of allBlocks()) {
      expect(tiptapToBlocks(blocksToTiptap(blocks))).toEqual(blocks)
    }
  })

  test('keeps marks, citations, footnotes and hard breaks', () => {
    const intro = doc.textual.sections[0].blocks
    const json = blocksToTiptap(intro)
    const paragraph = json.content![0]
    expect(paragraph.content!.map((n) => n.type)).toEqual(['text', 'citation', 'text', 'footnote', 'text'])
    expect(paragraph.content![1].attrs).toEqual({ refIds: ['souza2021'], locator: '', mode: 'parenthetical' })
    expect(paragraph.content![3].attrs!.text).toStartWith('Por estrutura')
  })

  test('drops empty paragraphs and merges adjacent text with the same marks', () => {
    const blocks = tiptapToBlocks({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { id: 'p1' }, content: [{ type: 'text', text: 'Olá ' }, { type: 'text', text: 'mundo' }] },
        { type: 'paragraph', attrs: { id: null } },
      ],
    })
    expect(blocks).toEqual([{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: 'Olá mundo', marks: [] }] }])
  })

  test('generates ids for new nodes and ignores unknown node types', () => {
    const blocks = tiptapToBlocks({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'novo', marks: [{ type: 'link' }, { type: 'italic' }] }] },
        { type: 'heading', content: [{ type: 'text', text: 'ignorado' }] },
        { type: 'codeBlock', content: [{ type: 'text', text: '<script>' }] },
      ],
    })
    expect(blocks).toHaveLength(1)
    expect(isValidId(blocks[0].id)).toBe(true)
    expect(blocks[0]).toMatchObject({ content: [{ text: 'novo', marks: ['italic'] }] })
  })

  test('flattens nested lists and keeps table spans and header rows', () => {
    const [list, table] = tiptapToBlocks({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { id: 'l1' },
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
                { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] }] },
              ],
            },
          ],
        },
        {
          type: 'table',
          attrs: { id: 't1', title: 'Título', source: 'Fonte X' },
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 2, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'y' }] }] }] },
          ],
        },
      ],
    })
    expect(list).toMatchObject({ type: 'list', items: [{ content: [{ text: 'a' }] }, { content: [{ text: 'b' }] }] })
    expect(table).toMatchObject({
      type: 'table',
      title: [{ text: 'Título' }],
      rows: [
        { header: true, cells: [{ colSpan: 2, rowSpan: 1 }] },
        { header: false, cells: [{ content: [{ text: 'x' }, { type: 'hardBreak' }, { text: 'y' }] }] },
      ],
    })
  })
})

describe('ids', () => {
  test('golden sample is already unique', () => {
    expect(ensureUniqueIds(doc)).toBe(doc)
  })

  test('replaces duplicated and invalid ids (e.g. after copy/paste)', () => {
    const p = doc.textual.sections[0].blocks[0]
    const dup = {
      ...doc,
      textual: {
        sections: [
          { ...doc.textual.sections[0], blocks: [p, p, { ...p, id: 'bad id!' }] },
          ...doc.textual.sections.slice(1),
        ],
      },
    }
    const fixed = ensureUniqueIds(dup)
    const ids = fixed.textual.sections[0].blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(3)
    expect(ids.every(isValidId)).toBe(true)
    expect(ids[0]).toBe(p.id)
  })
})

describe('sections', () => {
  test('numbers sections progressively', () => {
    const numbers: Array<string> = []
    walkSections(doc.textual.sections, (l) => numbers.push(`${l.number} ${l.section.title}`))
    expect(numbers).toEqual([
      '1 Introdução', '1.1 Objetivos', '2 Fundamentação teórica', '2.1 Documentos estruturados',
      '2.1.1 Estilos de parágrafo', '3 Resultados', '4 Conclusão',
    ])
  })

  test('adds, moves and removes sections', () => {
    const s = newSection('Metodologia')
    let next = addSection(doc, s, { afterId: 'sec-fundamentacao' })
    expect(next.textual.sections.map((x) => x.title)).toEqual(['Introdução', 'Fundamentação teórica', 'Metodologia', 'Resultados', 'Conclusão'])
    next = moveSection(next, s.id, -1)
    expect(next.textual.sections[1].id).toBe(s.id)
    next = addSection(next, newSection('Sub'), { parentId: s.id })
    expect(findSection(next, s.id)!.section.children).toHaveLength(1)
    next = removeSection(next, s.id)
    expect(findSection(next, s.id)).toBeNull()
    expect(doc.textual.sections).toHaveLength(4) // original untouched
  })

  test('does not nest deeper than five levels nor remove the last section', () => {
    expect(addSection(doc, newSection('6º nível'), { parentId: 'sec-estilos' }).textual.sections[1].children[0].children[0].children)
      .toHaveLength(1)
    let deep = doc
    let parent = 'sec-intro'
    for (let i = 0; i < 5; i++) {
      const child = newSection(`n${i}`)
      deep = addSection(deep, child, { parentId: parent })
      parent = child.id
    }
    expect(findSection(deep, parent)).toBeNull() // the 6th level was refused
    const single = { ...doc, textual: { sections: [doc.textual.sections[0]] } }
    expect(removeSection(single, 'sec-intro')).toBe(single)
  })

  test('letters attachments like the exporter', () => {
    expect([0, 25, 26, 27].map(attachmentLetter)).toEqual(['A', 'Z', 'AA', 'AB'])
  })
})

describe('citations', () => {
  const refs = doc.references

  test('formats parenthetical and narrative citations', () => {
    expect(formatCitation({ refIds: ['souza2021'], locator: null, mode: 'parenthetical' }, refs)).toBe('(SOUZA; PEREIRA, 2021)')
    expect(formatCitation({ refIds: ['lima2019'], locator: 'p. 45', mode: 'narrative' }, refs)).toBe('Lima (2019, p. 45)')
    expect(formatCitation({ refIds: ['abc2020'], locator: null, mode: 'parenthetical' }, refs)).toBe('(BIBLIOTECA CENTRAL EXEMPLO, 2020)')
  })

  test('uses et al. for four or more authors', () => {
    const many = { ...refs[0], author: [1, 2, 3, 4].map((n) => ({ family: `A${n}`, given: null, literal: null })) } as CslItem
    expect(authorLabel(many, true)).toBe('A1 et al.')
  })
})

describe('bibtex', () => {
  const bib = String.raw`
@article{souza2021,
  author  = {Souza, Ana and Pereira, Carlos},
  title   = {Tempo dedicado {\`a} formata{\c{c}}{\~a}o},
  journal = "Revista Exemplo",
  year    = 2021, volume = {12}, number = {3}, pages = {10--25},
  doi     = {10.1000/xyz}
}
@comment{ignored}
@book{lima2019, author = {Roberto Lima}, title = {Editora{\c c}{\~a}o eletr{\^o}nica},
  publisher = {Editora Exemplo}, address = {Rio de Janeiro}, year = {2019}, edition = {2}}
@phdthesis{tese, author={Alves, Rui}, title={Sistemas}, school={Universidade Exemplo}, year={2022}}
@misc{semtitulo, author={X}}
`

  test('imports common entry types and fields', () => {
    const { items, errors } = parseBibtex(bib)
    expect(items.map((i) => [i.id, i.type])).toEqual([['souza2021', 'article-journal'], ['lima2019', 'book'], ['tese', 'thesis']])
    expect(items[0]).toMatchObject({
      title: 'Tempo dedicado à formatação',
      author: [{ family: 'Souza', given: 'Ana' }, { family: 'Pereira', given: 'Carlos' }],
      'container-title': 'Revista Exemplo',
      issued: { 'date-parts': [[2021]] },
      page: '10-25',
      DOI: '10.1000/xyz',
    })
    expect(items[1]).toMatchObject({ title: 'Editoração eletrônica', author: [{ family: 'Lima', given: 'Roberto' }], 'publisher-place': 'Rio de Janeiro' })
    expect(items[2]).toMatchObject({ genre: 'Tese (Doutorado)', publisher: 'Universidade Exemplo' })
    expect(errors).toEqual(['semtitulo: campo "title" ausente'])
  })

  test('keeps ids unique against existing references', () => {
    const { items } = parseBibtex('@book{lima2019, title={X}, year={2020}}', ['lima2019'])
    expect(items[0].id).toBe('lima2019-2')
  })

  test('reports input without entries', () => {
    expect(parseBibtex('nada aqui').errors).toEqual(['Nenhuma entrada BibTeX encontrada.'])
  })
})
