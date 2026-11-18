# Auditoría visual de idioma — Administración de la comunidad (2026-11-17)

**Alcance:** el panel `/admin` (rol `COMMUNITY_ADMIN`). **Solo frontend:** no se cambió el backend, la base de datos,
los enums ni los contratos del API. **Entorno:** sandbox local `https://192.168.0.5:5443`, tenant `p6a7f5a86`, cuenta de
administración **sintética**. Sin commits, push ni despliegues a Railway o Cloudflare.

## Resumen cuantitativo

| Indicador | Valor |
|---|---|
| Módulos identificados (rutas de `/admin`, sin redirecciones) | **21** |
| Módulos recorridos con Playwright | **20** (falta `/admin/staff/:id`: el sandbox no tiene personal) |
| Pantallas revisadas (página, pestaña, modal o ficha) | **105** (51 en escritorio a 1366 px, 54 en móvil a 390 px) |
| Textos inconsistentes detectados | **33**: 4 en el recorrido visual y 29 en la revisión del código (§3) |
| Textos corregidos | **33** |
| Textos en inglés visibles tras la corrección | **0** en las 105 pantallas |
| Problemas funcionales | 7 reales: **4 corregidos** después de la auditoría y 3 pendientes de decisión; 2 descartados por erróneos (§9) |
| Pruebas unitarias (vitest) | **368 aprobadas, 0 fallidas** (22 nuevas) |
| Comprobaciones E2E de contratos | **5 válidas aprobadas**; 1 sin valor como evidencia (§7.3) |

> **Herramienta.** Las pruebas usaron Playwright con el navegador Chromium real, mediante scripts reproducibles
> (`e2e/sandbox/admin-language-audit.cjs`). No se usaron las herramientas interactivas de Playwright MCP: un script
> recorre 21 rutas en dos tamaños de pantalla de forma repetible y deja el resultado en JSON.

## 1. Inventario de módulos

Se obtuvo de `src/app/App.tsx` (rutas) y de `src/layouts/AdminLayout.tsx` (menú). Las rutas en español (`/personal`,
`/turnos`, `/asambleas`…) solo redirigen a las de esta lista.

| # | Módulo | Ruta |
|---|---|---|
| 1 | Inicio (Dashboard) | `/admin` |
| 2 | Residentes | `/admin/residents` |
| 3 | Propiedades | `/admin/properties` |
| 4 | Personal | `/admin/staff` |
| 5 | Ficha del personal | `/admin/staff/:id` |
| 6 | Turnos | `/admin/shifts` |
| 7 | Asistencia | `/admin/attendance` |
| 8 | Asambleas | `/admin/assemblies` |
| 9 | Ficha de asamblea | `/admin/assemblies/:id` |
| 10 | Marketplace | `/admin/marketplace` |
| 11 | Configuración del marketplace | `/admin/marketplace/settings` |
| 12 | Comunicados | `/admin/communications` |
| 13 | Citofonía | `/admin/intercom` |
| 14 | Chat portería (solo lectura) | `/admin/chat` |
| 15 | Paquetes | `/admin/packages` |
| 16 | Visitantes | `/admin/visitors` |
| 17 | PQRS y daños | `/admin/requests` |
| 18 | Reservas | `/admin/reservations` |
| 19 | Documentos | `/admin/documents` |
| 20 | Configuración | `/admin/settings` |
| 21 | Perfil | `/admin/profile` |

## 2. Matriz de cobertura

«Pantallas» = página base más pestañas, filtros y modales de apertura (escritorio / móvil). El recorrido **nunca**
pulsa acciones: guardar, eliminar, aprobar, publicar, iniciar, entregar ni ninguna otra.

