# E2E · Módulos de Residentes de Havita

Auditoría funcional y suite Playwright de los módulos de Residentes.
Ejecución final: **2026-11-02**, entorno **local** (frontend Vite `http://limonar.localhost:5173`, backend Spring Boot `:9094`, PostgreSQL local), tenant **Limonar Parque Residencial 1**.

| Resultado final | Cantidad |
|---|---|
| ✅ PASSED | **54** (incluye 3 de autenticación `setup`) |
| ❌ FAILED | **15** — todos por **defectos reales de la aplicación** (0 por errores de la automatización) |
| ⛔ BLOCKED | **0** |
| ⏸ NOT RUN | **1** — omitido a propósito (crearía una cuenta de usuario nueva) |
| **Total** | **70** |

Los 14 fallos de la segunda corrida se reprodujeron idénticos en dos corridas completas consecutivas. El 15.º apareció en la corrida final, cuando se corrigió un falso positivo de la propia prueba (ver §7, intento 3).

---

## 1. Resumen de la auditoría

- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind 4 + TanStack Query 5 + SweetAlert2 + Zod 4. Rutas en `src/app/App.tsx`. La protección de rutas está en los layouts (`AdminLayout`, `ResidentLayout`, `SecurityLayout`).
- **Multi-tenant**: el tenant se resuelve por subdominio (`limonar.localhost`). El proxy de Vite (`changeOrigin: false`) reenvía el `Host` al backend, que resuelve el tenant con `GET /api/v1/public/tenant-config`. Los tokens se guardan en una cookie SSO y en `localStorage`.
- **Backend**: `ResidentController`, `ResidentInvitationController`, `PublicResidentInvitationController` y `ResidentSelfController`, con `@PreAuthorize` por rol y `TenantContextHolder` en los servicios.
- **Hallazgo principal**: el **alta y la edición de residentes desde el Directorio no funcionan**. La validación del formulario exige un campo (`propertyId`) que el formulario nunca envía. Además, el modal no cabe en pantalla con el número real de propiedades (110). Los listados, la búsqueda por nombre, correo y teléfono, la eliminación, las invitaciones, el registro por invitación y los permisos sí funcionan.

## 2. Inventario de funcionalidades (alcance A–E)

| # | Módulo / funcionalidad | Ruta / pantalla | Acción del usuario | Datos y validaciones | Resultado esperado | Permisos | Endpoints |
|---|---|---|---|---|---|---|---|
| A1 | Directorio · listado | `/admin/residents` | Ver tabla (escritorio) o tarjetas (móvil) | Página de 8 | Nombre, propiedad, tipo, contacto, estado | COMMUNITY_ADMIN, SUPER_ADMIN (UI) | `GET /residents?page&size&search` |
| A2 | Directorio · búsqueda | Campo «Buscar por nombre, apartamento o correo...» | Escribir (búsqueda en servidor) | máx. 100; el backend busca en nombre, correo, teléfono y documento | Filas que coinciden; vuelve a la página 1 | idem | idem |
| A3 | Directorio · filtro por tipo | Selector «Todos / Propietarios / Arrendatarios» | Elegir una opción | — | Solo residentes de ese tipo | idem | (no hay parámetro en el API) |
| A4 | Directorio · paginación | Barra «Mostrando X a Y de N» con ‹ › | Avanzar o retroceder | 8 por página | Totales reales | idem | `page=n` |
| A5 | Directorio · crear | Modal «Registrar Nuevo Residente» | Completar y enviar | nombre 2–100, correo válido ≤150, teléfono 7–20 `^\+?[0-9\s-]{7,20}$`, tipo Propietario/Arrendatario, propiedades (casillas), estado | Alta en el censo, aviso de éxito y fila nueva | idem (backend: SUPER_ADMIN, COMMUNITY_ADMIN) | `POST /residents`, `POST /residents/users/{userId}/properties` |
| A6 | Directorio · editar | Lápiz → modal «Editar Residente» | Cambiar datos o estado | mismas validaciones | Actualiza el residente existente | idem | debería ser `PUT /residents/{id}` |
| A7 | Directorio · eliminar | Papelera → confirmación SweetAlert | Confirmar o cancelar | — | Borra del backend y de la tabla | idem | `DELETE /residents/{id}` |
| B1 | Propiedades · invitar residente | `/admin/properties` → panel de la propiedad → «Invitar Residente» | Generar, copiar, WhatsApp, revocar | la propiedad debe estar VACANT; dura 24 h; un solo uso | QR y enlace únicos | ADMIN | `POST/GET /properties/{id}/resident-invitations`, `POST /resident-invitations/{id}/revoke` |
| B2 | Propiedades · asignar existente | Panel → «Asignar Existente» | Buscar y pulsar «Asignar» | — | El residente queda vinculado a la propiedad | ADMIN | `GET /residents`, `POST /residents/users/{id}/properties` |
| B3 | Propiedades · invitación múltiple | «Generar Enlace Multiple» | Seleccionar vacantes → «Generar Invitación (n)» | solo VACANT | Un enlace para n propiedades | ADMIN | `POST /properties/{main}/resident-invitations {additionalPropertyIds}` |
| C1 | Registro por invitación | `/register/invite/:token` (público) | Completar datos, aceptar términos | nombre, documento, correo, celular, contraseña ≥6, términos y privacidad | Cuenta creada y vinculada; el token queda consumido | público | `GET/POST /public/resident-invitations/{token}[/register]` |
| D1 | Mi Hogar · personas | `/resident/my-home` | Invitar (Arrendatario / Co-residente), cancelar invitación, revocar o reactivar | reglas propietario/arrendatario | Enlace de 24 h; personas de la unidad | RESIDENT | `/resident/me/people`, `/resident/me/invitations` |
| D2 | Mi Hogar · vehículos | Sección «Vehículos» | Añadir, editar, eliminar | placa obligatoria, mayúsculas, máx. 10 | Censo del vehículo | RESIDENT | `/resident/me/vehicles` |
| D3 | Mi Hogar · mascotas | Sección «Mascotas» | Añadir, editar, eliminar; raza peligrosa | nombre obligatorio | Censo; aviso de póliza; etiqueta PPP | RESIDENT | `/resident/me/pets` |
| E1 | Protección de rutas y roles | `/admin/*`, `/resident/*` | Acceso directo por URL | rol en sesión | Redirige a `/login` | — | `@PreAuthorize` |

