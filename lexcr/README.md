# LexCR

Plataforma web para despachos legales y notariales de Costa Rica. **LexCR** es un nombre provisional: se cambia en `src/lib/config.ts`.

## Módulos

| Módulo | Función |
| --- | --- |
| **Inicio** | Accesos a las tareas principales, consulta directa y próximos vencimientos |
| **Alertas** | Plazos, audiencias y vencimientos en lista o calendario mensual; el menú indica los que vencen en ≤ 3 días |
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
| **Inteligencia artificial** | Solo administradores: proveedores de IA (Anthropic, OpenAI, Google Gemini, servicios compatibles con OpenAI e IA local con Ollama o LM Studio), con detección de modelos, prueba de conexión, claves cifradas y autorización por usuario |
| **Ajustes** | Perfil, carné, nombre del despacho y contraseña |
| **Mi plan** | Plan vigente, consumo del mes (IA, usuarios, almacenamiento), «Mejorar mi plan», pagos por SINPE Móvil, transferencia o tarjeta, historial y recibos |
| **Plataforma** | Solo para el dueño de la plataforma: verificación de pagos con comprobante, asignación manual de planes y resumen de despachos e ingresos |

Cada despacho es independiente: sus usuarios solo acceden a los datos de su propio despacho.

## Proveedores de inteligencia artificial

En **Administración → Inteligencia artificial** el administrador agrega uno o varios proveedores, elige el predeterminado y marca qué usuarios pueden usar cada uno. Los administradores tienen acceso a todos. Cada usuario elige entre sus proveedores autorizados en el Asistente, el Redactor, el Análisis y la Jurisprudencia.

| Tipo | Dirección | Clave |
| --- | --- | --- |
| Anthropic (Claude) | fija (`api.anthropic.com`) | console.anthropic.com |
| OpenAI | fija | platform.openai.com |
| Google Gemini | fija (endpoint compatible con OpenAI) | aistudio.google.com |
| Otro servicio compatible | la del proveedor (OpenRouter, Groq, DeepSeek, Mistral…) | la del proveedor |
| IA local | `http://localhost:11434/v1` (Ollama) o `http://localhost:1234/v1` (LM Studio) | normalmente no requiere |

- Las claves se guardan cifradas (AES-256-GCM) con una clave derivada de `LEXCR_CLAVE_CIFRADO` o, si no existe, de `AUTH_SECRET`. Si cambia ese valor, las claves guardadas dejan de poder leerse y hay que volver a ingresarlas.
- La búsqueda de jurisprudencia en fuentes oficiales solo funciona con Anthropic; con otros proveedores la respuesta advierte que debe verificarse.
- Mientras el despacho no tenga proveedores configurados, se usa `ANTHROPIC_API_KEY` del archivo `.env`.
- En un servidor compartido, `LEXCR_BLOQUEAR_IA_LOCAL="true"` impide conectar direcciones de red local.

## Planes y cobro

El cobro está **desactivado por defecto**: con `PLANES_ACTIVOS` distinto de `"true"` no hay límites, ni menú «Mi plan», ni «Plataforma». Para activarlo, ponga `PLANES_ACTIVOS="true"` en `.env`.

Los planes (Gratis, Profesional y Despacho), sus precios en colones y sus límites se definen en `src/lib/planes.ts`; el pago anual equivale a diez meses. Al vencer un plan, el despacho conserva todos sus datos y pasa a operar con los límites del plan Gratis.

| Método | Configuración | Activación |
| --- | --- | --- |
| SINPE Móvil | `PAGO_SINPE_NUMERO`, `PAGO_TITULAR` | El cliente reporta el comprobante; un administrador lo aprueba en «Plataforma» |
| Transferencia | `PAGO_IBAN`, `PAGO_TITULAR` | Igual que SINPE |
| Tarjeta (Stripe) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Automática al confirmarse el cobro (webhook `{APP_URL}/api/stripe/webhook`) |

Los correos de `PLATFORM_ADMIN_EMAILS` ven el menú «Plataforma». Los métodos sin configurar no se ofrecen. El recibo que emite la plataforma no sustituye la factura electrónica de Hacienda.

## Tecnología

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma (SQLite en desarrollo, PostgreSQL en producción) · SDK de Anthropic (`claude-opus-5-5`, respaldo automático del servidor ante rechazos) · sesiones JWT firmadas en cookie `httpOnly` · contraseñas con bcrypt.

## Probar en su computadora

1. Instale **Node.js LTS** desde https://nodejs.org (una sola vez).
2. Abra la carpeta del proyecto y haga doble clic en:
   - **Windows:** `Iniciar LexCR.bat`
   - **Mac:** `Iniciar LexCR.command` (si macOS lo bloquea la primera vez: clic derecho → Abrir). También puede ejecutar `bash iniciar.sh` en la Terminal.
3. La primera vez instala dependencias y compila (2 a 4 minutos). Luego abre Firefox, o el navegador predeterminado si Firefox no está instalado, en http://localhost:3000/registro.

Para activar la inteligencia artificial, abra el archivo `.env` y pegue su clave de Anthropic en `ANTHROPIC_API_KEY`; luego cierre y vuelva a abrir LexCR.

Si algo no funciona, haga doble clic en **`Diagnostico LexCR`** (`.bat` en Windows, `.command` en Mac): revisa archivos, configuración y la conexión con Anthropic sin mostrar la clave, y guarda el resultado en `diagnostico.txt`.

## Puesta en marcha manual

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

### Ingreso con Google (opcional)

1. En https://console.cloud.google.com/apis/credentials cree un **ID de cliente OAuth** de tipo *Aplicación web*.
2. Agregue como URI de redirección autorizado: `{APP_URL}/api/auth/google/callback` (en local: `http://localhost:3000/api/auth/google/callback`).
3. Complete `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `APP_URL` en `.env`.

El botón «Continuar con Google» aparece solo cuando estas variables están configuradas. Si el correo ya tiene cuenta, ingresa a ella; si no, se crea un despacho nuevo con esa persona como administradora.

## Producción

### Con Docker

```bash
cp .env.example .env   # complete las variables
docker compose up -d --build
```

La base de datos SQLite y los archivos subidos quedan en el volumen `lexcr-datos`.

### Sin Docker

1. En `prisma/schema.prisma` cambie `provider = "sqlite"` por `provider = "postgresql"` y use una `DATABASE_URL` de PostgreSQL (por ejemplo Supabase, Neon o un servidor propio).
2. `npm run build && npm start`.
3. Los archivos subidos se guardan en `UPLOAD_DIR`. En alojamientos sin disco persistente (como Vercel) hay que usar un volumen o un almacenamiento de objetos.

## Pruebas

```bash
npm test        # cálculos laborales
npm run lint    # verificación de tipos

# Punta a punta (con la aplicación en ejecución sobre una base vacía)
npx playwright install chromium
E2E_URL=http://localhost:3000 npm run e2e
```

## Confidencialidad

Los textos enviados al asistente, al redactor y al análisis se procesan con la API de Anthropic. Valore, conforme al secreto profesional, qué datos de clientes incluir.
