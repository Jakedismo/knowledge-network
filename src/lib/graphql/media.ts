export const UPLOAD_MEDIA_MUTATION = /* GraphQL */ `
  mutation UploadMedia($file: Upload!, $input: MediaUploadInput) {
    uploadMedia(file: $file, input: $input) {
      id
      url
      thumbnailUrl
      width
      height
      mimeType
      size
    }
  }
`

export type UploadMediaResponse = {
  uploadMedia: {
    id: string
    url: string
    thumbnailUrl: string | null
    width: number | null
    height: number | null
    mimeType: string | null
    size: number | null
  }
}
