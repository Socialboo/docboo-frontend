import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '#/api/client'
import { profilesQuery, worksQuery } from '#/api/queries'
import { Field } from '#/components/forms/Field'
import { NativeSelect } from '#/components/forms/NativeSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function WorksPage() {
  const works = useQuery(worksQuery)
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE('/api/works/{id}', { params: { path: { id } } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    },
    onSuccess: () => {
      toast.success('Trabalho excluído.')
      void queryClient.invalidateQueries({ queryKey: worksQuery.queryKey })
    },
    onError: () => toast.error('Não foi possível excluir o trabalho.'),
  })

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Meus trabalhos</h1>
        <CreateWorkDialog />
      </div>

      {works.isPending && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}
      {works.isError && (
        <p className="mt-6 text-sm text-destructive" role="alert">
          Não foi possível carregar os trabalhos: {works.error.message}
        </p>
      )}
      {works.data?.length === 0 && (
        <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 font-medium">Nenhum trabalho ainda</p>
          <p className="text-sm text-muted-foreground">Crie o primeiro para começar a escrever.</p>
        </div>
      )}
      {works.data && works.data.length > 0 && (
        <ul className="mt-6 divide-y rounded-lg border">
          {works.data.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 p-4">
              <Link to="/works/$workId/editor" params={{ workId: w.id }} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-medium">{w.title}</span>
                <span className="text-xs text-muted-foreground">
                  Editado em {dateFormat.format(new Date(w.updatedAt))} · versão {w.version}
                </span>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Excluir ${w.title}`} />}>
                  <Trash2 />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{w.title}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O trabalho, as imagens e as exportações dele serão apagados. Isso não pode ser desfeito.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => remove.mutate(w.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function CreateWorkDialog() {
  const profiles = useQuery(profilesQuery)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [profileId, setProfileId] = useState('abnt-tcc')
  const selected = profiles.data?.find((p) => p.id === profileId)

  const create = useMutation({
    mutationFn: async () => {
      const { data, response } = await api.POST('/api/works', {
        body: { profileId, title: title.trim() || null },
      })
      if (!data) throw new Error(`HTTP ${response.status}`)
      return data
    },
    onSuccess: (work) => {
      void queryClient.invalidateQueries({ queryKey: worksQuery.queryKey })
      setOpen(false)
      setTitle('')
      void navigate({ to: '/works/$workId/metadata', params: { workId: work.id } })
    },
    onError: () => toast.error('Não foi possível criar o trabalho.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus /> Novo trabalho
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Novo trabalho</DialogTitle>
            <DialogDescription>Escolha a norma; a formatação é aplicada na exportação.</DialogDescription>
          </DialogHeader>
          <Field id="new-title" label="Título" hint="Pode ser alterado depois.">
            <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} autoFocus />
          </Field>
          <Field id="new-profile" label="Norma" hint={selected?.description}>
            <NativeSelect id="new-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {profiles.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !profiles.data}>
              {create.isPending ? 'Criando…' : 'Criar trabalho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
