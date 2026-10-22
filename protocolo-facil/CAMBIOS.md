# Cambios

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