**Dependencias:** Residentes depende de Propiedades (pasa a OCCUPIED al asignar), Identidad (usuarios y membresías), Asambleas (al editar o borrar se invalidan delegaciones de voto) y Portería (SECURITY puede leer el censo).
**No existe** una vista de «detalle de residente», así que no hay spec para ella.

## 3. Pruebas implementadas

| Spec | Pruebas | Cubre |
|---|---|---|
| `tests/auth.setup.ts` | 3 | Login real por UI de admin, residente y portería → `storageState` |
| `residents-list.spec.ts` | 5 | columnas, carga paginada, contenido de fila, paginación y totales, estado vacío |
| `residents-search.spec.ts` | 7 | nombre (sin distinguir mayúsculas), correo, teléfono, apartamento, limpiar búsqueda, máx. 100, caracteres especiales |
| `residents-filters.spec.ts` | 3 | opciones, filtrar arrendatarios, filtrar propietarios |
| `residents-create.spec.ts` | 9 | cabe en pantalla, abrir/cerrar, obligatorios, formatos, mínimo, máximos y normalización, casillas, alta válida, correo duplicado |
| `residents-edit.spec.ts` | 5 | precarga, guardar cambios, estado Inactivo, cancelar, validación |
| `residents-delete.spec.ts` | 3 | confirmar o cancelar, borrado real, aviso cuando el backend falla |
| `residents-property-invitations.spec.ts` | 5 | generar y revocar, reabrir pendiente, propiedad ocupada, asignar existente, invitación múltiple |
| `residents-invitation-registration.spec.ts` | 8 | token inválido, datos de la invitación, obligatorios, formatos, máximos, mostrar contraseña, revocada, registro completo (NOT RUN) |
| `residents-my-home.spec.ts` | 8 | secciones, placa, placa obligatoria, CRUD de vehículo, raza peligrosa, CRUD de mascota, invitar y cancelar |
| `residents-permissions.spec.ts` | 14 | anónimo (UI y API), RESIDENT, SECURITY, ADMIN (UI, 404, X-Tenant-ID falsificado, userId inexistente) |

Diseño: Page Objects (`pages/`), fixtures (`fixtures/test.ts`: `adminApi`, `cleanup`, `asRole`, `requireWrites`), helpers (`helpers/api.ts`, `seed.ts`, `swal.ts`, `data.ts`). Locators `getByRole`, `getByLabel` y `getByPlaceholder`, sin clases CSS. Sin `waitForTimeout`, salvo una ventana de observación documentada en una aserción negativa. No se añadió ningún `data-testid` ni se modificó código de la aplicación.

## 4. Configuración

### Playwright Test
- Paquete autónomo `Havita-Frontend/e2e/`, para no tocar los cambios sin commit de `package.json` y `package-lock.json` de la app. Dependencias: `@playwright/test@1.64.1`, y `typescript` y `@types/node` en las mismas versiones que el frontend (solo para el typecheck). Navegador: Chromium.
- `playwright.config.ts`: **guard de seguridad** `assertLocalTarget` (rechaza cualquier host que no sea `localhost`, `*.localhost` o `127.0.0.1`); `workers: 1` (BD compartida); `trace`, `screenshot` y `video` se conservan solo si la prueba falla; `serviceWorkers: 'block'` (por la PWA); reportes `list`, `html` y `json`. No arranca servidores: usa el frontend y el backend que ya corren localmente.
- Las llamadas API desde Node van a `127.0.0.1:5173` con cabecera `Host: limonar.localhost:5173`, porque en Windows Node no resuelve `*.localhost`.

### Playwright MCP
- Registrado en Claude Code: `claude mcp add playwright --scope local -- npx -y @playwright/mcp@0.0.84 --output-dir <e2e>/mcp-output`. `claude mcp get playwright` → **✔ Connected**.
- Sus herramientas de navegador solo se cargan al **reiniciar la sesión** de Claude Code. En esta sesión la exploración se hizo con Playwright Test (instantáneas ARIA y capturas de los fallos). **Pendiente**: comprobar el control interactivo del navegador por MCP tras reiniciar.
- Quitarlo: `claude mcp remove playwright -s local`.

