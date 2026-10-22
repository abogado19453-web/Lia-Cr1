# Validación — Protocolo Fácil 0.3.0

Fecha de preparación: 22 de octubre de 2026 (Costa Rica).
Entorno de preparación: Linux. **No se ejecutó en macOS ni en una impresora física.**

---

## 1. Origen del código

El ZIP recibido de la edición 0.2.0 contiene la aplicación como HTML y JavaScript dentro del paquete `ProtocoloFacil.app` (`Contents/Resources/`). **No estaba compilada**: no hubo que descompilar nada, el código fuente era legible de forma directa.

A su vez, aquella edición declaraba haberse construido a partir de la inspección estática del instalador Windows 1.3.3 (`.NETCoreApp,Version=v9.0/win-x64`, WPF, módulos `NuevoProtocolo`, `Protocolo.Core`, `Protocolo.Data`, `Protocolo.Impresion`), sin disponer de su código fuente.

La edición 0.3 es código nuevo. Se conservó y documentó el algoritmo de paginación de la 0.2 por estar verificado; el resto se reescribió. No se ejecutó ni se alteró el instalador Windows.

## 2. Comprobaciones automáticas aprobadas

### Sintaxis y estructura
- `node --check` sobre `engine.js`, `notarial.js`, `store.js` y `ui.js`.
- `bash -n` sobre el ejecutable del paquete y el lanzador `.command`.
- Lectura estructural de `Info.plist` y correspondencia con el ejecutable declarado.
- El archivo único generado no conserva ninguna referencia externa (comprobado por el propio empaquetador).

### Núcleo de cálculo — 25 pruebas (`pruebas/engine.test.cjs`)
Normalización de texto; validación de geometría (renglones fuera del papel, separación menor que la fuente); corte de renglones y de palabras más anchas que el área útil; conservación del texto entre caras; respeto del renglón inicial y de la capacidad; uso del ancho propio de cada cara; marca de última cara y posición final; unicidad de posiciones; avance de folio y cara; números, ordinales, importes con céntimos, fechas y horas en letras; rechazo de fechas y horas imposibles; CSV con neutralización de fórmulas; RTF con escape de llaves y caracteres fuera de ASCII; validación del respaldo y **elevación automática de un respaldo de la edición anterior**.

### Módulo notarial — 19 pruebas (`pruebas/notarial.test.cjs`)
Separación de entrelineados y testaduras; razón de entrelineados; razones de apertura, cierre y testimonio con sus datos en letras; exigencia del nombre del notario; detección de renglones ocupados por dos escrituras; ausencia de falsos choques en escrituras consecutivas; propuesta del renglón libre siguiente; filas y encabezados del índice; honorarios por tramos acumulativos y honorario mínimo; timbres por porcentaje y monto fijo; totales de la liquidación; sustitución de campos de plantilla y permanencia visible de los campos sin dato.

### Persistencia — 8 pruebas (`pruebas/store.test.cjs`)
Estado inicial sin datos previos; ida y vuelta de guardado; lectura de la clave de la edición anterior; aviso ante datos corrompidos; registro y recuperación de instantáneas; límite del anillo de doce; error con índice inexistente; marcado de sesión no escribible cuando el almacenamiento se llena.

### Paginación — 200 escenarios (`pruebas/paginacion.test.cjs`)
Generador determinista (xorshift32, semillas 1 a 200). Los **200 escenarios generados fueron válidos y se comprobaron**, con márgenes, renglones, separación, ancho de carácter, longitud de palabra y posición inicial variables. En cada uno se verificó: conservación de todos los caracteres, capacidad por cara, ancho de cada renglón dentro del área útil, inicio en el renglón uno al cambiar de cara, secuencia correcta de folios y caras, unicidad de posiciones, marca de última cara y coherencia de la posición final.

> Los ensayos usan una función de medición determinista para probar el algoritmo. La interfaz real mide la fuente con Canvas en el navegador; ese resultado necesita verificación en Safari con las fuentes del Mac.

### Navegador real — 25 comprobaciones (`pruebas/navegador.cjs`)
Ejecutado sobre la aplicación real con Chromium (Playwright), a partir del archivo local:

carga sin errores; inicio visible; importe y fecha/hora en letras; liquidación con su desglose; conteo de palabras; razón de entrelineados con su texto exacto; razón de primer testimonio; vista con varias caras e informe de distribución; propuesta de posición para la segunda escritura; razones de apertura y cierre generadas con los datos del notario; mapa de folios con filas y **sin choques**; índice con quince columnas y dos escrituras; carga de modelos de ejemplo; guardado del perfil con respaldo previo descargado; **persistencia de escrituras y perfil tras recargar la página**; registro de instantáneas; generación de PDF; recorrido de las ocho pantallas a 1440, 1280, 1024, 768 y 390 px **sin desborde horizontal**; y **ningún error de JavaScript en todo el recorrido**.

### Geometría del PDF
El PDF generado mide **216,2 × 330,2 mm** (medido con pypdf), frente a los 216 × 330 mm configurados. La diferencia de 0,2 mm corresponde al redondeo del motor de impresión del navegador de pruebas.

**Total: 252 comprobaciones automáticas, todas aprobadas.**

## 3. Controles pendientes

No se dispuso de macOS ni de impresora. WebKit no pudo ejecutarse por dependencias de Linux ausentes: **no se considera validado Safari por haber probado Chromium.**

Quedan pendientes, y son tuyos:

1. Reconocimiento y apertura del paquete por Finder y Gatekeeper.
2. Persistencia del almacenamiento local y descargas en Safari.
3. Diálogo de impresión real de macOS y comportamiento de la escala.
4. Tamaño físico del papel y coincidencia con los renglones impresos.
5. Márgenes efectivos, orientación y orden de frente y vuelto en impresión manual.
6. Medición de las fuentes del Mac, que puede alterar el corte de renglones.
7. Recuperación de datos en ese equipo tras cerrar y volver a abrir.

**Hasta completar el punto 4, no uses papel de protocolo: calibrá en papel común.**

## 4. Alcance jurídico

Las fórmulas de las razones son estructuras de trabajo parametrizables, no modelos oficiales ni verificados para un caso concreto. Los modelos de ejemplo de la pantalla de plantillas traen marcadores entre corchetes y deben completarse y revisarse.

Los valores iniciales de honorarios y timbres son **editables y están marcados «verificar vigencia»**. El programa no afirma que cifra alguna esté vigente; la confrontación con el arancel y con la normativa tributaria y registral aplicable corresponde al notario responsable.

El índice CSV es una herramienta de control interno y **no constituye la presentación oficial del índice notarial**. El estado «Firmada» es una anotación manual, no una firma electrónica.

La edición 0.3 conserva las diferencias funcionales respecto del programa Windows detalladas en `LEEME.md`.
