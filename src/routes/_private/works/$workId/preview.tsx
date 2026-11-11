import { createFileRoute } from '@tanstack/react-router'
import { PreviewPage } from '#/features/preview/PreviewPage'

export const Route = createFileRoute('/_private/works/$workId/preview')({ component: PreviewPage })