### Variables de entorno (`e2e/.env.e2e`, en `.gitignore`)

| Variable | Uso |
|---|---|
| `E2E_BASE_URL` | `http://limonar.localhost:5173` |
| `E2E_ADMIN_EMAIL` / `_PASSWORD` | COMMUNITY_ADMIN |
| `E2E_RESIDENT_EMAIL` / `_PASSWORD` | RESIDENT propietario |
| `E2E_SECURITY_EMAIL` / `_PASSWORD` | SECURITY |
| `E2E_TENANT_RESIDENT_EMAIL` / `_PASSWORD` | RESIDENT arrendatario (escenarios futuros; hoy solo se verifica su acceso) |
| `E2E_ALLOW_WRITES=1` | permite pruebas que crean y borran datos sintéticos |
| `E2E_ALLOW_USER_CREATION` | sin definir: el registro completo queda NOT RUN |

### Comandos
```bash
cd Havita-Frontend/e2e
npm install && npx playwright install chromium   # primera vez
npm test                                         # suite completa
npx playwright test residents-delete.spec.ts     # un archivo
npx playwright test -g "filtro por tipo"         # por nombre
npm run report                                   # reporte HTML
npm run typecheck
```

## 5. Verificaciones previas (sin mostrar secretos)

| Verificación | Resultado |
|---|---|
| Backend usa BD local | perfil `default`, sin `SPRING_DATASOURCE_URL` en `.env` ni `.idea` → `localhost:5432` |
| Login admin | OK · rol `COMMUNITY_ADMIN` · tenant Limonar |
| Login propietario | OK · `RESIDENT` · 2 propiedades OCCUPIED como Propietario (Torre 1-Piso 5-Apto 1 y Apto 2) |
| Login arrendatario | OK · `RESIDENT` · Apto 1 como Arrendatario |
| Login portero | OK · `SECURITY` · `GET /residents` 200, `GET /properties` 200 |
| `.env.e2e` ignorado | `git check-ignore` → `e2e/.gitignore:7` |
| Contraseñas y tokens en logs | grep de la contraseña y de `eyJ` en los logs → 0 coincidencias |
| No crear usuarios ni cambiar contraseñas | se cumple (el registro completo queda NOT RUN) |

## 6. Resultados de la ejecución final

### ❌ FAILED (15) — todos son defectos de la aplicación

| Prueba | Evidencia | Defecto |
|---|---|---|
| crear · el formulario cabe en una pantalla estándar | `viewport ratio 0` para el título del modal | FE-04 |
| crear · registra un residente válido | no hay POST; resumen: «Invalid input: expected string, received undefined» | FE-01 |
| crear · correo duplicado muestra error del backend | no hay POST (bloqueado por FE-01) | FE-01 |
| editar · modal precargado | `Estado de cuenta` = `"Activo"`, se esperaba `"ACTIVE"` | FE-03 |
| editar · guardar nombre y teléfono | no hay petición; mismo error de validación | FE-01 (enmascara FE-02) |
| editar · cambiar a Inactivo | estado en el API sigue `ACTIVE` | FE-01 / FE-03 |
| eliminar · el backend falla y no debe haber aviso de éxito | se mostró «Residente eliminado» tras un DELETE 500 | FE-11 |
| filtros · Arrendatarios oculta propietarios | la fila «Propietario» sigue visible | FE-05 |
| filtros · Propietarios oculta arrendatarios | la fila «Arrendatario» sigue visible | FE-05 |
| listado · la fila muestra la propiedad | la columna Propiedad muestra el UUID `7f68bb9e-…` | FE-07 |
| listado · paginación y total real | «Mostrando 1 a 8 de **8**» con 9 resultados | FE-06 |
| búsqueda · por número de apartamento | sin resultados buscando el número de la unidad | BE-08 |
| Mi Hogar · CRUD de vehículo | DELETE 200, pero la placa sigue en la lista | FE-09 |
| Mi Hogar · CRUD de mascota | DELETE 200, pero la mascota sigue en la lista | FE-09 |
| invitaciones · reabrir la invitación pendiente | «Copiar» no hace nada (falta el enlace) | FE-10 |

### ⏸ NOT RUN (1)
- `registro completo crea el residente en la vivienda y el token queda consumido`: crea una **cuenta de usuario nueva**, que ningún API permite borrar. Queda omitido por la restricción «no crear usuarios». Para ejecutarlo: `E2E_ALLOW_USER_CREATION=1`. Queda una cuenta `@example.test` residual.

### ⛔ BLOCKED (0)
Ninguno con la configuración actual. Sin credenciales, las pruebas autenticadas se marcan solas como BLOCKED.