| Módulo | Pantallas (E / M) | Estados vistos con datos | Problemas detectados |
|---|---|---|---|
| Inicio | 2 / 2 | Paquetes `DELIVERED`; PQRS | «Dashboard» en el menú (21 pantallas); `DELIVERED` sin traducir |
| Residentes | 2 / 3 | `ACTIVE` | — |
| Propiedades | 4 / 3 | `OCCUPIED`, `VACANT` | — |
| Personal | 5 / 5 | Sin datos en el sandbox | Código: estado `ACTIVE` y rol (`SECURITY`…) sin traducir; colores |
| Ficha del personal | 0 / 0 | No recorrida (sin datos) | Código: estado, rol, turnos y asistencia sin traducir |
| Turnos | 2 / 2 | Sin datos | Código: estado del turno en códigos (`PROGRAMADO`) |
| Asistencia | 1 / 1 | Sin datos | Código: `TARDANZA`, `AUSENTE` en mayúsculas |
| Asambleas | 2 / 2 | `SCHEDULED`, `ENDED` | `SCHEDULED` y `ENDED` sin traducir |
| Ficha de asamblea (×2) | 7 / 7 | Encuestas | Código: tipo y modalidad en valores técnicos |
| Marketplace | 4 / 4 | — | — (tiene su propio diccionario, correcto) |
| Config. marketplace | 1 / 1 | — | — |
| Comunicados | 2 / 2 | `PUBLISHED`, `DRAFT` | — |
| Citofonía | 3 / 3 | Historial | Código: `INITIATING`, `RINGING`, `FAILED` sin traducir |
| Chat portería | 4 / 4 | `PENDING`, `ACTIVE`, `CLOSED` | — |
| Paquetes | 1 / 2 | `DELIVERED` | — |
| Visitantes | 1 / 2 | `PENDING` | Código: `AUTHORIZED` (lo que envía el backend) sin traducir |
| PQRS | 2 / 3 | `NEW`, `IN_PROGRESS`, `RESOLVED` | Código: `CLOSED` aparecía como «Resuelta»; «En Proceso» |
| Reservas | 4 / 4 | — | — (diccionario propio) |
| Documentos | 1 / 1 | — | — |
| Configuración | 1 / 1 | — | — |
| Perfil | 2 / 2 | — | — |

**Datos sintéticos creados en el sandbox** para que hubiera estados que mostrar: un visitante `PENDING`, una PQRS
`IN_PROGRESS`, un comunicado `DRAFT` y una asamblea `SCHEDULED`. Se eligieron operaciones que **no envían avisos push**
a los dispositivos de prueba: no se registraron paquetes, no se publicó nada y no se inició ninguna asamblea.

## 3. Problemas encontrados

### 3.1 En el recorrido visual (Playwright, antes de corregir)

| # | Módulo / ruta | Componente | Texto actual | Texto esperado | Evidencia |
|---|---|---|---|---|---|
| V1 | Menú lateral (todas) | `layouts/AdminLayout.tsx` | Dashboard | Inicio | Visible en 21 pantallas de escritorio |
| V2 | Inicio `/admin` | `AdminDashboard.tsx:447` | DELIVERED | Entregado | Escritorio y móvil |
| V3 | Asambleas | `AssembliesPage.tsx:129` | SCHEDULED | Programada | Escritorio y móvil |
| V4 | Asambleas | `AssembliesPage.tsx:129` | ENDED | Finalizada | Escritorio y móvil |

### 3.2 En la revisión del código (estados que el backend envía y la pantalla no traducía)

Se comparó cada pantalla con los enums reales del backend (`Havita-Backend`, solo lectura).

