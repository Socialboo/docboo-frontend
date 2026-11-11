import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/works/$workId/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/works/$workId/editor', params })
  },
})