### ✅ PASSED (54)
Login de los 3 roles; abrir y cerrar el modal; validaciones de obligatorios, formato, mínimos y máximos; casillas de propiedades; cancelar o confirmar borrado; cancelar edición y validar en edición; opciones del filtro; registro por invitación (token inválido, datos, obligatorios, formatos, máximos, mostrar contraseña, revocada); columnas, carga paginada y estado vacío; Mi Hogar (secciones, placa, obligatoriedad, raza peligrosa, invitación de co-residente con cancelación, recorrido completo); los 14 de permisos; invitación individual con revocación; propiedad ocupada → 409 con mensaje; asignar existente; invitación múltiple; búsqueda por nombre, correo y teléfono, limpieza, máx. 100 y caracteres especiales.
Lista literal: `evidence/final-status.txt`.

## 7. Defectos confirmados

Severidad: 🔴 crítica · 🟠 alta · 🟡 media · ⚪ baja.

**Frontend**

| ID | Sev. | Descripción | Ubicación | Prueba |
|---|---|---|---|---|
| FE-01 | 🔴 | **No se puede crear ni editar un residente.** `residentSchema` exige `propertyId` (string), pero la página valida `{propertyIds: string[]}`. La validación siempre falla con «Invalid input: expected string, received undefined» (en inglés y sin campo asociado) y el envío nunca llega al backend. | `ResidentsPage.tsx:160-168`, `residentSchema.ts:22` | create, edit |
| FE-02 | 🟠 | *(Solo en código; FE-01 lo enmascara.)* Al editar se llama a `residentApi.create` (POST) en vez de PUT, lo que crearía duplicados o fallaría por correo duplicado. Los avisos «registrado» y «actualizado» se muestran antes de conocer el resultado. `createMutation` y `updateMutation` no se usan. | `ResidentsPage.tsx:60-66, 183-197` | edit · guardar |
| FE-03 | 🟠 | El selector «Estado de cuenta» usa los valores `Activo` e `Inactivo`, pero el backend usa `ACTIVE` e `INACTIVE`: no refleja el estado real y enviaría un valor de enum inválido. | `ResidentsPage.tsx:594-603` | edit · precarga |
| FE-04 | 🔴 | El modal no tiene altura máxima ni scroll y pinta una casilla por cada propiedad (110). A 1366×860 el título y los botones quedan fuera de la pantalla y no se puede enviar. Las etiquetas son ambiguas («Apto 2» se repite en varias torres). | `ResidentsPage.tsx:460-570` | crear · cabe en pantalla |
| FE-05 | 🟠 | El filtro por tipo no filtra: `filterType` se guarda pero nunca se aplica, y el API no tiene ese parámetro. | `ResidentsPage.tsx:50, 85-88` | filtros (2) |
| FE-06 | 🟡 | El total de la paginación usa los resultados de la página y no `totalElements`. | `ResidentsPage.tsx:430` | paginación |
| FE-07 | 🟡 | La columna «Propiedad» (tabla y móvil) muestra el `propertyId` (UUID) en vez del número o nombre de la unidad. | `ResidentsPage.tsx:289, 375` | fila |
| FE-09 | 🟡 | Mi Hogar: al eliminar un vehículo o una mascota no se recarga la lista (el `setState` está comentado y falta `refetch`). Desaparece solo al recargar la página. | `ResidentMyHome.tsx:319-322, 373-376` | vehículos y mascotas |
| FE-10 | 🟡 | Al reabrir «Invitar Residente» con una invitación pendiente, el listado no trae `link`: el QR sale vacío y «Copiar» no hace nada. La UI no usa `POST /resident-invitations/{id}/regenerate`, que sí existe. | `ResidentInvitationModal.tsx:75-80` | reabrir |
| FE-11 | 🟠 | Al eliminar se muestra «Residente eliminado» aunque el backend falle (el aviso va justo después de `mutate()` y la mutación no tiene `onError`). La variante `deleteMutation`, que sí avisa en `onSuccess`, no se usa. | `ResidentsPage.tsx:215-218` | eliminar · falla |
| FE-12 | ⚪ | Accesibilidad: en el login, la etiqueta «Correo electrónico» no está asociada al input (`FormField` pone el `id` en el `div` envolvente). En el registro, «Celular» es obligatorio pero no muestra `*`. | `LoginPage.tsx:305-330`, `ResidentRegistrationPage.tsx` | (automatización adaptada) |
| FE-13 | ⚪ | Placa: `maxlength=10` corta la entrada antes de normalizarla, así que los símbolos cuentan para el límite («ab c-12*3x» → «ABC-123X»). | `ResidentMyHome.tsx:905` | (documentado en prueba que pasa) |

**Backend**

| ID | Sev. | Descripción | Evidencia |
|---|---|---|---|
| BE-08 | 🟡 | La búsqueda no incluye el número ni el nombre de la propiedad, aunque la UI anuncia «Buscar por … apartamento» (`ResidentRepository.searchResidents`). | búsqueda por apartamento |
| BE-14 | 🟠 | `DELETE /properties/{id}` de una propiedad que tuvo invitaciones (aunque estén revocadas) devuelve **HTTP 500** por una violación de FK no controlada (`resident_invitations`), en vez de un 409 con mensaje. No hay forma de borrar invitaciones. | log del backend: «violates foreign key constraint … on table "resident_invitations"» |
| BE-15 | 🟠 *(riesgo de seguridad, no verificado en ejecución)* | `assignProperties` busca `residentRepository.findById(userId)` y `userRepository.findById(userId)` **sin filtrar por tenant**. `ResidentAssignModal` le pasa `resident.id` como `userId`. Un admin podría vincular un residente o usuario de otro tenant a una propiedad propia. En local solo se resuelve un tenant, así que **no se pudo probar entre tenants**. Requiere una prueba de backend con dos tenants. | `ResidentService.java:392-394` |
| BE-16 | ⚪ | La validación del cuerpo (`@Valid`, 400) se ejecuta antes que `@PreAuthorize` (403): un RESIDENT recibe 400 en lugar de 403 si el cuerpo es inválido. No expone datos. | primera corrida de permisos |

