import { createFileRoute } from '@tanstack/react-router'
import { ExportPage } from '#/features/export/ExportPage'

export const Route = createFileRoute('/_private/works/$workId/export')({ component: ExportPage })
