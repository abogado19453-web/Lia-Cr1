# Validación — Protocolo Fácil 0.4.0

Fecha de preparación: 23 de octubre de 2026 (Costa Rica).
Entorno de preparación: Linux. **No se ejecutó en Windows, ni en macOS, ni en una impresora física.**

---

## 1. Origen del código

El ZIP recibido de la edición 0.2.0 contenía la aplicación como HTML y JavaScript dentro del paquete `ProtocoloFacil.app` (`Contents/Resources/`). **No estaba compilada**: no hubo que descompilar nada.

Aquella edición declaraba haberse construido a partir de la inspección estática del instalador Windows 1.3.3 (`.NETCoreApp,Version=v9.0/win-x64`, WPF, módulos `NuevoProtocolo`, `Protocolo.Core`, `Protocolo.Data`, `Protocolo.Impresion`), sin disponer de su código fuente.

Las ediciones 0.3 y 0.4 son código nuevo. Se conservó el algoritmo de paginación por estar verificado. El instalador Windows original no se ejecutó ni se alteró.

---

## 2. Comprobaciones automáticas aprobadas

**Total: 303 comprobaciones, todas aprobadas.**

### Sintaxis y estructura
`node --check` sobre `engine.js`, `notarial.js`, `store.js`, `ui.js`, `main.js` y `preload.js`; `bash -n` sobre el instalador de macOS y el empaquetador. El empaquetador rechaza guiones y atributos incrustados que la política de seguridad bloquearía.

### Núcleo de cálculo — 25 pruebas (`pruebas/engine.test.cjs`)
Normalización; validación de geometría; corte de renglones y de palabras más anchas que el área útil; conservación del texto entre caras; respeto del renglón inicial y de la capacidad; ancho propio de cada cara; marca de última cara y posición final; unicidad de posiciones; avance de folio y cara; números, ordinales, importes con céntimos, fechas y horas en letras; rechazo de fechas y horas imposibles; CSV con neutralización de fórmulas; RTF con escape correcto; validación del respaldo y elevación de un respaldo de la edición anterior.

### Módulo notarial — 19 pruebas (`pruebas/notarial.test.cjs`)
Entrelineados y testaduras; razones de apertura, cierre y testimonio; exigencia del nombre del notario; detección de renglones ocupados por dos escrituras y ausencia de falsos choques en escrituras consecutivas; propuesta del renglón libre siguiente; índice; honorarios por tramos y mínimo; timbres por porcentaje y monto fijo; totales; sustitución de campos de plantilla.

### Persistencia — 11 pruebas (`pruebas/store.test.cjs`)
Estado inicial; ida y vuelta de guardado; lectura de la clave anterior; aviso ante datos corrompidos; instantáneas y su límite; almacenamiento lleno. Más tres de la capa de archivos: el puente nativo escribe en `datos.json` y no en la clave del navegador, las instantáneas van a su propio archivo, y sin puente se sigue usando el navegador.

### Paginación — 200 escenarios (`pruebas/paginacion.test.cjs`)
Generador determinista (xorshift32, semillas 1 a 200). Los 200 escenarios generados fueron válidos y se comprobaron, con márgenes, renglones, separación, ancho de carácter, longitud de palabra y posición inicial variables. En cada uno: conservación de todos los caracteres, capacidad por cara, ancho de cada renglón, inicio en el renglón uno al cambiar de cara, secuencia de folios y caras, unicidad de posiciones, marca de última cara y coherencia de la posición final.

> Los ensayos usan una medición determinista para probar el algoritmo. La aplicación real mide la fuente con Canvas; ese resultado necesita verificación con las fuentes de tu equipo.

### Navegador real — 27 comprobaciones (`pruebas/navegador.cjs`)
Chromium con Playwright sobre la versión de un solo archivo: carga sin errores; conversiones a letras; liquidación; razones de entrelineados y de testimonio; vista de caras e informe; propuesta de posición; razones de apertura y cierre; mapa de folios sin choques; índice de quince columnas; modelos de ejemplo; guardado del perfil con respaldo previo; persistencia tras recargar; instantáneas; PDF; las ocho pantallas a 1440, 1280, 1024, 768 y 390 px sin desborde horizontal; y ningún error de JavaScript en todo el recorrido.

### Aplicación de escritorio real — 21 comprobaciones (`pruebas/aplicacion.cjs`)
La aplicación Electron se arranca de verdad, se trabaja en ella, **se cierra y se vuelve a abrir**:

