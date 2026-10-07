'use client';

export function ConfirmButton({ mensaje, className, children }: { mensaje: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(mensaje)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
