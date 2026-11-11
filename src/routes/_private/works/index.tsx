import { createFileRoute } from '@tanstack/react-router'
import { WorksPage } from '#/features/works/WorksPage'

export const Route = createFileRoute('/_private/works/')({ component: WorksPage })
