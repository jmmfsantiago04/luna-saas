export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando clientes">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="h-9 w-full animate-pulse rounded bg-muted" />
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
