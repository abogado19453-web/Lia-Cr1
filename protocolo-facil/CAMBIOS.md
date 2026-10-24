# Cambios

## 0.4.0 — 23 de octubre de 2026

Protocolo Fácil deja de ser una página que se abre en el navegador y pasa a ser **una aplicación de escritorio**, con instalador propio para Windows y para Mac.

### Aplicación de escritorio

- Programa nativo construido con Electron: ventana propia, icono propio, entrada en el menú Inicio y en Aplicaciones.
- **Menú del sistema en español**: Archivo (nueva escritura, guardar, respaldar, restaurar, abrir la carpeta de datos, imprimir, guardar como PDF), Edición, Ir a, Ver y Ayuda, con sus atajos de teclado.
- **Guardar como PDF** directo, sin pasar por el diálogo de impresión, respetando el tamaño exacto del papel configurado.
- Una sola instancia a la vez: abrir el programa dos veces trae al frente la ventana que ya está abierta.

### Los datos pasan a ser archivos de verdad

Este es el cambio de fondo. Hasta la 0.3 todo vivía en el almacenamiento del navegador, y borrar los datos de Safari podía dejar el trabajo inaccesible. Ahora la aplicación guarda en archivos del disco, dentro de la carpeta de datos del usuario:

```
datos.json           libros, escrituras, plantillas y perfil
instantaneas.json    copias previas a cada operación irreversible
respaldos/           copias fechadas que nunca se sobrescriben
```

- **Escritura atómica**: se escribe a un temporal y se renombra, de modo que un corte de energía no deja un archivo truncado.
- **Respaldo automático fechado** antes de cada operación irreversible, además de la instantánea interna. Se conservan los 200 más recientes.
- La carpeta se abre desde el menú o desde el botón de la pantalla de inicio, y puede incluirse en Time Machine o en el sistema de respaldos del despacho.
- Respaldar y restaurar usan los cuadros de diálogo del sistema; exportar TXT, RTF, CSV y PDF también.
- La versión web sigue funcionando igual, con el almacenamiento del navegador, sin cambios para quien la use así.

### Instaladores

- **Windows**: instalador `.exe` (NSIS) en español, con elección de carpeta, accesos directos en el escritorio y en el menú Inicio, y desinstalador registrado en Agregar o quitar programas. No requiere permisos de administrador y no borra los datos al desinstalar.
- **Mac**: imagen de disco `.dmg` por arquitectura, con la aplicación y el acceso a Aplicaciones para arrastrar una sobre el otro, como es habitual en macOS. La imagen va en formato ISO 9660 con extensiones Rock Ridge, que conservan permisos y enlaces simbólicos; es el mismo formato que `hdiutil` llama UDTO y macOS lo monta igual. No se usa HFS+ porque escribir una imagen HFS+ exige montarla y el equipo de construcción no tiene ese sistema de archivos.
- **Mac, alternativa liviana**: los mismos paquetes en ZIP con el script `Instalar en Mac.command`, que copia a Aplicaciones y quita la marca de cuarentena. Pesan menos de la mitad que el `.dmg`, porque la imagen de disco no se comprime.
- El paquete se entrega **sólo con los idiomas español e inglés** en lugar de las cincuenta y cinco traducciones de Chromium: unos 50 MB menos por arquitectura.
- Los paquetes de Mac llevan **firma ad-hoc**: sin ella macOS no ejecuta la aplicación en Apple Silicon. No sustituye a la firma Developer ID ni a la certificación de Apple, que exigen cuenta de desarrollador y un Mac.
- Icono propio en los tres formatos (PNG, ICO e ICNS), generado desde un único archivo fuente.

### Seguridad

- La interfaz corre aislada: sin Node, sin integración con el sistema y con política de seguridad de contenido estricta.
- El proceso principal sólo admite sus dos archivos de datos: una ruta cualquiera es rechazada.
- Ningún enlace externo se abre dentro de la aplicación, y la aplicación no hace ninguna petición de red.

### Corregido

