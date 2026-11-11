import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Schemas } from '#/api/client'
import type { DocumentModel } from '#/document-model/types'
import { api } from '#/api/client'
import { workQuery, worksQuery } from '#/api/queries'
import { ensureUniqueIds } from '#/document-model/ids'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict' | 'invalid'

/** Field errors keyed by document path (e.g. "metadata.title"). */
export type FieldErrors = Record<string, Array<string>>

interface WorkContextValue {
  workId: string
  title: string
  profileId: string
  doc: DocumentModel
  /** Applies an immutable change to the document and schedules an autosave. */
  update: (recipe: (doc: DocumentModel) => DocumentModel) => void
  saveState: SaveState
  errors: FieldErrors | null
  /** Saves pending changes now (e.g. before exporting). Resolves to false if it could not save. */
  flush: () => Promise<boolean>
  /** Discards local changes and loads the latest saved version (after a conflict). */
  reload: () => Promise<void>
  /** Keeps the local document, saving it over the newer version (after a conflict). */
  overwrite: () => Promise<boolean>
}

const WorkContext = createContext<WorkContextValue | null>(null)

const AUTOSAVE_DELAY_MS = 1200
const RETRY_DELAY_MS = 5000

export function useWork(): WorkContextValue {
  const value = useContext(WorkContext)
  if (!value) throw new Error('useWork must be used inside <WorkProvider>')
  return value
}

/**
 * Owns the document of the open work: local edits are applied immediately and saved with a debounce.
 * Saves are serialized; edits made while a save is in flight trigger another save. A 409 stops
 * autosaving until the user reloads (someone else saved a newer version).
 */
export function WorkProvider({ workId, children }: { workId: string; children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: work, refetch } = useSuspenseQuery(workQuery(workId))

  const [doc, setDoc] = useState<DocumentModel>(work.document)
  const [title, setTitle] = useState(work.title)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [errors, setErrors] = useState<FieldErrors | null>(null)

  const docRef = useRef(doc)
  /** Last document confirmed by the API (null forces the next save). */
  const savedRef = useRef<DocumentModel | null>(doc)
  const versionRef = useRef(work.version)
  const savingRef = useRef<Promise<boolean> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blockedRef = useRef(false)
  /** Version the server reported in the last 409. */
  const conflictVersionRef = useRef<number | null>(null)
  // Read through a function: the flag changes while a save is awaited.
  const isBlocked = () => blockedRef.current

  const save = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    if (blockedRef.current) return false
    if (savingRef.current) {
      await savingRef.current
      return docRef.current === savedRef.current ? true : save()
    }
    if (docRef.current === savedRef.current) return true

    const run = (async () => {
      const snapshot = ensureUniqueIds(docRef.current)
      if (snapshot !== docRef.current) {
        docRef.current = snapshot
        setDoc(snapshot)
      }
      setSaveState('saving')
      try {
        const { data, error, response } = await api.PUT('/api/works/{id}/document', {
          params: { path: { id: workId } },
          body: { version: versionRef.current, document: snapshot },
        })
        if (data) {
          versionRef.current = data.version
          savedRef.current = snapshot
          setTitle(data.title)
          setErrors(null)
          setSaveState(docRef.current === snapshot ? 'saved' : 'dirty')
          queryClient.setQueryData(workQuery(workId).queryKey, (old) =>
            old ? { ...old, document: snapshot, version: data.version, title: data.title, updatedAt: data.updatedAt } : old,
          )
          void queryClient.invalidateQueries({ queryKey: worksQuery.queryKey, exact: true })
          return true
        }
        if (response.status === 409) {
          blockedRef.current = true
          conflictVersionRef.current = (error as { currentVersion?: number } | undefined)?.currentVersion ?? null
          setSaveState('conflict')
        } else if (response.status === 400) {
          const problem = error as { errors?: FieldErrors } | undefined
          setErrors(problem?.errors ?? { '': ['O documento foi recusado pela API.'] })
          setSaveState('invalid')
        } else {
          setSaveState('error')
          timerRef.current = setTimeout(() => void save(), RETRY_DELAY_MS)
        }
        return false
      } catch {
        setSaveState('error')
        timerRef.current = setTimeout(() => void save(), RETRY_DELAY_MS)
        return false
      }
    })()

    savingRef.current = run
    try {
      const ok = await run
      // Edits made while saving: save them too.
      if (ok && docRef.current !== savedRef.current && !isBlocked()) {
        timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
      }
      return ok
    } finally {
      savingRef.current = null
    }
  }, [queryClient, workId])

  const update = useCallback(
    (recipe: (doc: DocumentModel) => DocumentModel) => {
      const next = recipe(docRef.current)
      if (next === docRef.current) return
      docRef.current = next
      setDoc(next)
      if (blockedRef.current) return
      setSaveState((s) => (s === 'saving' ? s : 'dirty'))
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    },
    [save],
  )

  const reload = useCallback(async () => {
    const { data } = await refetch()
    if (!data) return
    blockedRef.current = false
    versionRef.current = data.version
    docRef.current = data.document
    savedRef.current = data.document
    setDoc(data.document)
    setTitle(data.title)
    setErrors(null)
    setSaveState('saved')
  }, [refetch])

  const overwrite = useCallback(async () => {
    if (conflictVersionRef.current === null) return false
    versionRef.current = conflictVersionRef.current
    conflictVersionRef.current = null
    blockedRef.current = false
    savedRef.current = null // force a save even if nothing changed since
    return save()
  }, [save])

  // Save on leave; warn when closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (docRef.current !== savedRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (docRef.current !== savedRef.current) void save()
    }
  }, [save])

  const value = useMemo<WorkContextValue>(
    () => ({ workId, title, profileId: work.profileId, doc, update, saveState, errors, flush: save, reload, overwrite }),
    [workId, title, work.profileId, doc, update, saveState, errors, save, reload, overwrite],
  )

  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>
}

export type WorkResponse = Schemas['WorkResponse']
