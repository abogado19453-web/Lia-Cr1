# Protocolo Fácil 0.4

Aplicación de escritorio para redactar, distribuir e imprimir escrituras sobre el papel de protocolo costarricense. Para Windows y para Mac.

Reconstrucción propia a partir de las funciones observadas en los componentes del instalador Windows 1.3.3. **No es una conversión binaria ni una réplica del programa original.** Todo el código fuente está incluido.

---

## Instalación

### Windows

1. Ejecutá `Instalar-ProtocoloFacil-0.4.0.exe`.
2. Windows SmartScreen va a advertir que el editor no está identificado: **Más información → Ejecutar de todas formas**. El instalador no lleva certificado de firma de código, que es de pago y anual.
3. Elegí la carpeta y terminá. Quedan accesos directos en el escritorio y en el menú Inicio.

No pide permisos de administrador: se instala para tu usuario. Se desinstala desde **Configuración → Aplicaciones**, y la desinstalación **no borra tus escrituras**.

### Mac

Elegí el archivo según tu equipo (menú Apple → Acerca de esta Mac):

- **`...-mac-arm64.dmg`** — Mac con Apple Silicon (M1 en adelante).
- **`...-mac-x64.dmg`** — Mac con procesador Intel.

1. Doble clic en el `.dmg`. Se abre una ventana con la aplicación y un acceso a Aplicaciones.
2. Arrastrá **Protocolo Facil** sobre **Aplicaciones**.
3. Abrila desde Aplicaciones con **clic secundario → Abrir → Abrir**. Hace falta sólo la primera vez: autoriza esa aplicación concreta sin cambiar la configuración de seguridad del equipo.

Si macOS insiste en bloquearla, abrí la Terminal y ejecutá:

```sh
xattr -dr com.apple.quarantine "/Applications/Protocolo Facil.app"
```

**Alternativa más liviana:** los archivos `...-instalador.zip` contienen lo mismo y pesan menos de la mitad. Descomprimís y hacés doble clic en `Instalar en Mac.command`, que copia la aplicación a Aplicaciones y le quita la marca de cuarentena por vos.

La aplicación lleva **firma ad-hoc**, no firma Developer ID de Apple ni certificación. Sin la firma ad-hoc macOS no la ejecutaría en Apple Silicon; con ella funciona, pero Gatekeeper sigue advirtiendo en la primera apertura.

### Sin instalar

`dist/ProtocoloFacil-0.4.0.html` es la aplicación entera en un archivo que abre con doble clic en cualquier navegador. Sirve para probarla o para una máquina prestada. **Guarda en el navegador, no en archivos**: para uso diario conviene la aplicación.

---

## Dónde quedan tus datos

La aplicación guarda en **archivos de verdad en tu disco**:

