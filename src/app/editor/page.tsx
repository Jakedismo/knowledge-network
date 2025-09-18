'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Editor } from '@/components/editor'
import { registerTemplateEditorPlugin } from '@/lib/templates/register-editor-plugin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TagManager, MetadataForm } from '@/components/organization'

const ORG_UI = process.env.NEXT_PUBLIC_ORG_UI_ENABLED === '1'

export default function EditorPage() {
  // One-time registration of template toolbar plugin
  registerTemplateEditorPlugin()
  const [tags, setTags] = React.useState<{ id: string; label: string }[]>([])
  const metadataFields = [
    { name: 'docType', label: 'Document Type', type: 'select', options: [{ label: 'Spec', value: 'spec' }, { label: 'Runbook', value: 'runbook' }], required: true },
    { name: 'owner', label: 'Owner', type: 'text' },
    { name: 'reviewDate', label: 'Review Date', type: 'date' },
    { name: 'sourceUrl', label: 'Source URL', type: 'url' },
  ] as const

  return (
    <AppLayout>
      <div className={ORG_UI ? 'grid grid-cols-1 gap-6 md:grid-cols-3' : ''}>
        <div className={ORG_UI ? 'md:col-span-2' : ''}>
          <Card>
            <CardHeader>
              <CardTitle>Rich Text Editor</CardTitle>
              <CardDescription>Markdown editing with preview, lists, code blocks, and images.</CardDescription>
            </CardHeader>
            <CardContent>
              <Editor placeholder="Write your knowledge note in Markdown…" />
            </CardContent>
          </Card>
        </div>
        {ORG_UI && (
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Add or search tags (demo)</CardDescription>
              </CardHeader>
              <CardContent>
                <TagManager value={tags} onChange={setTags} suggestions={[]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                <CardDescription>Per-knowledge metadata (demo)</CardDescription>
              </CardHeader>
              <CardContent>
                <MetadataForm fields={metadataFields as any} onChange={() => {}} />
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </AppLayout>
  )
}
