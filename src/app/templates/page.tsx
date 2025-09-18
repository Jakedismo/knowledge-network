'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TemplateGallery } from '@/components/templates/TemplateGallery'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function TemplatesPage() {
  const router = useRouter()
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Templates</h1>
            <p className="text-sm text-muted-foreground">Use or create templates for faster knowledge capture.</p>
          </div>
          <Button onClick={() => router.push('/templates/new')}>New Template</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
            <CardDescription>Search built-in and custom templates.</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateGallery />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

