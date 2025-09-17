"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

export function TemplateBuilder() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [visibility, setVisibility] = React.useState<'private'|'workspace'|'public'>('workspace')
  const [content, setContent] = React.useState('# {{ title }}\n\n')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visibility, variables: [], content }),
      })
      if (!res.ok) throw new Error(await res.text())
      const t = await res.json()
      router.push(`/templates/${t.id}`)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="tpl-vis">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as any)}
                options={[
                  { label: 'Private', value: 'private' },
                  { label: 'Workspace', value: 'workspace' },
                  { label: 'Public', value: 'public' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tpl-desc">Description</Label>
            <Input id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tpl-content">Content (Markdown with {{variables}})</Label>
            <Textarea id="tpl-content" value={content} onChange={(e) => setContent(e.target.value)} rows={14} />
          </div>
          {error ? <div className="text-sm text-red-600" role="alert">{error}</div> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>Save Template</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
