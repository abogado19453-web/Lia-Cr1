# PRD — Protocolo Fácil 0.4

**Documento de requerimientos de producto**
Responsable funcional: notario público en ejercicio (Costa Rica).
Fecha: 23 de octubre de 2026. Estado: versión 0.4 construida como aplicación de escritorio con instaladores para Windows y Mac; pendientes de validación en ambos sistemas y en impresora física.

---

## 1. Problema

El trabajo de protocolo en Costa Rica exige que el texto de cada escritura caiga exactamente sobre los renglones impresos del papel de seguridad suministrado por la Dirección Nacional de Notariado. Los procesadores de texto comunes no controlan esa geometría: no conocen el concepto de folio, frente y vuelto, renglón inicial, ni la continuidad de una escritura entre caras.

El programa Windows de referencia (1.3.3) resuelve el problema, pero depende de .NET/WPF y no corre en Mac. Las ediciones 0.1 y 0.2 de esta reconstrucción cubrieron la geometría y la impresión; dejaron fuera las piezas propiamente notariales y acumularon deuda técnica. La 0.3 cerró esas dos brechas, pero seguía siendo una página que se abría en el navegador: sin instalador, sin icono y, sobre todo, **con los datos en el almacenamiento del navegador**, donde borrar la caché podía dejar el trabajo inaccesible. Para un despacho en ejercicio eso no es aceptable.

## 2. Usuario

Notario público costarricense en ejercicio individual o despacho pequeño, con Mac o con Windows, sin equipo de sistemas. Redacta entre cinco y cuarenta escrituras por mes. Trabaja contra plazos registrales y no tolera pérdida de datos ni desperdicio de papel de protocolo.

## 3. Objetivos

Vigentes desde la 0.3:

| # | Objetivo | Medida de cumplimiento |
|---|---|---|
| O1 | Que el texto caiga sobre el renglón correcto en ambas caras | Prueba de calibración coincide con el papel físico; desplazamientos X/Y independientes por cara |
| O2 | Eliminar el riesgo de choque de renglones entre escrituras | Mapa de folios del tomo; bloqueo de impresión ante superposición |
| O3 | Cubrir las piezas notariales que faltaban | Razón de apertura, de cierre, de testimonio y de entrelineados generadas desde los datos del tomo |
| O4 | Reducir el riesgo de pérdida de datos | Instantáneas internas antes de cada operación destructiva, además del respaldo |
| O5 | Código mantenible por un no programador asistido | Módulos con responsabilidad única, sin parcheo cruzado, con pruebas automáticas |

Propios de la 0.4:

| # | Objetivo | Medida de cumplimiento |
|---|---|---|
| O6 | Que sea una aplicación, no una página | Instalador propio por sistema, icono, menú nativo y ventana propia |
| O7 | Que los datos no dependan del navegador | Archivos en disco con escritura atómica; prueba que cierra y reabre la aplicación y comprueba que todo siguió ahí |
| O8 | Que funcione igual en Windows y en Mac | Un solo código de interfaz; paquetes para Windows x64, Mac Intel y Mac Apple Silicon |
| O9 | Que la aplicación no pueda ser usada contra el usuario | Interfaz aislada sin Node, política de seguridad estricta, el proceso principal sólo admite sus dos archivos |

### Fuera de alcance (declarado)

Firma digital, sincronización en la nube, licenciamiento, importación de la base SQLite del programa Windows, auditoría remota, editor enriquecido, entrelineados dibujados sobre documentos ya impresos, generación completa del testimonio con su papel de seguridad, y modelos jurídicos verificados para un caso concreto. El estado «Firmada» es una anotación manual, no una firma electrónica.

También queda fuera la **firma de editor**: certificado de firma de código para Windows y firma Developer ID con certificación de Apple. Ambos exigen cuentas de pago, y el de Apple además un Mac para firmar y enviar a certificar. Su ausencia es visible para el usuario: SmartScreen y Gatekeeper advierten en la primera apertura.

## 4. Requerimientos funcionales

### RF-1 Libros y tomos
- Crear, editar y seleccionar libros con nombre, número de tomo y cantidad de folios.
- Guardar las razones de apertura y cierre dentro del libro.

### RF-2 Escrituras
- Número, fecha, hora, acto, otorgantes, estado, notas internas y texto.
- Posición inicial: folio, cara (frente/vuelto) y renglón.
- Propuesta automática del primer renglón libre del tomo, revisable por el usuario.
- Control de números duplicados dentro del libro.

### RF-3 Distribución por folios
- Reparto del texto por caras recalculando el ancho útil en cada una.
- Vista de todas las caras con zoom y avisos.
- Impresión por rango de caras y filtrada por frente o vuelto.

### RF-4 Piezas notariales
- Razón de apertura del tomo, con folios y datos del notario en letras.
- Razón de cierre, con última escritura y último folio utilizado.
- Razón de testimonio, distinguiendo el primero de los ulteriores.
- Razón de entrelineados y testaduras, a partir del marcado `«…»` y `[[…]]`.

