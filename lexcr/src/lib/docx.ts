import 'server-only';
import { AlignmentType, Document, LineNumberRestartFormat, Packer, Paragraph, TextRun } from 'docx';

const CM = 567; // twips por centímetro

/**
 * Genera un .docx. Las escrituras se exportan como texto corrido, justificado,
 * con numeración de líneas en el margen izquierdo que reinicia en cada página.
 */
export async function generarDocx(contenido: string, opciones: { escritura: boolean }) {
  const parrafos = contenido.replace(/\r/g, '').split('\n');
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 2.5 * CM, bottom: 2.5 * CM, left: 3 * CM, right: 2 * CM } },
          ...(opciones.escritura
            ? { lineNumbers: { countBy: 1, start: 1, restart: LineNumberRestartFormat.NEW_PAGE, distance: 0.4 * CM } }
            : {}),
        },
        children: parrafos.map(
          (p) =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: opciones.escritura ? 360 : 300, after: opciones.escritura ? 0 : 160 },
              children: [new TextRun(p)],
            }),
        ),
      },
    ],
  });
  return Packer.toBuffer(doc);
}
