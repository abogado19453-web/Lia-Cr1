# LexCR

Plataforma web para despachos legales y notariales de Costa Rica. **LexCR** es un nombre provisional: se cambia en `src/lib/config.ts`.

## Módulos

| Módulo | Función |
| --- | --- |
| **Inicio** | Accesos a las tareas principales, consulta directa y próximos vencimientos |
| **Alertas** | Plazos, audiencias y vencimientos; el menú indica los que vencen en ≤ 3 días |
| **Asistente IA** | Consultas jurídicas con historial de conversaciones (Claude) |
| **Derecho Laboral** | Liquidación: preaviso (art. 28), cesantía (art. 29, tope 8 años), vacaciones y aguinaldo (Ley 2412) |
| **Documentos** | Subida de PDF/DOCX/TXT, extracción de texto, análisis con IA y exportación a Word |
| **Expedientes** | Ficha del asunto, bitácora de actuaciones, plazos, documentos y cliente |
| **Guía de uso** | Instrucciones por módulo |
| **Jurisprudencia** | Búsqueda asistida limitada a fuentes oficiales (Poder Judicial, PGR/SCIJ, TRA, DNN), con enlaces citados, y biblioteca de votos del despacho |
| **Portal Cliente** | Enlace privado y revocable por cliente; solo muestra lo marcado como visible |
| **Protocolo** | Control de escrituras por tomo y folio, estado registral, citas de presentación e índice CSV por rango de fechas |
| **Redactor Legal** | Escrituras en formato de protocolo (texto corrido, cantidades en letras), contratos y escritos procesales, con marcadores `[Insertar …]`. Las escrituras se exportan a Word con numeración de líneas por página |
| **Equipo** | Alta de miembros y roles (administrador y miembro) |
| **Ajustes** | Perfil, carné, nombre del despacho y contraseña |

Cada despacho es independiente: sus usuarios solo acceden a los datos de su propio despacho.

## Tecnología

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma (SQLite en desarrollo, PostgreSQL en producción) · SDK de Anthropic (`claude-opus-5-5`, respaldo automático del servidor ante rechazos) · sesiones JWT firmadas en cookie `httpOnly` · contraseñas con bcrypt.

## Puesta en marcha

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env      # complete AUTH_SECRET y ANTHROPIC_API_KEY
npx prisma db push        # crea la base de datos
npm run dev               # http://localhost:3000
```

Abra `/registro` para crear el despacho; la primera cuenta queda como administradora.

- `AUTH_SECRET`: genere uno con `openssl rand -base64 32`.
- `ANTHROPIC_API_KEY`: se obtiene en https://console.anthropic.com/. Sin ella, todo funciona salvo el asistente, el redactor, el análisis y la búsqueda de jurisprudencia, que muestran un aviso.

## Producción

1. En `prisma/schema.prisma` cambie `provider = "sqlite"` por `provider = "postgresql"` y use una `DATABASE_URL` de PostgreSQL (por ejemplo Supabase, Neon o un servidor propio).
2. `npm run build && npm start`.
3. Los archivos subidos se guardan en `UPLOAD_DIR`. En alojamientos sin disco persistente (como Vercel) hay que usar un volumen o un almacenamiento de objetos.

## Pruebas

```bash
npm test        # cálculos laborales
npm run lint    # verificación de tipos
```

## Confidencialidad

Los textos enviados al asistente, al redactor y al análisis se procesan con la API de Anthropic. Valore, conforme al secreto profesional, qué datos de clientes incluir.