**Descartados o confirmados como correctos:** la eliminación de residentes funciona (borra del backend y de la tabla; cancelar no borra). El aislamiento por `X-Tenant-ID` falsificado funciona (sin datos ajenos). RESIDENT no puede listar, crear, borrar ni asignar en el censo, ni generar invitaciones de admin. SECURITY puede leer pero no borrar. Las rutas protegidas redirigen a `/login`. Las invitaciones revocadas o inválidas se rechazan. Una propiedad ocupada → 409 con mensaje claro.

## 8. Problemas de automatización (corregidos, máximo 3 intentos)

| Intento | Problema | Causa | Corrección |
|---|---|---|---|
| 1 | El login no encontraba el correo ni la contraseña | etiqueta no asociada (FE-12) y nombre accesible distinto | `getByPlaceholder` para el correo; `getByRole('textbox', {name:'Contraseña'})` |
| 2 | Contraseña del registro no encontrada | la etiqueta es «Contraseña *» | `getByLabel(/^Contraseña/)` |
| 2 | Clics fuera de la pantalla en el modal | FE-04 (defecto real) | prueba propia del defecto a 1366×860 y pruebas de lógica con viewport de 2400 px de alto (documentado en el spec) |
| 2 | Permisos devolvían 400 | cuerpo inválido (`propertyIds: []`) en la prueba (BE-16) | cuerpo válido |
| 2 | Placa: valor esperado incorrecto | la expectativa no consideraba `maxlength` | expectativa corregida y FE-13 documentado |
| 2 | «Copiar Enlace» ambiguo | había 2 botones | `exact: true` |
| 2 | «Limpiar búsqueda» esperaba una petición | react-query sirve de caché | se valida el resultado en pantalla |
| 2 | Propiedades sintéticas imposibles de borrar | BE-14 | **pool reutilizable** `E2E-FIX-INV-01..08` y `E2E-FIX-BLK-01..02`, que se reinicia antes y después de cada uso |
| 3 | Falso positivo en «backend falla al eliminar» | aserción negativa instantánea | `MutationObserver` y ventana acotada de 1,5 s → reveló FE-11 |

## 9. Integridad de los datos

- Antes de la primera corrida se tomó una instantánea de los datos preexistentes: 7 residentes y 100 propiedades (id, nombre, correo, teléfono, tipo, estado, propiedad), más los vehículos, mascotas y personas del propietario y del arrendatario. Se comparó byte a byte tras **cada** corrida (1, 2, 3 y final): **sin cambios**.
- Todos los datos creados llevan el prefijo `E2E-` y correos `@example.test`. Al final quedan **0 residentes E2E**, 0 vehículos y mascotas E2E, y 0 invitaciones pendientes del propietario.
- **Residuo conocido**: 10 propiedades VACANT `E2E-FIX-*` (no se pueden borrar por BE-14). Se reutilizan en cada corrida, así que no crecen. Las crearon las corridas, nunca son datos preexistentes. También quedan invitaciones revocadas o expiradas asociadas a ellas.

## 10. Evidencias

- `evidence/final-status.txt`: estado de cada una de las 70 pruebas en la corrida final.
- `evidence/run1.log`, `run2.log`, `run3-isolated.log`, `final-run.log`: salida literal (en `.gitignore`).
- `playwright-report/` (`npm run report`) y `test-results/<prueba>/`: captura, video, `trace.zip` y `error-context.md` (instantánea ARIA) de cada fallo.
- ⚠️ Las capturas y trazas muestran el directorio con **nombres de residentes preexistentes de la BD local** y pueden contener tokens Bearer locales de corta vida. Están en `.gitignore`: no compartirlas fuera del equipo.

## 11. Pendiente de probar

1. Registro completo por invitación (NOT RUN; requiere permitir crear usuarios).
2. Diferencias propietario/arrendatario en Mi Hogar (el arrendatario está verificado y en `.env.e2e`, pero aún no tiene escenarios): quién puede remover a quién, delegar o revocar el voto, revocar o reactivar personas.
3. Aislamiento entre tenants de `assignProperties` (BE-15) y del resto de endpoints con un segundo tenant local.
4. Altas y ediciones exitosas en el Directorio, duplicados y el comportamiento real de FE-02: se podrán validar cuando se corrija FE-01.
5. Vista móvil (tarjetas) del directorio y de Mi Hogar.
6. Interacción con el navegador vía Playwright MCP (tras reiniciar Claude Code).
7. Transferencia de propietario (`PropertyTransferModal`), historial de residentes de la propiedad e importación masiva.

