'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Save, Sparkles, Square } from 'lucide-react';
import { useIAStream } from '@/components/useIAStream';
import { guardarGenerado } from '../documentos/actions';

const PLANTILLAS: Record<string, string[]> = {
  escritura: [
    'Compraventa de bien inmueble',
    'Compraventa de vehículo',
    'Hipoteca en primer grado',
    'Cancelación de hipoteca',
    'Poder generalísimo',
    'Poder general',
    'Poder especial',
    'Constitución de sociedad anónima',
    'Constitución de sociedad de responsabilidad limitada',
    'Donación',
    'Segregación y venta',
    'Afectación a patrimonio familiar',
    'Capitulaciones matrimoniales',
    'Protocolización de acta de asamblea',
    'Testamento abierto',
  ],
  contrato: [
    'Arrendamiento habitacional',
    'Arrendamiento comercial',
    'Contrato de trabajo',
    'Prestación de servicios profesionales',
    'Préstamo con garantía',
    'Opción de compra',
    'Confidencialidad',
    'Promesa recíproca de compraventa',
  ],
  procesal: [
    'Recurso de apelación',
    'Recurso de revocatoria con apelación en subsidio',
    'Demanda ordinaria',
    'Proceso monitorio dinerario',
    'Contestación de demanda',
    'Recurso de amparo',
    'Incidente de nulidad',
    'Solicitud de medida cautelar',
  ],
  otro: ['Carta de cobro', 'Dictamen jurídico', 'Certificación notarial', 'Declaración jurada'],
};

const CLASES = [
  { v: 'escritura', l: 'Escritura pública' },
  { v: 'contrato', l: 'Contrato privado' },
  { v: 'procesal', l: 'Escrito procesal' },
  { v: 'otro', l: 'Otro documento' },
];

type Props = { expedientes: { id: string; numero: string; titulo: string }[]; expedienteInicial?: string };

export function Redactor({ expedientes, expedienteInicial }: Props) {
  const router = useRouter();
  const ia = useIAStream();
  const [clase, setClase] = useState('escritura');
  const [tipo, setTipo] = useState(PLANTILLAS.escritura[0]);
  const [datos, setDatos] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [expedienteId, setExpedienteId] = useState(expedienteInicial ?? '');
  const [borrador, setBorrador] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (ia.cargando) setBorrador(ia.texto);
  }, [ia.texto, ia.cargando]);

  async function generar() {
    const r = await ia.ejecutar('/api/ia/redactar', { clase, tipo, datos, instrucciones });
    setBorrador(r.texto);
  }

  async function guardar() {
    setGuardando(true);
    const id = await guardarGenerado({ nombre: tipo, clase, contenido: borrador, expedienteId: expedienteId || undefined });
    router.push(`/dashboard/documentos/${id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="card space-y-3 self-start">
        <label className="label">Clase
          <select className="input" value={clase} onChange={(e) => { setClase(e.target.value); setTipo(PLANTILLAS[e.target.value][0]); }}>
            {CLASES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </label>
        <label className="label">Tipo de documento
          <input className="input" list="tipos" value={tipo} onChange={(e) => setTipo(e.target.value)} />
          <datalist id="tipos">{PLANTILLAS[clase].map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="label">Expediente (opcional)
          <select className="input" value={expedienteId} onChange={(e) => setExpedienteId(e.target.value)}>
            <option value="">Sin expediente</option>
            {expedientes.map((x) => <option key={x.id} value={x.id}>{x.numero} — {x.titulo}</option>)}
          </select>
        </label>
        <label className="label">Datos del caso
          <textarea className="input min-h-36" value={datos} onChange={(e) => setDatos(e.target.value)}
            placeholder={'Partes y calidades, cédulas, citas de inscripción, plano catastrado, precio, plazo, lugar de otorgamiento…\nLo que falte quedará entre [corchetes].'} />
        </label>
        <label className="label">Instrucciones adicionales
          <textarea className="input min-h-20" value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)}
            placeholder="Ej.: incluir cláusula de saneamiento por evicción; la finca soporta servidumbre de paso." />
        </label>
        {ia.cargando ? (
          <button className="btn w-full" onClick={ia.detener}><Square size={15} /> Detener</button>
        ) : (
          <button className="btn w-full" onClick={generar} disabled={tipo.trim().length < 2}><Sparkles size={15} /> Generar borrador</button>
        )}
        {ia.error && <p className="text-sm text-red-600">{ia.error}</p>}
      </div>

      <div className="card flex min-h-[70vh] flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Borrador</h2>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={!borrador} onClick={() => navigator.clipboard.writeText(borrador)}><Copy size={14} /> Copiar</button>
            <button className="btn" disabled={!borrador || ia.cargando || guardando} onClick={guardar}><Save size={14} /> {guardando ? 'Guardando…' : 'Guardar en Documentos'}</button>
          </div>
        </div>
        <textarea
          className="input prose-legal flex-1 resize-none"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          readOnly={ia.cargando}
          placeholder="El borrador aparecerá aquí. Puede editarlo antes de guardarlo."
        />
        {clase === 'escritura' && <p className="mt-2 text-xs text-muted">Al exportar a Word, la escritura se numera por líneas en el margen izquierdo, reiniciando en cada página.</p>}
      </div>
    </div>
  );
}