- **Los botones Guardar y Revisar folios enviaban el formulario y hacían navegar la página.** Funcionaba por un atributo `onsubmit` incrustado que la política de seguridad bloquea; lo detectó la prueba de la aplicación. Los manejadores se registran ahora desde el código y el empaquetador rechaza cualquier atributo incrustado que vuelva a aparecer.

### Pruebas

De 252 a **303 comprobaciones**: se suman 21 sobre la aplicación real (arranque, aislamiento, escritura en disco, cuadros de entrada propios, persistencia tras cerrar y volver a abrir, respaldos fechados y rechazo de rutas ajenas), 3 sobre la capa de archivos y 2 en el navegador.

---

## 0.3.0 — 22 de octubre de 2026

Reconstrucción completa a partir del código fuente de la edición 0.2.0 (que no estaba compilado: era HTML y JavaScript dentro del paquete `.app`).

### Nuevo — piezas notariales costarricenses

- **Razón de apertura del tomo**, con folios, tomo y datos del notario en letras.
- **Razón de cierre**, con última escritura y último folio utilizado.
- **Razón de testimonio**, distinguiendo el primero de los ulteriores, con folio y cara.
- **Razón de entrelineados y testaduras**, a partir del marcado `«así»` y `[[así]]` en el texto.
- **Mapa de folios del tomo**, con los choques de renglón señalados.
- **Índice de trabajo en pantalla**, además del CSV, ahora con tomo, hora y cantidad de caras.
- **Estimación de honorarios y timbres** por tramos, con tabla de tarifas editable.
- **Modelos de ejemplo** para compraventa, poder especial y constitución de sociedad anónima.

### Nuevo — conversión a letras

- **Importes con céntimos** en colones, dólares y euros, con el enlace «de» ante millones exactos.
- **Horas** en la forma de la comparecencia, y fecha y hora combinadas.
- **Ordinales** hasta 999, con concordancia de género, para cláusulas y tomos.
- Concordancia de género y apócope en los cardinales (`un`, `una`, `veintiún`, `doscientas`).

### Nuevo — datos y seguridad del trabajo

- **Anillo de doce instantáneas internas** antes de cada operación destructiva, con recuperación desde Inicio.
- **Migración automática** de los respaldos de las ediciones 0.1 y 0.2 al nuevo formato.
- Datos del notario ampliados: cédula, carné y oficina, además de nombre y lugar.
- Hora de la escritura como campo propio.

### Nuevo — entrega

- **Archivo único `.html`** que se abre con doble clic, sin instalar nada.
- **`construir.sh`**: corre las pruebas y arma el paquete Mac y el archivo único.

### Corregido y mejorado

- **Arquitectura.** Se eliminó el parcheo de funciones entre `app.js` y `ui.js`, que hacía frágil cualquier cambio. Ahora hay cuatro módulos con responsabilidad única: motor, notarial, almacén e interfaz.
- **Formularios propios** para crear libros, con número de tomo, en lugar de diálogos del navegador.
- **Propuesta de posición** que recorre todo el tomo en vez de mirar sólo la escritura de mayor número.
- **Avisos de revisión** que distinguen campos de plantilla sin reemplazar, marcadores entre corchetes y marcas de entrelineado pendientes de razón.
- El código pasó de un estilo comprimido a uno legible y comentado, pensado para mantenerse con asistencia.

### Pruebas

De 8 pruebas y 200 escenarios a **252 comprobaciones**: 25 del núcleo, 19 del módulo notarial, 8 de persistencia, 200 escenarios de paginación y 25 en navegador real con Playwright.

### Sin cambios

El algoritmo de paginación y la geometría de impresión se conservaron por estar verificados. Las limitaciones frente al programa Windows siguen siendo las declaradas en `LEEME.md`.

---

## 0.2.0 — 9 de octubre de 2026

Rediseño de la interfaz sobre la edición 0.1: inicio con trabajo reciente, navegación lateral, editor con más espacio, barra de edición, recorrido redactar → revisar → imprimir, calibración organizada y formularios propios para libros.

## 0.1.0

Primera reconstrucción: libros, escrituras, distribución por folios, calibración por cara, plantillas, conversión de enteros y fechas a letras, índice CSV y respaldo JSON.
