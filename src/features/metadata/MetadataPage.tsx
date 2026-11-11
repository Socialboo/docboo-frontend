import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { Check, Plus, Trash2 } from 'lucide-react'
import { applyValues, metadataSchema, stepIssues, steps, valuesFromDocument } from './metadataForm'
import type { MetadataValues } from './metadataForm'
import type { ReactNode } from 'react'
import { Field, errorMessages } from '#/components/forms/Field'
import { NativeSelect } from '#/components/forms/NativeSelect'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { useWork } from '#/features/work/WorkProvider'
import { cn } from '#/lib/utils'

/**
 * Assistant for the data printed on the cover, title page and pre-textual pages. Every change is
 * applied to the document (and autosaved); validation shows what the export will require.
 */
export function MetadataPage() {
  const { doc, update, workId } = useWork()
  const [step, setStep] = useState(0)

  const form = useForm({
    defaultValues: valuesFromDocument(doc),
    validators: { onChange: metadataSchema, onMount: metadataSchema },
    listeners: {
      onChange: ({ formApi }) => update((d) => applyValues(d, formApi.state.values)),
      onChangeDebounceMs: 250,
    },
  })
  const values = useStore(form.store, (s) => s.values)

  type Name = keyof MetadataValues & string
  // Errors appear once the field was touched (onMount only feeds the step badges).
  const errorsOf = (name: Name) => {
    const meta = form.getFieldMeta(name)
    return meta?.isTouched ? errorMessages(meta.errors) : []
  }

  const text = (name: Name, label: string, opts: { required?: boolean; hint?: string; multiline?: boolean; rows?: number } = {}) => (
    <form.Field name={name}>
      {(field) => (
        <Field id={name} label={label} required={opts.required} hint={opts.hint} errors={errorsOf(name)}>
          {opts.multiline ? (
            <Textarea
              id={name}
              rows={opts.rows ?? 4}
              value={field.state.value as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={errorsOf(name).length > 0}
            />
          ) : (
            <Input
              id={name}
              value={field.state.value as string}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={errorsOf(name).length > 0}
            />
          )}
        </Field>
      )}
    </form.Field>
  )

  const toggle = (name: Name, label: string, description?: string) => (
    <form.Field name={name}>
      {(field) => (
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Switch checked={field.state.value as boolean} onCheckedChange={(v) => field.handleChange(v)} />
          <span>
            <span className="block text-sm font-medium">{label}</span>
            {description && <span className="block text-xs text-muted-foreground">{description}</span>}
          </span>
        </label>
      )}
    </form.Field>
  )

  return (
    <main className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-[220px_1fr]">
      <nav aria-label="Etapas" className="md:sticky md:top-4 md:self-start">
        <ol className="grid gap-1">
          {steps.map((s, i) => {
            const issues = stepIssues(values, i)
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={step === i ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                    step === i && 'bg-muted font-medium',
                  )}
                >
                  <span>
                    {i + 1}. {s.title}
                  </span>
                  {issues === 0 ? (
                    <Check className="size-4 text-green-600" aria-label="completa" />
                  ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-900" aria-label={`${issues} pendência(s)`}>
                      {issues}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 px-3 text-xs text-muted-foreground">
          As alterações são salvas automaticamente. Itens com * são exigidos para exportar.
        </p>
      </nav>

      <form onSubmit={(e) => e.preventDefault()} className="grid content-start gap-5">
        <h2 className="text-xl font-semibold">{steps[step].title}</h2>

        {step === 0 && (
          <>
            {text('institution', 'Instituição', { required: values.cover, hint: 'Ex.: Universidade Federal de ...' })}
            {text('faculty', 'Faculdade / centro / departamento')}
            {text('course', 'Curso')}
          </>
        )}

        {step === 1 && (
          <>
            <form.Field name="authors" mode="array">
              {(field) => (
                <Fieldset legend="Autor(es)" required errors={errorsOf('authors')}>
                  {field.state.value.map((_, i) => (
                    <form.Field key={i} name={`authors[${i}]`}>
                      {(sub) => (
                        <div className="flex gap-2">
                          <Input
                            aria-label={`Autor ${i + 1}`}
                            value={sub.state.value}
                            onBlur={() => field.handleBlur()}
                            onChange={(e) => sub.handleChange(e.target.value)}
                            placeholder="Nome completo"
                          />
                          {field.state.value.length > 1 && (
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover autor ${i + 1}`} onClick={() => field.removeValue(i)}>
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      )}
                    </form.Field>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => field.pushValue('')}>
                    <Plus /> Adicionar autor
                  </Button>
                </Fieldset>
              )}
            </form.Field>
            {text('title', 'Título', { required: true })}
            {text('subtitle', 'Subtítulo', { hint: 'Na capa aparece após dois-pontos: "Título: subtítulo".' })}
          </>
        )}

        {step === 2 && (
          <>
            {text('nature', 'Natureza do trabalho', {
              required: values.titlePage,
              multiline: true,
              hint: 'Ex.: Trabalho de Conclusão de Curso apresentado ao curso de ... como requisito parcial para obtenção do título de ...',
            })}
            {text('advisor', 'Orientador(a)', { required: values.titlePage, hint: 'Ex.: Prof. Dr. Nome Sobrenome' })}
            {text('coAdvisor', 'Coorientador(a)')}
            <div className="grid gap-5 sm:grid-cols-2">
              {text('city', 'Cidade', { required: true })}
              {text('year', 'Ano', { required: true })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {toggle('cover', 'Capa')}
              {toggle('titlePage', 'Folha de rosto')}
              {toggle('listFigures', 'Lista de figuras', 'Gerada quando houver figuras.')}
              {toggle('listTables', 'Lista de tabelas', 'Gerada quando houver tabelas.')}
            </div>

            <AbstractFields form={form} lang="Pt" title="Resumo" keywordsLabel="Palavras-chave" enabled={values.abstractPtEnabled} text={text} toggle={toggle} />
            <AbstractFields form={form} lang="En" title="Abstract (opcional)" keywordsLabel="Keywords" enabled={values.abstractEnEnabled} text={text} toggle={toggle} />

            <form.Field name="fontFamily">
              {(field) => (
                <Field id="fontFamily" label="Fonte" hint="A norma permite Times New Roman ou Arial.">
                  <NativeSelect id="fontFamily" value={field.state.value} onChange={(e) => field.handleChange(e.target.value as MetadataValues['fontFamily'])}>
                    <option value="">Padrão da norma (Times New Roman)</option>
                    <option value="timesNewRoman">Times New Roman</option>
                    <option value="arial">Arial</option>
                  </NativeSelect>
                </Field>
              )}
            </form.Field>
          </>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Anterior
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Próximo
            </Button>
          ) : (
            <Button nativeButton={false} render={<Link to="/works/$workId/editor" params={{ workId }} />}>Ir para o editor</Button>
          )}
        </div>
      </form>
    </main>
  )
}

function Fieldset({ legend, required, errors, children }: { legend: string; required?: boolean; errors: Array<string>; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {legend}
        {required && <span className="text-destructive" aria-hidden> *</span>}
      </legend>
      {children}
      {errors.map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </fieldset>
  )
}

function AbstractFields({
  lang,
  title,
  keywordsLabel,
  enabled,
  text,
  toggle,
}: {
  form: unknown
  lang: 'Pt' | 'En'
  title: string
  keywordsLabel: string
  enabled: boolean
  text: (name: keyof MetadataValues & string, label: string, opts?: { required?: boolean; hint?: string; multiline?: boolean; rows?: number }) => ReactNode
  toggle: (name: keyof MetadataValues & string, label: string, description?: string) => ReactNode
}) {
  return (
    <section className="grid gap-3 rounded-lg border p-4">
      {toggle(`abstract${lang}Enabled`, title)}
      {enabled && (
        <>
          {text(`abstract${lang}Text`, 'Texto', { required: true, multiline: true, rows: 8, hint: 'Parágrafo único, de 150 a 500 palavras.' })}
          {text(`abstract${lang}Keywords`, keywordsLabel, { required: true, hint: 'Separe com ponto e vírgula.' })}
        </>
      )}
    </section>
  )
}