| # | Módulo | Componente | Texto actual | Texto esperado | Contexto |
|---|---|---|---|---|---|
| C1–C2 | Visitantes | `AdminVisitors.tsx` (tabla y tarjetas) | AUTHORIZED (preventivo) | Esperado | **Corrección (§9):** la capa de datos ya convierte `AUTHORIZED` en `APPROVED`, así que no llegaba a verse. La traducción se mantiene por si llega sin convertir |
| C3–C4 | Visitantes | `AdminVisitors.tsx` (colores) | (preventivo) | Azul, como «Esperado» | Mismo caso que C1–C2 |
| C5 | Ficha de asamblea | `AssemblyDetailPage.tsx:173` | ORDINARIA • Modalidad MIXTA | Ordinaria • Modalidad Mixta | Se mostraban los valores técnicos |
| C6–C7 | Personal | `PersonalTable.tsx`, `PersonalDetailPage.tsx` | ACTIVE / INACTIVE | Activo / Inactivo | El backend envía `ACTIVE`; el módulo esperaba `ACTIVO` |
| C8–C9 | Personal | Mismos (colores) | Gris | Verde para activo | Mismo origen |
| C10–C11 | Personal | Mismos (rol) | SECURITY, COMMUNITY_ADMIN… | Portería, Administración… | Rol sin traducir |
| C12–C13 | Turnos | `ShiftsScheduleView.tsx`, `PersonalDetailPage.tsx` | PROGRAMADO, EN_CURSO… | Programado, En curso… | Se mostraban los códigos internos |
| C14–C15 | Asistencia | `AttendanceLogView.tsx`, `PersonalDetailPage.tsx` | TARDANZA, AUSENTE, INCOMPLETO | Tardanza, Ausente, Incompleto | Se mostraban los códigos internos |
| C16 | Citofonía | `SecurityIntercom.tsx` (historial) | INITIATING / RINGING / FAILED | Iniciando / Timbrando / Fallida | Caían en el caso por defecto |
| C17–C18 | PQRS | `AdminRequests.tsx` (tabla y tarjetas) | «Resuelta» para `CLOSED` | Cerrada | Todo lo que no era nuevo ni en proceso salía como «Resuelta» |
| C19–C20 | PQRS | `AdminRequests.tsx` (filtro y formulario) | En Proceso | En proceso | Mayúsculas |
| C21–C25 | Diccionario central | `utils/statusLabels.ts` | En Progreso, En Vivo, En Curso, Pago Parcial, Falsa Alarma | En proceso, En vivo, En curso, Pago parcial, Falsa alarma | Mayúsculas a la española; «En proceso» es el término de PQRS |
| C26–C29 | Diccionario central | `utils/statusLabels.ts` | Sin traducción (se veía «Pending approval», «Hidden»…) | Pendiente de aprobación, Oculto, En revisión, Descartado (y otros 7) | Faltaban 11 valores de enums del backend |

## 4. Traducciones realizadas

**Arquitectura.** Se reutilizó y amplió el diccionario existente `src/utils/statusLabels.ts`, sin crear uno paralelo:

- `STATUS_LABELS` y `getStatusLabel()` siguen igual para quien ya los usa. Se añadieron 11 valores y se corrigieron 5
  etiquetas de mayúsculas.
- **Nuevo `statusLabelFor(dominio, valor)`**, tipado (`StatusDomain`). Traduce según el contexto: asamblea «Programada»,
  turno «Programado», PQRS «Resuelta», visitante autorizado «Esperado», asistencia «A tiempo», llamada «No contestó».
  Dominios: `assembly`, `assemblyType`, `assemblyModality`, `visitor`, `package`, `pqrs`, `staff`, `staffRole`, `shift`,
  `attendance` e `intercomCall`.
- **Los estados sin traducción no se ocultan.** Se muestran de forma legible y se registran
  (`getMissingStatusLabels()`); en desarrollo además se avisa en la consola con `[i18n] Estado sin traducción: dominio:VALOR`.
- Las cadenas de condiciones (`status === 'X' ? 'Texto' : …`) de Visitantes, Asambleas, Asistencia y PQRS se
  sustituyeron por `statusLabelFor`.

## 5. Archivos modificados (solo `Havita-Frontend`)

