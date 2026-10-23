# Guía de vibecoding — Protocolo Fácil

Cómo seguir mejorando este programa **conversando**, sin abrir VS Code, sin aprender a programar y sin romper lo que ya funciona.

---

## 1. La idea en una línea

Vos describís lo que querés en lenguaje de notario; yo escribo el código, corro las pruebas y te devuelvo el programa armado. Tu trabajo es **pedir bien y probar**; el mío es traducir y verificar.

---

## 2. Lo que hay adentro (mapa mínimo)

No necesitás leer el código, pero sí saber a qué archivo apunta cada pedido. Nombrarlo hace la diferencia entre un cambio de dos minutos y uno de media hora.

| Si querés cambiar… | Decime que es en… | Qué vive ahí |
|---|---|---|
| La ventana, el menú de arriba, dónde se guardan los archivos, los instaladores | **la aplicación** (`escritorio/`) | Lo que hace que sea un programa y no una página |
| Cómo se reparte el texto en los folios, las letras de números/fechas/horas, qué respaldo se acepta | **el motor** (`app/engine.js`) | Cálculo puro. Si algo sale mal acá, sale mal en todas las pantallas |
| Razones de apertura, cierre, testimonio, entrelineados, índice, honorarios y timbres | **lo notarial** (`app/notarial.js`) | Las fórmulas costarricenses |
| Guardado, instantáneas, respaldos | **el almacén** (`app/store.js`) | Dónde viven los datos |
| Botones, pantallas, avisos, qué pasa al hacer clic | **la interfaz** (`app/ui.js`) | Todo lo que ves |
| Colores, tamaños, cómo se ve | **el estilo** (`app/style.css`) | Apariencia |
| Qué campos y secciones existen | **la página** (`app/index.html`) | La estructura |

Regla práctica: **si es una fórmula o un cálculo, es el motor o lo notarial. Si es un botón o una pantalla, es la interfaz. Si es el menú de arriba, la ventana o el instalador, es la aplicación.**

---

## 3. Cómo pedir un cambio (la plantilla que funciona)

Copiá y completá estas cuatro líneas. Con esto alcanza casi siempre:

```
QUÉ:      [qué querés que haga]
DÓNDE:    [en qué pantalla o sección aparece]
EJEMPLO:  [un caso concreto: entra esto → debe salir esto]
NO TOQUES:[lo que debe seguir igual]
```

### Ejemplo real, bien pedido

```
QUÉ:      que la razón de testimonio diga también para qué institución se expide
DÓNDE:    botón "Razón de testimonio" en el editor
EJEMPLO:  si elijo "Registro Nacional" debe terminar
          "...para su presentación ante el Registro Nacional."
NO TOQUES:el resto de la razón ni la numeración en letras
```

### El mismo pedido, mal hecho

> «mejorá los testimonios»

Eso me obliga a adivinar y probablemente te devuelva algo que no querías.

---

## 4. Las cuatro frases que más vas a usar

1. **«Mostrame cómo quedó»** — te armo el archivo listo para abrir y te digo qué revisar.
2. **«Esto está mal: pasó X y esperaba Y»** — la forma más rápida de que lo arregle. Dame siempre el caso concreto.
3. **«Volvé a como estaba antes»** — todo está en control de versiones; deshacer es barato. No tengas miedo de probar.
4. **«Antes de cambiarlo, explicame qué se rompe»** — pedímelo cuando el cambio toque la distribución de folios o el guardado. Son las dos zonas donde un error cuesta papel de protocolo.

---

## 5. Las tres reglas que te protegen

**Regla 1 — Pruebas antes que confianza.**
El programa tiene 303 comprobaciones automáticas. Cada vez que cambie algo, las corro. Si una falla, no te entrego el cambio: lo arreglo primero. Vos podés exigirlo siempre: *«corré las pruebas y mostrame el resultado»*.

**Regla 2 — Un cambio a la vez.**
Pedir cinco cosas juntas suena eficiente y no lo es: si algo sale mal, no sabemos cuál de las cinco fue. Pedí de a una y probá entre medio.

**Regla 3 — Lo jurídico lo validás vos.**
Yo redacto la fórmula y la calculo bien. **La vigencia del arancel, de los timbres y la corrección jurídica del modelo son tuyas.** Por eso las tarifas son editables y los modelos traen marcadores entre corchetes: el programa nunca afirma que una cifra está vigente.

---

## 6. Qué es fácil, qué es caro

| Pedido | Esfuerzo | Nota |
|---|---|---|
| Cambiar un texto, un rótulo, un color | Minutos | Pedilo sin pensarlo |
| Agregar un campo a la escritura | Bajo | Decime si debe salir en el índice |
| Nueva razón o fórmula notarial | Bajo | Dame el texto modelo completo una vez |
| Nueva pantalla o sección | Medio | Decime qué se ve y qué botones tiene |
| Agregar una opción al menú de arriba | Bajo | Decime en qué menú y qué hace |
| Cambiar cómo se reparte el texto en folios | **Alto** | Es el corazón del programa; lo hago con pruebas nuevas |
| Cambiar dónde o cómo se guardan los archivos | **Alto** | Es lo que protege tu trabajo; lo toco con cuidado y con pruebas |
| Que el instalador deje de dar advertencias | **No depende de mí** | Hace falta comprar certificados de firma a Microsoft y a Apple |
| Importar la base del programa Windows | **Muy alto** | Formato cerrado; hoy no está en el alcance |

