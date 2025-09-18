import { ClientPanel } from './ClientPanel'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function KnowledgePage({ params }: PageProps) {
  const { id } = await params
  return (
    <main>
      <ClientPanel id={id} />
    </main>
  )
}