| Archivo | Cambio |
|---|---|
| `src/utils/statusLabels.ts` | Diccionario ampliado, `statusLabelFor` y registro de estados sin traducción |
| `src/layouts/AdminLayout.tsx` | «Dashboard» → «Inicio» |
| `src/features/admin/AdminDashboard.tsx` | Estado del paquete |
| `src/features/admin/AdminVisitors.tsx` | Estado del visitante y color de `AUTHORIZED` |
| `src/features/admin/AdminRequests.tsx` | Estado de la PQRS (incluye `CLOSED`) y «En proceso» |
| `src/features/assemblies/pages/AssembliesPage.tsx` | Estado de la asamblea |
| `src/features/assemblies/pages/AssemblyDetailPage.tsx` | Tipo y modalidad |
| `src/features/personal/components/PersonalTable.tsx` | Estado, rol y colores del personal |
| `src/features/personal/pages/PersonalDetailPage.tsx` | Estado, rol, turnos y asistencia |
| `src/features/personal/components/ShiftsScheduleView.tsx` | Estado del turno |
| `src/features/personal/components/AttendanceLogView.tsx` | Estado de la asistencia |
| `src/features/security/SecurityIntercom.tsx` | Estados del historial de llamadas (lo usa `/admin/intercom`) |
| `src/utils/statusLabels.test.ts` | **Nuevo** (17 pruebas) |
| `src/features/admin/adminStatusLabels.test.tsx` | **Nuevo** (5 pruebas) |
| `e2e/sandbox/admin-language-audit.cjs` | **Nuevo**: recorrido de auditoría reproducible |
| `e2e/ADMIN_UNITS_VISUAL_LANGUAGE_AUDIT.md` | **Nuevo**: este informe |

En el árbol de trabajo hay además cambios **ajenos a esta auditoría** y sin commit:
- `AdminRequests.tsx` y `AdminRequests.test.tsx` también contienen el cambio anterior del selector de unidad.
- `CreateAssemblyModal.tsx` tiene un cambio del usuario que no se tocó.

## 6. Estados internos preservados