---

## 7. El ciclo de trabajo

```
   pedís  →  escribo  →  corro las pruebas  →  te paso el archivo
      ↑                                              ↓
      └────────────  probás en tu Mac  ←─────────────┘
```

**Tu parte, que no puedo hacer yo:** instalarlo en tu equipo, imprimir la calibración en papel común, medir contra el papel real y decirme cuántos milímetros hay que mover. Eso no se puede simular desde acá: ninguna de las pruebas automáticas toca tu impresora, y acá no hay ni Windows ni Mac.

---

## 8. Cómo probar sin arriesgar trabajo real

1. **Antes de probar algo nuevo**, guardá un respaldo con **Archivo → Respaldar**. En la aplicación además queda una copia fechada en la carpeta `respaldos/`, pero el respaldo que importa es el que está fuera de la máquina.
2. Probá con un libro inventado («Tomo de pruebas»), no con tu tomo en uso.
3. Si algo se rompe, en **Inicio → Copias de seguridad de la sesión** volvés al punto anterior con un clic.
4. Recién después, llevalo a tu trabajo real.

---

## 9. Cosas que me vas a tener que decir vos

No las puedo adivinar y cambian el resultado:

- Las medidas reales de tu papel de protocolo y cuántos renglones trae.
- El arancel y los timbres vigentes al momento de usar la liquidación.
- La redacción exacta que usás vos en las razones (cada notario tiene su estilo).
- Qué institución o uso ponés normalmente en los testimonios.
- Si trabajás fuera de secuencia de folios, y con qué criterio.

Decímelas una vez y quedan guardadas en el programa.

---

## 10. Errores comunes y qué significan

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| «La vista cambió. Revisá la distribución y volvé a imprimir» | Tocaste el texto o el perfil después de ver las caras | Mirá la vista otra vez y volvé a imprimir |
| «Hay renglones ocupados por otra escritura» | Dos escrituras arrancan sobre los mismos renglones | Usá **Proponer el siguiente renglón libre** |
| «Los renglones salen del papel» | La separación por la cantidad de renglones no cabe en el alto | Bajá la separación o la cantidad de renglones |
| «Solo en memoria: descargá un respaldo» | No se pudo escribir en el disco (o en el navegador, si usás la versión web) | Guardá el respaldo **ahora**, antes de cerrar |
| Windows: «Windows protegió su PC» | El instalador no tiene certificado de firma | Más información → Ejecutar de todas formas |
| Mac: «no se puede abrir porque proviene de un desarrollador no identificado» | Lo mismo, del lado de Apple | Clic secundario sobre el archivo → Abrir → Abrir |
| «Quedan campos de plantilla sin reemplazar» | Hay `{Campo}` o `[Insertar …]` en el texto | Completalos antes de imprimir |

---

## 11. Plantillas de pedido listas para copiar

**Agregar un campo nuevo**
```
QUÉ: agregar el campo "[nombre]" a la escritura
DÓNDE: formulario del editor, junto a [campo existente]
EJEMPLO: debe aceptar [qué tipo de dato] y salir en el índice CSV
NO TOQUES: los respaldos viejos, deben seguir abriéndose
```

**Nueva razón o fórmula**
```
QUÉ: agregar la razón de [nombre]
DÓNDE: pantalla "Tomo y razones", botón nuevo
EJEMPLO: [pegá acá el texto modelo completo, tal como lo redactás vos,
          marcando con [corchetes] lo que debe cambiar en cada caso]
NO TOQUES: las razones de apertura y cierre
```

**Reportar un error**
```
PASÓ:     [qué hiciste, paso a paso]
ESPERABA: [qué debía salir]
SALIÓ:    [qué salió, copiá el mensaje exacto]
```

---

## 12. Cada vez que te entregue una versión nueva

Pedime siempre las tres cosas:

1. **Los instaladores**, no sólo el código.
2. **El resultado de las pruebas**, con el número de comprobaciones.
3. **Qué no pude probar**, explícito.

Si falta alguna, pedímela.

---

## 13. Lo que nunca deberías aceptar de mí

- Que te entregue un cambio **sin haber corrido las pruebas**.
- Que te diga que una cifra de arancel o timbre **está vigente**: no lo puedo verificar.
- Que cambie la distribución de folios **sin avisarte** que hay que recalibrar.
- Que te presente como probado en tu equipo algo que **sólo probé en Linux**.
- Que te diga que las advertencias de SmartScreen o Gatekeeper **ya no van a aparecer**: sin certificados comprados, aparecen.

Si ves alguna de las cinco, reclamámela. Está bien reclamarla.
