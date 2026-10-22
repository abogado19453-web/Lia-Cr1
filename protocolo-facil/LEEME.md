# Protocolo Fácil 0.3

Programa local para redactar, distribuir e imprimir escrituras sobre el papel de protocolo costarricense, en Mac, sin instalar nada.

Reconstrucción propia a partir de las funciones observadas en los componentes del instalador Windows 1.3.3. **No es una conversión binaria ni una réplica del programa original.** Todo el código fuente está incluido.

---

## Abrir el programa

**Camino corto (un solo archivo):** abrí `dist/ProtocoloFacil-0.3.0.html` con doble clic. Es la aplicación entera en un archivo; no instala nada.

**Camino con lanzador (recomendado para uso diario):**

1. Descomprimí `dist/ProtocoloFacil-Mac-0.3.0.zip` con Finder.
2. Arrastrá `ProtocoloFacil.app` a Aplicaciones, o dejala en una carpeta permanente.
3. Abrila. El lanzador copia la interfaz a `~/Library/Application Support/ProtocoloFacil/Interface` y la abre en Safari.

El lanzador no tiene firma Developer ID ni certificación de Apple. Si macOS bloquea su apertura, consultá las opciones para esa aplicación concreta en la guía oficial: <https://support.apple.com/es-es/guide/mac-help/mh40616/mac>. No hace falta desactivar la seguridad del equipo.

> **Importante:** cada camino usa su propio almacenamiento. Elegí uno y quedate con él, o vas a ver libros distintos según cómo abriste el programa.

---

## Qué hace

**Libros y tomos.** Nombre, número de tomo, cantidad de folios, razones de apertura y cierre guardadas en el libro.

**Escrituras.** Número, fecha, hora, acto, otorgantes, estado, notas internas y texto. Posición inicial por folio, cara y renglón, con propuesta del siguiente renglón libre del tomo.

**Distribución por folios.** El texto se reparte entre frente y vuelto recalculando el ancho útil de cada cara. Vista con zoom, impresión por rango de caras o filtrada por frente/vuelto, y guardado en PDF desde el diálogo de impresión de macOS.

**Piezas notariales.** Razón de apertura del tomo, razón de cierre, razón de testimonio (distingue el primero de los ulteriores) y razón de entrelineados y testaduras, armada desde el marcado del texto.

**Marcado notarial.** Escribí `«así»` lo entrelineado y `[[así]]` lo testado; el botón correspondiente arma la razón final.

**Mapa de folios.** Ocupación de todo el tomo, con los choques de renglón señalados en rojo. La impresión se bloquea si dos escrituras comparten renglones.

**Conversión a letras.** Enteros hasta doce cifras, ordinales, importes con céntimos en colones, dólares y euros, fechas y horas en la forma de la comparecencia.

**Índice de trabajo.** En pantalla y en CSV, con posiciones inicial y final calculadas. No es la presentación oficial del índice notarial.

**Honorarios y timbres.** Estimación por tramos con tabla **editable**. Los valores iniciales son una base de trabajo marcada «verificar vigencia»: confrontá el arancel y la normativa tributaria y registral vigentes antes de liquidar.

**Calibración.** Ancho, alto, renglones, separación, fuente y tamaño; márgenes y desplazamientos X/Y independientes para cada cara; hojas de prueba con guías que no se imprimen en las escrituras.

**Respaldos.** JSON del conjunto completo, más un anillo de doce instantáneas internas accesibles desde Inicio. Los respaldos de las ediciones 0.1 y 0.2 se abren y se elevan automáticamente.

---

## Primera impresión

1. En **Configurar impresión**, ingresá las medidas reales de tu papel y la cantidad de renglones. Medí del renglón uno al once y dividí entre diez para obtener la separación.
2. Guardá el perfil. Las pruebas usan el perfil guardado, no los campos todavía sin guardar.
3. Imprimí una prueba de frente y otra de vuelto **en papel común**.
4. En el diálogo de Safari: tamaño de papel exacto, escala **100 %**, sin ajuste automático al área imprimible, sin encabezados ni pies del navegador.
5. Compará con el papel real. X positivo mueve a la derecha; Y positivo mueve hacia abajo. Ajustá cada cara y repetí hasta que coincida.
6. Para un PDF, elegí guardar como PDF en el mismo diálogo. El estado de la escritura no cambia al imprimir: marcá «Impresa» después de comprobar el resultado físico.

---

## Guardado y respaldos

Los datos viven en el almacenamiento local del navegador. **No equivalen a archivos de protocolo en disco.** No uses navegación privada. Borrar los datos de Safari, cambiar de navegador o abrir la interfaz desde otra ubicación puede dejar inaccesible lo anterior.

Antes de eliminar una escritura, restaurar un respaldo, sustituir un texto o cambiar el perfil, el programa guarda una instantánea interna y descarga una copia del estado actual. Comprobá que la descarga se complete: el navegador puede bloquearla.

Si el navegador no permite guardar, el programa avisa y mantiene el trabajo en memoria. Descargá el JSON antes de cerrar.

**Restaurar sustituye el conjunto completo; no combina libros.** No importa bases SQLite ni ZIP de Windows.

---

## Diferencias con el programa Windows

No se implementaron: sincronización web, licencias, servicios remotos, firma digital, auditoría remota, importación de SQLite, versiones históricas de escrituras, editor enriquecido, trazos libres, entrelineados dibujados sobre documentos ya impresos ni generación completa de testimonios sobre papel de seguridad. El estado «Firmada» es una anotación manual, no una firma electrónica. No se incluyen modelos jurídicos verificados: los de ejemplo son estructuras de trabajo con marcadores.

Estas limitaciones se declaran expresamente para que esta edición se use sin confundirla con el producto original.

---

## Código y pruebas

```
app/engine.js      núcleo de cálculo (sin navegador): geometría, paginación, letras, respaldos
app/notarial.js    razones, testimonios, mapa de folios, índice, honorarios y timbres
app/store.js       almacenamiento e instantáneas
app/ui.js          interfaz
app/index.html     estructura de las pantallas
app/style.css      apariencia
mac/               paquete .app y lanzador
pruebas/           252 comprobaciones automáticas
herramientas/      generador del archivo único
construir.sh       pruebas + empaquetado completo
```

Con Node instalado:

```sh
node pruebas/engine.test.cjs
node pruebas/notarial.test.cjs
node pruebas/store.test.cjs
node pruebas/paginacion.test.cjs

bash construir.sh      # todo lo anterior y además arma dist/
```

El programa **no necesita Node para abrirse**. `VALIDACION.md` documenta qué se comprobó y qué queda pendiente. `GUIA-VIBECODING.md` explica cómo seguir mejorándolo sin editor de código. `PRD.md` contiene los requerimientos.
