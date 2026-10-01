import 'server-only';

/** Extrae texto de PDF, DOCX o texto plano. Devuelve null si el formato no es compatible. */
export async function extraerTexto(buf: Buffer, mime: string, nombre: string): Promise<string | null> {
  const ext = nombre.toLowerCase().split('.').pop();
  if (mime === 'application/pdf' || ext === 'pdf') {
    const pdf = (await import('pdf-parse')).default;
    return (await pdf(buf)).text;
  }
  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') return buf.toString('utf8');
  return null;
}
