import { marca } from '@/lib/config';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border-2 border-accent font-serif text-2xl text-accent">
            {marca.nombre[0]}
          </div>
          <h1 className="text-3xl font-semibold">{marca.nombre}</h1>
          <p className="text-sm text-muted">{marca.lema} · {marca.pais}</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
