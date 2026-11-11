import { z } from 'zod'
import type { DocumentModel } from '#/document-model/types'

/** Flat form values for the cover/title page assistant. */
export interface MetadataValues {
  institution: string
  faculty: string
  course: string
  authors: Array<string>
  title: string
  subtitle: string
  nature: string
  advisor: string
  coAdvisor: string
  city: string
  year: string
  cover: boolean
  titlePage: boolean
  abstractPtEnabled: boolean
  abstractPtText: string
  abstractPtKeywords: string
  abstractEnEnabled: boolean
  abstractEnText: string
  abstractEnKeywords: string
  listFigures: boolean
  listTables: boolean
  fontFamily: '' | 'timesNewRoman' | 'arial'
}

const required = (message: string) => z.string().trim().min(1, message).max(500, 'Máximo de 500 caracteres.')
const optional = z.string().max(500, 'Máximo de 500 caracteres.')

/**
 * What the export needs (same rules as the API's readiness check); drafts can still be saved
 * while these are incomplete.
 */
export const metadataSchema = z
  .object({
    institution: optional,
    faculty: optional,
    course: optional,
    authors: z.array(z.string().max(500)).refine((a) => a.some((x) => x.trim()), 'Informe ao menos um autor.'),
    title: required('Informe o título do trabalho.'),
    subtitle: optional,
    nature: z.string().max(5000),
    advisor: optional,
    coAdvisor: optional,
    city: required('Informe a cidade (local).'),
    year: z.string().regex(/^(19|20|21)\d\d$/, 'Informe o ano com 4 dígitos.'),
    cover: z.boolean(),
    titlePage: z.boolean(),
    abstractPtEnabled: z.boolean(),
    abstractPtText: z.string().max(5000, 'Máximo de 5.000 caracteres.'),
    abstractPtKeywords: z.string(),
    abstractEnEnabled: z.boolean(),
    abstractEnText: z.string().max(5000, 'Máximo de 5.000 caracteres.'),
    abstractEnKeywords: z.string(),
    listFigures: z.boolean(),
    listTables: z.boolean(),
    fontFamily: z.enum(['', 'timesNewRoman', 'arial']),
  })
  .superRefine((v, ctx) => {
    const need = (ok: boolean, path: keyof MetadataValues, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', path: [path], message })
    }
    need(!v.cover || !!v.institution.trim(), 'institution', 'Informe a instituição (usada na capa).')
    need(!v.titlePage || !!v.nature.trim(), 'nature', 'Informe a natureza do trabalho (folha de rosto).')
    need(!v.titlePage || !!v.advisor.trim(), 'advisor', 'Informe o orientador (folha de rosto).')
    need(!v.abstractPtEnabled || !!v.abstractPtText.trim(), 'abstractPtText', 'Escreva o resumo ou desative-o.')
    need(!v.abstractPtEnabled || splitKeywords(v.abstractPtKeywords).length > 0, 'abstractPtKeywords', 'Informe as palavras-chave.')
    need(!v.abstractEnEnabled || !!v.abstractEnText.trim(), 'abstractEnText', 'Escreva o abstract ou desative-o.')
    need(!v.abstractEnEnabled || splitKeywords(v.abstractEnKeywords).length > 0, 'abstractEnKeywords', 'Informe as keywords.')
  })

export const steps: ReadonlyArray<{ title: string; fields: ReadonlyArray<keyof MetadataValues> }> = [
  { title: 'Instituição', fields: ['institution', 'faculty', 'course'] },
  { title: 'Autoria e título', fields: ['authors', 'title', 'subtitle'] },
  { title: 'Folha de rosto', fields: ['nature', 'advisor', 'coAdvisor', 'city', 'year'] },
  {
    title: 'Elementos pré-textuais',
    fields: ['cover', 'titlePage', 'abstractPtText', 'abstractPtKeywords', 'abstractEnText', 'abstractEnKeywords', 'fontFamily'],
  },
]

/** Fields of the step that still block the export. */
export function stepIssues(values: MetadataValues, step: number): number {
  const result = metadataSchema.safeParse(values)
  if (result.success) return 0
  const fields = steps[step].fields as ReadonlyArray<string>
  return result.error.issues.filter((i) => fields.includes(String(i.path[0]))).length
}

export function splitKeywords(text: string): Array<string> {
  return text
    .split(/[;,\n]/)
    .map((k) => k.trim())
    .filter(Boolean)
}

export function valuesFromDocument(doc: DocumentModel): MetadataValues {
  const m = doc.metadata
  const p = doc.preTextual
  return {
    institution: m.institution,
    faculty: m.faculty ?? '',
    course: m.course,
    authors: m.authors.length > 0 ? [...m.authors] : [''],
    title: m.title,
    subtitle: m.subtitle ?? '',
    nature: m.nature,
    advisor: m.advisor,
    coAdvisor: m.coAdvisor ?? '',
    city: m.city,
    year: m.year?.toString() ?? '',
    cover: p.cover.enabled,
    titlePage: p.titlePage.enabled,
    abstractPtEnabled: p.abstractPt.enabled,
    abstractPtText: p.abstractPt.text,
    abstractPtKeywords: p.abstractPt.keywords.join('; '),
    abstractEnEnabled: p.abstractEn.enabled,
    abstractEnText: p.abstractEn.text,
    abstractEnKeywords: p.abstractEn.keywords.join('; '),
    listFigures: p.lists.figures,
    listTables: p.lists.tables,
    fontFamily: doc.profileOverrides.fontFamily ?? '',
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null)

export function applyValues(doc: DocumentModel, v: MetadataValues): DocumentModel {
  const year = Number.parseInt(v.year, 10)
  return {
    ...doc,
    profileOverrides: { fontFamily: v.fontFamily === '' ? null : v.fontFamily },
    metadata: {
      institution: v.institution.trim(),
      faculty: orNull(v.faculty),
      course: v.course.trim(),
      authors: v.authors.map((a) => a.trim()).filter(Boolean),
      title: v.title.trim(),
      subtitle: orNull(v.subtitle),
      advisor: v.advisor.trim(),
      coAdvisor: orNull(v.coAdvisor),
      city: v.city.trim(),
      year: Number.isFinite(year) && year >= 1900 && year <= 2100 ? year : null,
      nature: v.nature.trim(),
    },
    preTextual: {
      cover: { enabled: v.cover },
      titlePage: { enabled: v.titlePage },
      abstractPt: { enabled: v.abstractPtEnabled, text: v.abstractPtText.trim(), keywords: splitKeywords(v.abstractPtKeywords) },
      abstractEn: { enabled: v.abstractEnEnabled, text: v.abstractEnText.trim(), keywords: splitKeywords(v.abstractEnKeywords) },
      lists: { figures: v.listFigures, tables: v.listTables },
    },
  }
}
