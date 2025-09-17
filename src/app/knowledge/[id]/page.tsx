import { ClientPanel } from './ClientPanel'

export default async function KnowledgePage({ params }: { params: { id: string } }) {
  const id = params.id
  return (
    <main>
      <ClientPanel id={id} />
    </main>
  )
}