- La ventana abre y la interfaz se reconoce como aplicación.
- El puente nativo está expuesto y **la interfaz no tiene acceso a Node** (`require` y `process` no existen en ella).
- La carpeta de datos se muestra al usuario.
- `datos.json` se crea en el disco, contiene el texto escrito y es JSON válido del formato esperado.
- La vista reparte el texto en caras dentro de la aplicación.
- Una operación irreversible deja `instantaneas.json` y un respaldo fechado en `respaldos/`.
- **Tras cerrar y volver a abrir: la escritura sigue ahí, el texto está íntegro, el perfil de papel se conservó y las instantáneas se recuperaron.**
- El proceso principal **rechaza** una ruta que no sea uno de sus dos archivos.
- Ningún error de JavaScript en ninguna de las dos sesiones.

> Esta prueba encontró un defecto real antes de la entrega: la política de seguridad bloquea los atributos incrustados, de modo que `onsubmit="return false"` no corría y los botones Guardar y Revisar folios enviaban el formulario y hacían navegar la página. Se corrigió registrando los manejadores desde el código, y el empaquetador ahora rechaza cualquier atributo incrustado que reaparezca.

### Geometría del PDF
El PDF generado midió **216,2 × 330,2 mm** (medido con pypdf) frente a 216 × 330 mm configurados. La diferencia de 0,2 mm corresponde al redondeo del motor de impresión.

---

## 3. Verificación de los entregables

- **Windows**: `Instalar-ProtocoloFacil-0.4.0.exe` se identifica como `PE32 executable (GUI) Intel 80386, for MS Windows, Nullsoft Installer self-extracting archive`. Incluye desinstalador generado, icono y metadatos de versión incrustados.
- **Mac**: los dos paquetes llevan **firma ad-hoc comprobada** (`CodeSignatureFlags(ADHOC)`, identificador `cr.protocolofacil.app`) en el ejecutable principal y en los marcos anidados. Los ZIP conservan los enlaces simbólicos de los marcos de Electron y el bit de ejecución del instalador.

---

## 4. Controles pendientes

**No se dispuso de Windows, de macOS ni de impresora.** Estos puntos son tuyos:

### Windows
1. Que SmartScreen permita continuar y el instalador termine.
2. Accesos directos, entrada en Agregar o quitar programas y desinstalación sin borrar datos.
3. Carpeta de datos en `%APPDATA%` y persistencia entre sesiones.
4. Diálogo de impresión y escala real del controlador.

### Mac
5. Que Gatekeeper permita abrir el `.command` y que la firma ad-hoc baste en Apple Silicon.
6. Copia a Aplicaciones y apertura posterior sin advertencias.
7. Carpeta de datos en `~/Library/Application Support` y persistencia entre sesiones.
8. Diálogo de impresión de macOS.

### Ambos
9. Tamaño físico del papel y coincidencia con los renglones impresos.
10. Márgenes efectivos, orientación y orden de frente y vuelto en impresión manual.
11. Medición de las fuentes del equipo, que puede alterar el corte de renglones.

**Hasta completar el punto 9, no uses papel de protocolo: calibrá en papel común.**

### Firma de código
Ninguno de los entregables lleva firma de editor: no hay certificado de firma de código para Windows ni firma Developer ID con certificación de Apple. Ambos requieren cuentas de pago, y la de Apple además un Mac para firmar y enviar a certificar. La firma ad-hoc de los paquetes de Mac es lo que permite que la aplicación se ejecute en Apple Silicon; no evita la advertencia de Gatekeeper.

---

## 5. Alcance jurídico

Las fórmulas de las razones son estructuras de trabajo parametrizables, no modelos oficiales ni verificados para un caso concreto. Los modelos de ejemplo traen marcadores entre corchetes y deben completarse y revisarse.

Los valores iniciales de honorarios y timbres son **editables y están marcados «verificar vigencia»**. El programa no afirma que cifra alguna esté vigente; la confrontación con el arancel y con la normativa tributaria y registral aplicable corresponde al notario responsable.

El índice CSV es una herramienta de control interno y **no constituye la presentación oficial del índice notarial**. El estado «Firmada» es una anotación manual, no una firma electrónica.

La edición 0.4 conserva las diferencias funcionales respecto del programa Windows detalladas en `LEEME.md`.
