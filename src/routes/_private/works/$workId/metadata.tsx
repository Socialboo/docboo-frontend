import { createFileRoute } from '@tanstack/react-router'
import { MetadataPage } from '#/features/metadata/MetadataPage'

export const Route = createFileRoute('/_private/works/$workId/metadata')({ component: MetadataPage })
