"use client"

import { useCallback, useMemo, useState } from 'react'
import { UPLOAD_MEDIA_MUTATION, type UploadMediaResponse } from '@/lib/graphql/media'

type UploadStatus = 'idle' | 'uploading' | 'error'

type UploadResult = {
  url: string
  meta?: {
    id?: string
    thumbnailUrl?: string | null
    width?: number | null
    height?: number | null
    mimeType?: string | null
    size?: number | null
  }
  error?: unknown
}

export function useMediaUpload() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<unknown>(null)

  const uploadMedia = useCallback(async (file: File): Promise<UploadResult> => {
    setStatus('uploading')
    setError(null)

    try {
      const formData = new FormData()
      const variables = {
        file: null,
        input: {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
      }

      formData.append('operations', JSON.stringify({
        query: UPLOAD_MEDIA_MUTATION,
        variables,
      }))
      formData.append('map', JSON.stringify({ '0': ['variables.file'] }))
      formData.append('0', file)

      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
      const headers: Record<string, string> = {}
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth-token')
        if (token) headers.authorization = `Bearer ${token}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      })

      const json = (await response.json()) as { data?: UploadMediaResponse; errors?: any }
      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? 'Upload failed')
      }

      const uploaded = json.data?.uploadMedia
      if (uploaded?.url) {
        setStatus('idle')
        return {
          url: uploaded.url,
          meta: {
            id: uploaded.id,
            thumbnailUrl: uploaded.thumbnailUrl ?? null,
            width: uploaded.width ?? null,
            height: uploaded.height ?? null,
            mimeType: uploaded.mimeType ?? null,
            size: uploaded.size ?? null,
          },
        }
      }

      throw new Error('Upload did not return a URL')
    } catch (err) {
      setStatus('error')
      setError(err)
      // Fall back to a local preview URL so the editor remains responsive
      const fallbackUrl = URL.createObjectURL(file)
      return { url: fallbackUrl, error: err }
    }
  }, [])

  return useMemo(
    () => ({
      status,
      error,
      uploadMedia,
    }),
    [status, error, uploadMedia]
  )
}