| Sistema | Carpeta |
|---|---|
| Windows | `%APPDATA%\Protocolo Facil\` |
| Mac | `~/Library/Application Support/Protocolo Facil/` |

```
datos.json           libros, escrituras, plantillas y perfil
instantaneas.json    copias previas a cada operación irreversible
respaldos/           copias fechadas, nunca sobrescritas (se guardan las 200 últimas)
```

Llegás ahí desde **Archivo → Abrir la carpeta de datos**, o desde el botón de la pantalla de inicio. Reinstalar o actualizar no toca esa carpeta. Podés incluirla en tu sistema de respaldos.

La escritura es atómica: se escribe a un temporal y se renombra, de modo que un corte de energía no deja un archivo a medias.

Aun así, **el respaldo que importa es el que está fuera de la máquina.** Usá Archivo → Respaldar y guardá el JSON donde conservás los respaldos del despacho.

---

## Qué hace

**Libros y tomos.** Nombre, número de tomo, cantidad de folios, razones de apertura y cierre guardadas en el libro.

**Escrituras.** Número, fecha, hora, acto, otorgantes, estado, notas internas y texto. Posición inicial por folio, cara y renglón, con propuesta del siguiente renglón libre del tomo.

**Distribución por folios.** El texto se reparte entre frente y vuelto recalculando el ancho útil de cada cara. Vista con zoom, impresión por rango de caras o filtrada por frente/vuelto, y guardado en PDF con el tamaño exacto del papel.

**Piezas notariales.** Razón de apertura del tomo, razón de cierre, razón de testimonio (distingue el primero de los ulteriores) y razón de entrelineados y testaduras.

**Marcado notarial.** Escribí `«así»` lo entrelineado y `[[así]]` lo testado; el botón correspondiente arma la razón final.

**Mapa de folios.** Ocupación de todo el tomo, con los choques de renglón señalados en rojo. La impresión se bloquea si dos escrituras comparten renglones.

**Conversión a letras.** Enteros hasta doce cifras, ordinales, importes con céntimos en colones, dólares y euros, fechas y horas en la forma de la comparecencia.

**Índice de trabajo.** En pantalla y en CSV, con posiciones inicial y final calculadas. No es la presentación oficial del índice notarial.

**Honorarios y timbres.** Estimación por tramos con tabla **editable**. Los valores iniciales son una base de trabajo marcada «verificar vigencia»: confrontá el arancel y la normativa tributaria y registral vigentes antes de liquidar.

**Calibración.** Ancho, alto, renglones, separación, fuente y tamaño; márgenes y desplazamientos X/Y independientes para cada cara; hojas de prueba con guías que no se imprimen en las escrituras.

---

## Primera impresión

1. En **Configurar impresión**, ingresá las medidas reales de tu papel y la cantidad de renglones. Medí del renglón uno al once y dividí entre diez para obtener la separación.
2. Guardá el perfil. Las pruebas usan el perfil guardado, no los campos todavía sin guardar.
3. Imprimí una prueba de frente y otra de vuelto **en papel común**.
4. En el diálogo del sistema: tamaño de papel exacto, escala **100 %**, sin ajuste automático al área imprimible, sin encabezados ni pies.
5. Compará con el papel real. X positivo mueve a la derecha; Y positivo mueve hacia abajo. Ajustá cada cara y repetí hasta que coincida.
6. El estado de la escritura no cambia al imprimir: marcá «Impresa» después de comprobar el resultado físico.

**No uses papel de protocolo hasta completar este paso.** Esta entrega no se probó en una impresora física.

---

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl/Cmd + N` | Nueva escritura |
| `Ctrl/Cmd + S` | Guardar |
| `Ctrl/Cmd + B` | Respaldar en un archivo |
| `Ctrl/Cmd + P` | Imprimir |
| `Ctrl/Cmd + Shift + P` | Guardar como PDF |

---

## Diferencias con el programa Windows original

No se implementaron: sincronización web, licencias, servicios remotos, firma digital, auditoría remota, importación de SQLite, versiones históricas de escrituras, editor enriquecido, trazos libres, entrelineados dibujados sobre documentos ya impresos ni generación completa de testimonios sobre papel de seguridad. El estado «Firmada» es una anotación manual, no una firma electrónica. No se incluyen modelos jurídicos verificados: los de ejemplo son estructuras de trabajo con marcadores.

Estas limitaciones se declaran expresamente para que esta edición se use sin confundirla con el producto original.

---

## Código y construcción

```
app/                 interfaz compartida por la aplicación y la versión web
  engine.js            núcleo de cálculo (sin navegador): geometría, paginación, letras
  notarial.js          razones, mapa de folios, índice, honorarios y timbres
  store.js             persistencia: archivos en la aplicación, navegador en la web
  ui.js                controlador de la interfaz
  index.html           estructura de las pantallas
  style.css            apariencia
escritorio/          aplicación Electron
  src/main.js          proceso principal: archivos, menú, impresión, PDF
  src/preload.js       puente aislado con la interfaz
  mac/                 instalador de macOS y su LEEME
  herramientas/        preparación de la interfaz y generación de iconos
pruebas/             303 comprobaciones automáticas
herramientas/        generador de la versión de un solo archivo
construir-aplicacion.sh   aplicación e instaladores
construir-web.sh          versión de un solo archivo, sin instalar
```

Para construir hace falta Node y npm; además wine para el instalador de Windows desde Linux, y rcodesign para la firma ad-hoc de Mac. Para **usar** la aplicación no hace falta nada de eso.

```sh
bash construir-aplicacion.sh        # aplicación e instaladores
bash construir-aplicacion.sh win    # sólo Windows
bash construir-aplicacion.sh mac    # sólo Mac
bash construir-web.sh               # versión de un solo archivo

node pruebas/engine.test.cjs
node pruebas/notarial.test.cjs
node pruebas/store.test.cjs
node pruebas/paginacion.test.cjs
node pruebas/navegador.cjs dist/ProtocoloFacil-0.4.0.html   # navegador real
node pruebas/aplicacion.cjs                                 # aplicación real
```

`VALIDACION.md` documenta qué se comprobó y qué queda pendiente. `GUIA-VIBECODING.md` explica cómo seguir mejorándolo sin editor de código. `PRD.md` contiene los requerimientos.