- **No se cambió ningún valor que se envía o con el que se filtra.** Los `value` de los `<select>` siguen siendo
  `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `ENTERED`, `EXITED`, `CANCELLED`…; solo cambia el texto visible.
- Las comparaciones nuevas (`AUTHORIZED`, `ACTIVE`) solo eligen **clases CSS** de color.
- No se modificaron enums, tipos del API, servicios, `DataContext` ni reglas de negocio.
- **Comprobado en el navegador:** al editar una PQRS por la interfaz, el `PUT /api/v1/pqrs/{id}` envió
  `"status":"RESOLVED"` y `"priority":"LOW"` (§7.3).

## 7. Resultados de Playwright

### 7.1 Recorrido de idioma (`e2e/sandbox/admin-language-audit.cjs`)

Recoge los nodos de texto **visibles** (sin aplicar `text-transform`), el texto de las `<option>`, los `placeholder`,
`title` y `aria-label`, y el título del documento. Detecta valores técnicos (`PENDING`, `IN_PROGRESS`…) y palabras en
inglés.

| Ejecución | Rutas | Pantallas | Hallazgos | Errores de JavaScript |
|---|---|---|---|---|
| Antes, escritorio | 21 | 51 | 4 textos distintos (§3.1) | 0 |
| Antes, móvil | 21 | 54 | 3 (el menú lateral está oculto en móvil) | 0 |
| **Después, escritorio** | 21 | 51 | **0** | 0 |
| **Después, móvil** | 21 | 54 | **0** | 0 |

### 7.2 Responsive

A 390 px no apareció ningún estado sin traducir ni errores de JavaScript. Las etiquetas nuevas tienen la misma
longitud que las anteriores o menos («Esperado», «Cerrada», «Programada»). No se midió automáticamente el desbordamiento
de texto.

### 7.3 Regresión de contratos (navegador real)

| Comprobación | Resultado |
|---|---|
| Asambleas muestra «Programada» y «Finalizada», sin `SCHEDULED` ni `ENDED` | OK |
| Menú lateral: aparece «Inicio» y no aparece «Dashboard» | OK |
| Filtro de PQRS: `Nueva=NEW`, `En proceso=IN_PROGRESS`, `Resuelta=RESOLVED` | OK |
| La edición envía valores internos: `PUT {"priority":"LOW","status":"RESOLVED",…}` | OK |
| Tras recargar, la PQRS se ve «Resuelta» | OK |
| «En proceso» en la fila de la tabla | **No vale como evidencia**: el título de la PQRS sintética contiene «en proceso». La etiqueta queda cubierta por la prueba unitaria y por el filtro |

## 8. Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `npx vitest run` | **368 aprobadas / 0 fallidas** (50 archivos; 22 pruebas nuevas) |
| `npx tsc -b` | Sin errores |
| `oxlint` sobre los 16 archivos cambiados | 0 errores |
| `npm run lint` (proyecto) | 3 errores y 144 avisos, **todos anteriores**: los 3 errores son falsos positivos en `e2e/fixtures/test.ts` (la función `use` de Playwright) |
| `npm run build` | Correcto |
| Build del sandbox (`vite.p8b-device.config.mjs`) | Correcto y desplegado en el sandbox local |

**Qué cubren las pruebas nuevas:**
- **`statusLabels.test.ts`:** cada valor de los enums del backend, módulo por módulo, tiene etiqueta en español y
  ninguna etiqueta es un valor técnico. También comprueban el género y el vocabulario de cada módulo, que los estados
  sin traducción se registran y que la traducción no modifica el valor.
- **`adminStatusLabels.test.tsx`:** las pantallas de Asambleas, Visitantes, Personal, Asistencia y PQRS muestran el
  texto esperado. Los filtros conservan los valores internos y no queda ningún estado técnico visible.

## 9. Problemas funcionales

La auditoría solo los documentó. Después, con la aprobación del usuario, se corrigieron los marcados como
**Corregido**. Todo es frontend; el backend no se ha modificado.

| # | Módulo | Problema | Estado |
|---|---|---|---|
| F1 | Reservas | Al editar, el formulario guardaba la **etiqueta** («Confirmada») en `status` y la enviaba con `PUT /reservations/{id}`. **Ese endpoint no existe**, igual que `DELETE /reservations/{id}`: editar y eliminar nunca se guardaban, pero la pantalla los daba por hechos. Si confirmar o rechazar fallaba, también se daban por hechos. | **Corregido.** Decisión del usuario: «solo estado». Pendiente: Aprobar, Rechazar y Cancelar; confirmada: Cancelar; el resto, sin acciones. Se envían `CONFIRMED`, `REJECTED` y `CANCELLED` a los endpoints que existen. «Eliminar» pasa a «Cancelar reserva» y desaparece «Editar». Nada se da por hecho si el servidor falla. Verificado en el sandbox (§9.1) |
| F2 | Visitantes | ~~El frontend usa `APPROVED` y el backend `AUTHORIZED`…~~ | **Descartado: era erróneo.** `visitorService.mapBackendVisitor` y `DataContext` ya convierten `AUTHORIZED` en `APPROVED`; el contador, el filtro, la hora y las acciones funcionan. Crear un visitante no envía el estado |
| F3 | Personal | El backend envía `ACTIVE`/`INACTIVE` y el módulo compara con `ACTIVO`: el filtro «Activos» no coincidía y los colores fallaban. | **Corregido**: `staffStatusFromBackend` convierte los valores al cargar, como ya se hacía con turnos y asistencia. El estado no se envía al backend |
| F4 | Asistencia | `INCOMPLETE` se convertía en `PRESENTE`: se veía «A tiempo» y contaba como presente. | **Corregido**: se convierte en `INCOMPLETO`. En los indicadores cuenta como pendiente, no como presente |
| F5 | Portería | ~~Mismo problema que F2~~ | **Descartado** (ver F2) |
| F6 | Visitantes (administración y portería) | Cancelar un visitante desde administración o portería se daba por hecho aunque el servidor fallara. | **Corregido**: espera al servidor y muestra el error |
| F7 | Visitantes (administración y portería) | **Editar** un visitante solo cambiaba la pantalla: el frontend solo llamaba al servidor para residentes, y no existía un endpoint para el personal. | **Corregido** (backend y frontend): nuevo `PUT /api/v1/access/visitors/{id}` para administración y portería de la propia comunidad. Edita nombre, documento, placa y observaciones; la unidad y el estado no cambian aquí. Otra comunidad responde 404, residente 403 y visita que ya salió o se canceló 409 (`VisitorStaffEditIT`, 3/3). Para el residente, la pantalla ya no da por hecho un cambio que el servidor rechaza. Verificado en el sandbox (PUT, guardado en el servidor y persistencia al recargar) |
| F8 | Personal | **Activar o suspender** personal solo se guardaba en el `localStorage` del navegador: un portero «suspendido» seguía activo en el servidor y conservaba su acceso. | **Corregido (estado).** Se cambió también el backend, con aprobación del usuario: nuevo `POST /api/v1/staff/{id}/status` (`ACTIVE`/`INACTIVE`), solo para administración de la propia comunidad. Desactiva también la membresía de personal de esa comunidad, nunca la de administración ni otras comunidades. Así se cierran SSE, chat y push, y las sesiones si no le queda acceso. Prueba `StaffStatusAccessIT` (4/4). En el sandbox, la sesión del portero perdió el acceso en la siguiente petición (401) y lo recuperó al reactivarlo. **Gestionar acceso, también corregido:** nuevos `PUT /api/v1/staff/{id}/access` y `PUT /api/v1/staff/{id}` (`StaffAccessManagementIT`, 10/10).
- Solo roles `STAFF`/`SECURITY`: se quitó «Administrador» del formulario.
- La contraseña nunca se devuelve y se eliminó del `localStorage`, donde se guardaba en texto plano. Al cambiarla se cierran las sesiones.
- El correo y la contraseña de una cuenta que también usa otra comunidad no se pueden cambiar.
- Una cuenta de administración no se gestiona desde Personal.
- En el sandbox: crear el acceso, cambiar la contraseña (la antigua deja de servir) y quitar el acceso funcionaron por la interfaz. |
| F9 | Reservas (backend) | El backend no valida las transiciones: dejaría, por ejemplo, confirmar una reserva cancelada. El frontend ya solo ofrece las transiciones válidas. | **Pendiente**: tarea de backend |
| F10 | Otros paneles (fuera de alcance) | «Dashboard» en `SecurityLayout` y `SuperAdminLayout`; `PropertySelectorModal` dice «Las visitas solo pueden registrarse…» también desde PQRS. | Pendiente (solo visual) |

### 9.1 Verificación de reservas en el sandbox (navegador real)

Se creó una zona común sintética («Zona sintética auditoría») y una reserva sintética `PENDING`:

| Comprobación | Resultado |
|---|---|
| Sin botones Editar ni Eliminar | OK |
| La fila pendiente ofrece Aprobar, Rechazar y «Cancelar reserva» | OK |
| Aprobar llama a `POST /reservations/{id}/confirm` | OK |
| En el servidor queda `CONFIRMED` | OK |
| Tras recargar: «Confirmada», sin Aprobar | OK |
| Cancelar desde la interfaz → en el servidor `CANCELLED` | OK |
| No se llama a `PUT` ni a `DELETE` | OK |

**No verificado visualmente** (sin datos en el sandbox):
- personal, turnos, asistencia y la ficha del personal;
- el historial de citofonía con `INITIATING` o `FAILED`;
- reservas y marketplace con todos sus estados;
- los mensajes de éxito y error de acciones distintas de la edición de PQRS.

Quedan cubiertos por las pruebas unitarias.

## 10. Recomendaciones

1. **Usar siempre `statusLabelFor(dominio, valor)`** para mostrar un estado, y no escribir textos ni condiciones nuevas
   en los componentes.
2. **Migrar los diccionarios locales que quedan** al central, en una tarea aparte: `getReservationStatusLabel`
   (Reservas), las etiquetas del Marketplace, `SecurityChatPage` y `proxyTypes`. Hoy son correctos, pero están
   duplicados.
3. **Añadir el valor a `DOMAIN_STATUS_LABELS` en el mismo cambio** cuando el backend añada uno a un enum. La prueba
   de cobertura de `statusLabels.test.ts` debe actualizarse con él.
4. **Ejecutar `e2e/sandbox/admin-language-audit.cjs`** antes de cada entrega que toque el panel de administración.
   Debe dar 0 hallazgos.
5. **Decidir F7 y F8.** F8 tiene impacto de seguridad. Como regla general, una operación sin endpoint en el backend
   no debe ofrecerse en la interfaz ni darse por hecha si falla.
