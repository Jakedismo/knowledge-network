export default function TestNoAppPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Test Page Without AppLayout</h1>
      <p className="mt-4">This page works without AppLayout wrapper.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Card 1</h2>
          <p className="text-muted-foreground">Content here</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Card 2</h2>
          <p className="text-muted-foreground">Content here</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Card 3</h2>
          <p className="text-muted-foreground">Content here</p>
        </div>
      </div>
    </div>
  )
}