## 12. Recomendaciones

1. **Prioridad 1**: corregir FE-01, FE-04 y FE-11; después FE-02 y FE-03 (enviar `PUT /residents/{id}` con `status` `ACTIVE`/`INACTIVE`). Validar con `residents-create`, `residents-edit` y `residents-delete`, que ya codifican el comportamiento esperado.
2. Implementar el filtro por tipo en el backend (parámetro `type`) y mostrar `totalElements` y `propertyNumber` en el directorio.
3. Decidir si la búsqueda debe incluir la unidad; si no, cambiar el placeholder.
4. Backend: transformar la violación de FK en 409 y permitir borrar o archivar invitaciones. Revisar urgentemente el filtro por tenant en `assignProperties`.
5. Mi Hogar: llamar a `refetch` tras eliminar. En la invitación pendiente, ofrecer «Regenerar» con el endpoint existente.
6. Corregir la asociación etiqueta–input en `FormField` (beneficia a accesibilidad y a la automatización).
7. Integrar la suite en CI solo contra un entorno efímero con BD sembrada, nunca contra producción. Mantener el guard local.

## 13. Ejecuciones posteriores a las correcciones de seguridad (2026-11-03)

| Ejecución | Backend | Resultado | Evidencia |
|---|---|---|---|
| TASK-005 (SEC-1) | :9095 | 54 PASSED / 15 FAILED / 1 NOT RUN | `evidence/task005-e2e.log` |
| TASK-006 (SEC-2), +1 prueba | :9096 | 55 PASSED / 15 FAILED / 1 NOT RUN | `evidence/task006-e2e.log` |
| SEC-3 | :9097 | 55 PASSED / 15 FAILED / 1 NOT RUN | `evidence/sec3-e2e.log` |
| SEC-6, +5 pruebas (`tests/security/sec6-privacy-realtime.spec.ts`) | :9097 | **60 PASSED / 15 FAILED / 1 NOT RUN** | `evidence/sec6-e2e.log` |
| A-8 (baja lógica), `residents-delete.spec.ts` reescrita (4 pruebas) | :9097 | **62 PASSED / 14 FAILED / 1 NOT RUN** | `evidence/a8-e2e-final.log` |

