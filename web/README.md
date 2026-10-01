# Panel web de Lia-CR

Frontend estático (HTML, CSS y JavaScript, sin dependencias ni compilación) para el despacho.

## Módulos

| Módulo | Función |
| --- | --- |
| Inicio | Accesos a las tareas principales, consulta directa y plazos próximos |
| Asistente | Chat que envía la consulta a `POST {API}/api/consulta` cuando la API está configurada |
| Redactor | Borradores base con marcadores `[Insertar …]` (escrituras, contratos, recursos) |
| Análisis de documentos | Lista de control formal de escrituras y documentos privados |
| Legislación | Índice filtrable a partir de `src/data/legislation-index.json` |
| Plantillas | Catálogo de modelos por materia |
| Expedientes | Registro de asuntos con plazo y actuación pendiente |
| Plazos y alertas | Vencimientos ordenados, con aviso a 3 y 10 días |
| Protocolo notarial | Control interno de escrituras (número, tomo, folio, estado registral) |
| Ajustes | Perfil profesional, URL de la API y respaldo/importación JSON |

## Ejecución local

Sirva el panel desde la **raíz del repositorio**, para que encuentre el índice de legislación:

```bash
python3 -m http.server 8080
# abrir http://localhost:8080/web/
```

## Datos

Los expedientes, el protocolo y la conversación se guardan solo en el `localStorage` del navegador. Use **Ajustes → Exportar respaldo** con regularidad. Para un uso multiusuario hace falta la base de datos del PASO 8.
