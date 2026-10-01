'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { alternarAlerta, borrarAlerta } from '@/app/dashboard/alertas/actions';

const TIPOS: Record<string, string> = { plazo: 'Plazo', audiencia: 'Audiencia', vencimiento: 'Vencimiento', recordatorio: 'Recordatorio' };

type Props = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  dias: number;
  completada: boolean;
  expediente?: { id: string; numero: string } | null;
  mostrarExpediente?: boolean;
};

export function AlertaFila({ id, titulo, tipo, fecha, dias, completada, expediente, mostrarExpediente = true }: Props) {
  const color = completada ? 'text-muted' : dias < 0 || dias <= 3 ? 'font-semibold text-red-600' : dias <= 10 ? 'text-amber-600' : 'text-emerald-700';
  return (
    <tr className={completada ? 'opacity-60' : ''}>
      <td className="w-8"><input type="checkbox" aria-label="Marcar como atendida" defaultChecked={completada} onChange={(e) => alternarAlerta(id, e.target.checked)} /></td>
      <td className={completada ? 'line-through' : ''}>{titulo}</td>
      <td><span className="tag">{TIPOS[tipo] ?? tipo}</span></td>
      {mostrarExpediente && <td>{expediente ? <Link className="underline" href={`/dashboard/expedientes/${expediente.id}`}>{expediente.numero}</Link> : '—'}</td>}
      <td className="whitespace-nowrap">{fecha}</td>
      <td className={`whitespace-nowrap ${color}`}>{completada ? 'Atendida' : dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? 'Vence hoy' : `${dias} d`}</td>
      <td className="w-8"><button aria-label="Eliminar" onClick={() => confirm('¿Eliminar esta alerta?') && borrarAlerta(id)}><Trash2 size={14} /></button></td>
    </tr>
  );
}
