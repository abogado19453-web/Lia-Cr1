'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell, BookOpen, Briefcase, Crown, CreditCard, FileText, FolderOpen, Home, LogOut, Menu, MessageSquare,
  Moon, PenLine, Scale, Settings, Share2, ShieldCheck, Stamp, Sun, Users, X,
} from 'lucide-react';
import { marca } from '@/lib/config';
import { cerrarSesion } from '@/app/(auth)/actions';

const GRUPOS = [
  { titulo: 'Principal', items: [{ href: '/dashboard', label: 'Inicio', icon: Home }] },
  {
    titulo: 'Herramientas',
    items: [
      { href: '/dashboard/alertas', label: 'Alertas', icon: Bell },
      { href: '/dashboard/asistente', label: 'Asistente IA', icon: MessageSquare },
      { href: '/dashboard/laboral', label: 'Derecho Laboral', icon: Briefcase },
      { href: '/dashboard/documentos', label: 'Documentos', icon: FileText },
      { href: '/dashboard/expedientes', label: 'Expedientes', icon: FolderOpen },
      { href: '/dashboard/guia', label: 'Guía de uso', icon: BookOpen },
      { href: '/dashboard/jurisprudencia', label: 'Jurisprudencia', icon: Scale },
      { href: '/dashboard/portal', label: 'Portal Cliente', icon: Share2 },
      { href: '/dashboard/protocolo', label: 'Protocolo', icon: Stamp },
      { href: '/dashboard/redactor', label: 'Redactor Legal', icon: PenLine },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { href: '/dashboard/equipo', label: 'Equipo', icon: Users, admin: true },
      { href: '/dashboard/plan', label: 'Mi plan', icon: CreditCard },
      { href: '/dashboard/ajustes', label: 'Ajustes', icon: Settings },
      { href: '/dashboard/plataforma', label: 'Plataforma', icon: ShieldCheck, plataforma: true },
    ],
  },
];

type Props = { nombre: string; email: string; rol: string; despacho: string; alertasUrgentes: number; plan: string; pagado: boolean; adminPlataforma: boolean };

export function Sidebar({ nombre, email, rol, despacho, alertasUrgentes, plan, pagado, adminPlataforma }: Props) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => setOscuro(document.documentElement.classList.contains('dark')), []);
  useEffect(() => setAbierto(false), [path]);

  function alternarTema() {
    const v = !oscuro;
    document.documentElement.classList.toggle('dark', v);
    try { localStorage.setItem('tema', v ? 'dark' : 'light'); } catch {}
    setOscuro(v);
  }

  const activo = (href: string) => (href === '/dashboard' ? path === href : path.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 md:hidden">
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú"><Menu size={22} /></button>
        <span className="font-serif text-lg font-semibold">{marca.nombre}</span>
      </header>
      {abierto && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setAbierto(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-side text-[#d9e4df] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${abierto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-accent font-serif text-xl text-accent">{marca.nombre[0]}</div>
          <div>
            <div className="font-serif text-xl leading-tight text-white">{marca.nombre}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#8ea89f]">{marca.pais}</div>
          </div>
          <button className="ml-auto md:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <div className="mx-4 mb-2 border-b border-white/10 pb-3">
          <div className="truncate text-sm font-semibold uppercase text-white">{despacho}</div>
          <div className="text-xs text-[#8ea89f]">{rol === 'administrador' ? 'Administrador' : 'Miembro'} · <span className="text-accent">{plan}</span></div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <div className="mx-2 mb-1 mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea89f]">{g.titulo}</div>
              {g.items
                .filter((i) => (!('admin' in i) || rol === 'administrador') && (!('plataforma' in i) || adminPlataforma))
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${activo(i.href) ? 'bg-white/10 text-white shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-white/5'}`}
                  >
                    <i.icon size={17} strokeWidth={1.7} />
                    {i.label}
                    {i.href === '/dashboard/alertas' && alertasUrgentes > 0 && (
                      <span className="ml-auto rounded-full bg-accent px-2 text-[11px] text-white">{alertasUrgentes}</span>
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          {!pagado && (
            <Link href="/dashboard/plan" className="flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              <Crown size={16} /> Mejorar mi plan
            </Link>
          )}
          <button onClick={alternarTema} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
            {oscuro ? <Sun size={16} /> : <Moon size={16} />} {oscuro ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{nombre[0]?.toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold uppercase text-white">{nombre}</div>
              <div className="truncate text-[11px] text-[#8ea89f]">{email}</div>
            </div>
          </div>
          <form action={cerrarSesion}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5"><LogOut size={16} /> Cerrar sesión</button>
          </form>
        </div>
      </aside>
    </>
  );
}