### RF-5 Conversión a letras
- Enteros hasta doce cifras, con apócope y concordancia de género.
- Ordinales hasta 999, para cláusulas y tomos.
- Importes con céntimos en colones, dólares y euros, con el enlace «de» ante millones exactos.
- Fechas y horas en la forma usada en la comparecencia.

### RF-6 Índice y liquidación
- Índice de trabajo del libro, en pantalla y en CSV, con posiciones inicial y final calculadas.
- Estimación de honorarios por tramos y de timbres, con tabla de tarifas **editable** por el usuario.

### RF-7 Datos y respaldos
- **En la aplicación: archivos reales del disco**, con escritura atómica, en la carpeta de datos del usuario. No se tocan al reinstalar ni al actualizar.
- Respaldo automático fechado antes de cada operación irreversible, conservando los 200 más recientes.
- Anillo de doce instantáneas internas, con recuperación desde la pantalla de inicio.
- Respaldo y restauración en JSON validado, con los cuadros de diálogo del sistema.
- En la versión web: almacenamiento del navegador, con migración automática de los respaldos 0.1 y 0.2.

### RF-9 Aplicación de escritorio
- Instalador por sistema: `.exe` para Windows, paquete con script de instalación para Mac Intel y Apple Silicon.
- Menú nativo en español con atajos, acceso a la carpeta de datos e impresión.
- Guardado directo a PDF con el tamaño exacto del papel configurado.
- Una sola instancia a la vez.

### RF-8 Calibración
- Ancho, alto, renglones, separación, fuente y tamaño.
- Márgenes y desplazamientos X/Y independientes para frente y vuelto.
- Hojas de prueba con guías y numeración de renglón, que no se imprimen en las escrituras.

## 5. Requerimientos no funcionales

- **RNF-1 Sin instalación.** Safari sobre macOS; también un archivo `.html` único que abre con doble clic. Sin Node, sin .NET, sin Wine, sin extensiones.
- **RNF-2 Sin red.** La aplicación no realiza ninguna petición externa. Los datos no salen del equipo.
- **RNF-3 Accesibilidad.** Texto de al menos 16 px, contraste alto, foco visible, navegación por teclado, cierre de modales con Escape.
- **RNF-4 Ventanas angostas.** Sin desborde horizontal de 390 a 1440 px de ancho.
- **RNF-5 Integridad.** Ninguna operación destructiva se ejecuta sin instantánea previa y confirmación.
- **RNF-6 Verificabilidad.** El núcleo de cálculo no toca el DOM y se ejercita con Node.

## 6. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Pérdida de los datos | En la aplicación viven en archivos del disco, con escritura atómica, instantáneas y respaldos fechados. En la web siguen dependiendo del navegador, y así se le advierte al usuario |
| El usuario no puede instalar por las advertencias del sistema | Instrucciones explícitas para SmartScreen y Gatekeeper en LEEME y en el LEEME del paquete de Mac; firma ad-hoc para que la aplicación al menos se ejecute en Apple Silicon |
| La impresora no respeta la escala | Hojas de calibración por cara y recordatorio de escala 100 % sin ajuste al área imprimible |
| Las tarifas de timbres y honorarios cambian | La tabla es editable y los valores iniciales están marcados «verificar vigencia» |
| Dos escrituras sobre el mismo renglón | Mapa de folios y bloqueo de impresión |
| Las fuentes del Mac miden distinto que en pruebas | La medición real usa Canvas en el navegador; la calibración física es obligatoria antes de usar papel de protocolo |

## 7. Criterios de aceptación de la versión

1. Las 303 comprobaciones automáticas pasan en limpio. **Cumplido**
2. La aplicación arranca, guarda en disco y conserva todo al cerrarse y volver a abrirse. **Cumplido** (probado con Electron real)
3. La interfaz no tiene acceso a Node y el proceso principal rechaza rutas ajenas. **Cumplido**
4. El PDF generado mide el papel configurado. **Cumplido** (216,2 × 330,2 mm contra 216 × 330)
5. Ninguna pantalla desborda horizontalmente entre 390 y 1440 px. **Cumplido**
6. Un respaldo de la edición 0.2 se restaura sin pérdida de datos. **Cumplido**
7. El instalador de Windows corre y deja la aplicación utilizable. **Pendiente**
8. El instalador de Mac corre y la aplicación abre en Apple Silicon. **Pendiente**
9. Las hojas de calibración coinciden con el papel físico. **Pendiente**

## 8. Siguientes versiones (propuesta)

- **0.5** — Impresión continua por folio de varias escrituras del tomo en un solo envío.
- **0.6** — Búsqueda global entre libros e historial de versiones por escritura.
- **0.7** — Modelos notariales revisados por acto, con referencias normativas verificadas.
- **0.8** — Exportación del índice en el formato de presentación que exija la DNN al momento.
- **Sin número** — Firma de editor en ambos sistemas, si se abren las cuentas de desarrollador. Es lo único que elimina las advertencias de instalación.