| TASK-007 (formulario: #1, #2, #3, #8, #9) | :9097 | **68 PASSED / 8 FAILED / 1 NOT RUN** | `evidence/t007-e2e.log` |
| TASK-008 (directorio: #4, #5, #6, #10 y D-5), +3 pruebas (`residents-status-filter.spec.ts`) | :9097 | **76 PASSED / 3 FAILED / 1 NOT RUN** (2 ejecuciones idénticas) | `evidence/t008-e2e-run2.log` |
| TASK-011 (Mi Hogar #7, invitación reabierta #11): persistencia tras recarga en vehículo y mascota; flujo «Generar nuevo enlace» | :9097 | **79 PASSED / 0 FAILED / 1 NOT RUN** (2 ejecuciones idénticas) | `evidence/t011-e2e-run1.log`, `t011-e2e-run2.log` |
| SEC-7 (tokens de invitación), +1 prueba (`tests/security/sec7-invitation-tokens.spec.ts`) | :9097 | **80 PASSED / 0 FAILED / 1 NOT RUN** (ejecución 1; la 2 se interrumpió por falta de memoria y no cuenta) | `evidence/sec7-e2e-run1.log` |
| Cierre de SEC-7, con la base local ya migrada (tokens en SHA-256) | :9097 | **80 PASSED / 0 FAILED / 1 NOT RUN** (una ejecución, en primer plano) | `evidence/sec7-close-e2e.log` |
| SEC-8 (transferencia de propietario e historial), +2 pruebas (`tests/security/sec8-property-transfer.spec.ts`, solo unidades sintéticas) | :9097 | **82 PASSED / 0 FAILED / 1 NOT RUN** | `evidence/sec8-e2e.log` |
| SEC-9 P0 (autorización desde PostgreSQL, alcance global y aislamiento de comunidades) | :9097 | **82 PASSED / 0 FAILED / 1 NOT RUN** | `evidence/sec9-e2e.log` |
| SEC-9 P1 (revocación de sesiones, SSE inmediato, comprobación transaccional y auditoría) | :9097 | **82 PASSED / 0 FAILED / 1 NOT RUN** | `evidence/sec9p1-e2e.log` |

Tras A-8, FE-11 ya no falla en la baja de residentes, aunque sigue pendiente en alta y edición. Tras TASK-007 dejan de fallar los 6 defectos del formulario. Tras TASK-008, los 5 del Directorio. Quedan **3**, todos de TASK-011: Mi Hogar vehículo y mascota, e invitación pendiente al reabrir (`evidence/t008-failed-list.txt`). Tras TASK-011 no queda ningún fallo. La prueba «reabrir el modal…» cambió de expectativa: el enlace de un solo uso ya no se vuelve a mostrar desde el listado, y la prueba comprueba la regeneración explícita, que el token anterior queda invalidado (409) y que el nuevo es válido (justificación en `tasks/RESIDENTS_FIX_PLAN.md` §7.8). Con D-5, la vista por defecto muestra solo activos, y las pruebas de baja y edición comprueban la fila inactiva con el filtro «Inactivos» o «Todos».

En todas las ejecuciones los 15 fallos son **los mismos defectos funcionales de §7**, todavía sin corregir (pendientes de TASK-007 y siguientes; ver `tasks/RESIDENTS_FIX_PLAN.md`). La lista exacta está en `evidence/sec6-failed-list.txt`. Las pruebas nuevas de seguridad (asambleas, comunicaciones y SSE en el navegador) pasan. Detalle en `tasks/SECURITY_TRANSVERSAL.md` §6.9.

## 14. Sandbox aislado y recuperación de las 5 pruebas bloqueadas (2026-11-06)

**IMPLEMENTADO y VERIFICADO.** Cinco pruebas escribían con la cuenta real del residente E2E sobre su propia unidad: contadores de vehículos y mascotas, invitaciones, paquetes y notificaciones. Ahora:

- **Solo se ejecutan en un sandbox aislado** (`e2e/sandbox/`, ver su `README.md`):
  - base propia `havita_e2e_sandbox` y backend en `:9097`, con almacenamiento propio y el correo desactivado;
  - datos sintéticos (`E2E-SBX-*`, `e2e-sbx-*@example.test`) creados con la API pública en cada ejecución.
- **`requireSandbox()`** (`fixtures/test.ts`): fuera del sandbox (`E2E_SANDBOX` distinto de `1`) se omiten como **BLOCKED** con su motivo, y nunca escriben en la base principal.

| Prueba | Base principal | Sandbox |
|---|---|---|
| `residents-my-home` · vehículo | omitida (BLOCKED) | ✅ |
| `residents-my-home` · mascota | omitida (BLOCKED) | ✅ |
| `residents-my-home` · invitación de co-residente | omitida (BLOCKED) | ✅ |
| `sec7-invitation-tokens` · regenerar enlace | omitida (BLOCKED) | ✅ |
| `sec6-privacy-realtime` · paquete por SSE | omitida (BLOCKED) | ✅ |

**Ejecución final:**
- **Base principal:** 77 PASSED, 0 FAILED y 6 omitidas (las 5 anteriores más la habitual `E2E_ALLOW_USER_CREATION`). Evidencia: `evidence/sec9-final-main-e2e.log`.
- **Sandbox:** 8 PASSED (3 autenticaciones y las 5 pruebas). Evidencia: `evidence/sec9-final-sandbox-e2e.log`.
- **Total:** 82 de 83 pruebas ejecutadas y superadas; 1 NOT RUN, la habitual.
- **Integridad:** 645 de 645 filas reales idénticas columna a columna. Las 78 filas que cambian son del *pool* sintético `E2E-` que la suite reinicia.

## 15. Revisión previa a la Fase 2: suite completa en el sandbox (2026-11-06)

**VERIFICADO.** Por primera vez, la suite completa se ejecutó **solo** en el sandbox aislado, con una comunidad sintética nueva sembrada por `e2e/sandbox/seed.py`. No se ejecutó nada contra la base principal.

- **Resultados:**
  - suite completa: **81 PASSED, 0 FAILED y 2 omitidas**;
  - el registro con creación de cuenta (`E2E_ALLOW_USER_CREATION=1`, seguro en el sandbox) se ejecutó aparte: **1/1**;
  - la delegación de voto de una unidad ajena se omite porque el sandbox solo tiene una unidad ocupada; la cubre `ResidentScopedExpressionsIT` en el backend.
- **Total:** 82 de 83 superadas, 0 fallos.
- **Evidencia:** `evidence/sec9-phase2-gate-sandbox-full.log` y `evidence/sec9-phase2-gate-sandbox-registration.log`.
- **Integridad de la base principal:** 737 de 737 filas idénticas, 0 diferencias.

## 16. Fase 2 / E2: selector de unidades (2026-11-06)

**VERIFICADO**, solo en el sandbox aislado, con datos sintéticos.

- **Suite completa: 83/83.**
- **Varias unidades** (spec auxiliar fuera del repositorio): 3/3. Cubre el panel de elección, el SOS bloqueado sin unidad, dos pestañas con unidades distintas (vehículos y alerta en la unidad de cada pestaña) y la revocación parcial sin cerrar sesión.
- **Evidencia:** evidence/phase2-e2-sandbox-full.log y evidence/phase2-e2-sandbox-multi-unit.log.
- **Detalle:** tasks/PHASE2_UNIT_SELECTOR_ANALYSIS.md §16.
- **Pendiente (E5):** llevar al repositorio la siembra de varias unidades y la spec de pestañas.

## 17. Fase 2 / E3: voto por varias unidades (2026-11-09)

**VERIFICADO**, solo en el sandbox aislado.

- **Suite completa: 83/83.**
- **Voto por dos unidades desde el modal: 1/1.** Se vota por cada unidad sin cambiar la unidad activa, ambas quedan VOTED y un reintento responde 409.
- **Regresión de varias unidades (E2): 3/3.**
- **Evidencia:** evidence/phase2-e3-sandbox-full.log, phase2-e3-sandbox-multi-unit-voting.log y phase2-e3-sandbox-multi-unit-regression.log.
- **Pendiente (E5):** llevar las specs auxiliares al repositorio.

## 18. Fase 2 / cierre de E3 y E4: filtro por estructura (2026-11-09)

**VERIFICADO**, solo en el sandbox aislado, con torres sintéticas «Torre 1» y «Torre 10» y unidades sin estructura.

- **Suite completa: 83/83.**
- **Filtro por estructura: 3/3.** Cubre el Directorio en escritorio y en móvil, y la lista de Unidades.
- **Evidencia:** evidence/phase2-e4-sandbox-full.log y evidence/phase2-e4-sandbox-structure-filter.log.
- **Pendiente (E5):** llevar las specs auxiliares al repositorio.

## 19. Fase 2 / E5: pruebas permanentes de la Fase 2 (2026-11-09)

**VERIFICADO**, solo en el sandbox aislado (havita_e2e_sandbox), sembrado con `SANDBOX_PHASE2=1` y con datos sintéticos.

- **Migración:** las specs auxiliares de E2, E3 y E4 que estaban fuera del repositorio ahora están en `tests/phase2`:
  - `p2-unit-selector`: elección obligatoria en móvil y SOS sin unidad; dos pestañas independientes y pánico desde la unidad de la pestaña; revocación parcial.
  - `p2-assemblies`: asistencia por varias unidades sin cambiar la unidad activa; voto por dos unidades, con la insignia leída del backend («1 de 2» y luego «todas», también desde otro dispositivo, sin `localStorage`); delegación bloqueada por pre-registro administrativo (D10); revocación bloqueada por asistencia del delegado (D9).
  - `p2-structure-filter`: Directorio en escritorio y en móvil, y lista de Unidades.
- **Utilidades:** `helpers/phase2.ts`.
- **Siembra:** `sandbox/seed.py` con `SANDBOX_PHASE2=1`.
- **Comandos:** en `sandbox/README.md`.
- **Resultados:**
  - Fase 2: 13/13, con 3 de autenticación y 2 ejecuciones sobre la misma siembra (repetible).
  - **Suite completa en el sandbox: 93/93**, 0 omitidas.
- **Evidencia:** `evidence/phase2-e5-sandbox-full.log` y `evidence/phase2-e5-sandbox-phase2.log`.
- **Copropietarios:** no hay prueba E2E porque la regla de representación no está definida; lo cubre el backend en `AssemblyConsolidationIT`.

## 20. Fase 2 / cierre de E5: copropietarios, revocación y registro administrativo (2026-11-10)

**VERIFICADO**, solo en el sandbox aislado (havita_e2e_sandbox), sembrado con `SANDBOX_PHASE2=1`.

- **Siembra:** se añadió `E2E-SBX-104`, con dos copropietarios sintéticos y un arrendatario.
- **Spec nueva `tests/phase2/p2-representation.spec.ts`, 4 pruebas:**
  - dos copropietarios se registran a la vez: una sola representación, quórum 1; el otro ve la unidad registrada y sin botón; solo vota el representante;
  - delegación entre copropietarios: el otro copropietario no la revoca y ve el mensaje real del backend;
  - revocación bloqueada desde el pre-registro en una asamblea programada (en la interfaz) y en curso; el delegado vota;
  - registro administrativo: válido desde la interfaz con quórum 1, persona no autorizada rechazada y asamblea finalizada rechazada con el motivo real en la interfaz.
- **Ajustes de specs existentes:**
  - `p2-assemblies`: mensaje de D12.
  - `p2-structure-filter`: «Todas» se acota con la búsqueda, porque el directorio pagina y la siembra tiene más residentes.
- **Resultados:**
  - Fase 2: 17/17, incluidas 3 de autenticación, en la segunda ejecución sobre la misma siembra.
  - **Suite completa en el sandbox: 97/97.**
- **Evidencia:** `evidence/phase2-e5-closure-sandbox-full.log` y `evidence/phase2-e5-closure-sandbox-phase2.log`.

## 21. Fase 2 / cierre final de E5 — D14 (2026-11-10)

**VERIFICADO**, solo en el sandbox aislado, con datos sintéticos.

- **`p2-representation` (6 pruebas):**
  - la administración elige al copropietario representante en la interfaz: sin preselección, no guarda sin elegir y el arrendatario sin delegación aparece desactivado;
  - el apoderado no está disponible en la interfaz ni por API;
  - sin representante: `REPRESENTATIVE_REQUIRED`;
  - nadie sustituye al representante (auto-registro ni registro administrativo);
  - solo el representante vota en cada pregunta, la administración no vota y el quórum es 1;
  - asamblea finalizada rechazada en la interfaz;
  - al dar de baja al autor de una delegación, esta se invalida y el otro copropietario recupera el derecho de voto.
- **`p2-assemblies`:** el pre-registro de D10 identifica al representante.
- **Repetibilidad:** 4 ejecuciones seguidas de la Fase 2 sobre la misma siembra, 18/18 cada una.
- **Suite completa en el sandbox: 98/98.**
- **Evidencia:** `evidence/phase2-e5-d14-sandbox-full.log` y `evidence/phase2-e5-d14-sandbox-phase2.log`.
