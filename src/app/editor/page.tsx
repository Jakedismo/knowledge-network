"use client"
import React from 'react'
import { Editor } from '@/components/editor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function EditorPage() {
  return (
    <main className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Rich Text Editor</CardTitle>
          <CardDescription>Markdown editing with preview, lists, code blocks, and images.</CardDescription>
        </CardHeader>
        <CardContent>
          <Editor placeholder="Write your knowledge note in Markdown…" />
        </CardContent>
      </Card>
    </main>
  )
}
