export function PageHead({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{titulo}</h1>
        {descripcion && <p className="mt-1 text-muted">{descripcion}</p>}
      </div>
      {children}
    </div>
  );
}
