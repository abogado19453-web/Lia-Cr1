import type { Fuente } from './useIAStream';

export function Fuentes({ fuentes }: { fuentes: Fuente[] }) {
  if (!fuentes.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-line bg-bg p-3 text-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Fuentes consultadas</div>
      <ol className="list-decimal space-y-1 pl-5">
        {fuentes.map((f) => (
          <li key={f.url}>
            <a className="text-accent underline" href={f.url} target="_blank" rel="noopener noreferrer">{f.titulo || f.url}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}
