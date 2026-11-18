# Sandbox E2E aislado (pruebas que escriben con la cuenta de un residente)

Cinco pruebas escriben con la cuenta del residente sobre **su propia unidad** (vehículos, mascotas, invitaciones,
paquetes y notificaciones). Contra la base local principal (`appunidades`) modificarían una unidad real, así que se
ejecutan **solo** contra este sandbox:

- `residents-my-home`: «registra, edita y elimina un vehículo», «registra, edita y elimina una mascota» y «genera un
  enlace de invitación de co-residente».
- `sec7-invitation-tokens`: «el emisor genera uno nuevo que invalida el anterior».
- `sec6-privacy-realtime`: «recibe el paquete de su unidad y no el de una unidad ajena».

## Aislamiento

| Elemento | Sandbox | Base principal |
|---|---|---|
| Base de datos | `havita_e2e_sandbox` (base propia en el PostgreSQL local) | `appunidades`: no se toca |
| Backend | `:9097`, con `--spring.datasource.url=…/havita_e2e_sandbox` | `:9094` |
| Almacenamiento de archivos | Directorio propio (`--storage.local.base-path`) | `./storage`: no se toca |
| Correo | `BREVO_API_KEY=sandbox-disabled`: no se envía nada | — |
| Datos | Comunidad, unidades `E2E-SBX-*` y cuentas `e2e-sbx-*@example.test`, creadas por cada ejecución con la API pública | — |
| Credenciales | Sintéticas, generadas por ejecución y guardadas fuera del repositorio; nunca se imprimen | `e2e/.env.e2e`, sin cambios |

El sandbox no modifica usuarios, unidades ni membresías reales, y no hay limpiezas: cada ejecución crea su propia
comunidad con un identificador único.

## Ejecución

1. **Crear la base**, una vez: `CREATE DATABASE havita_e2e_sandbox;` en el PostgreSQL local. Hibernate crea el esquema
   al arrancar el backend del sandbox.
2. **Generar un archivo de credenciales sintéticas** fuera del repositorio, con las claves `SBX_TAG`, `SBX_SA_EMAIL`,
   `SBX_SA_PASSWORD`, `SBX_ADMIN_*`, `SBX_RESIDENT_*` y `SBX_SECURITY_*`. Los correos deben ser `@example.test`.
3. **Arrancar el backend del sandbox** (desde `Havita-Backend`):
   `BREVO_API_KEY=sandbox-disabled ./gradlew bootRun --args="--server.port=9097 --spring.datasource.url=jdbc:postgresql://localhost:5432/havita_e2e_sandbox --storage.local.base-path=<dir> --havita.bootstrap.super-admin.email=$SBX_SA_EMAIL --havita.bootstrap.super-admin.password=$SBX_SA_PASSWORD"`
4. **Sembrar**: `SANDBOX_ENV_FILE=<archivo> python -I e2e/sandbox/seed.py`. Crea la comunidad, su administración, 3 unidades,
   un residente propietario (mediante invitación y registro) y portería. Escribe `sandbox.state` junto al archivo de
   credenciales.
5. **Vite del sandbox**: `npx vite --config e2e/sandbox/vite.sandbox.config.ts` (puerto 5177).
6. **Pruebas**: desde `e2e`, con `E2E_BASE_URL=http://<subdominio>.localhost:5177` y las credenciales `E2E_*_EMAIL` y
   `E2E_*_PASSWORD` del sandbox en el entorno, que prevalecen sobre `.env.e2e`:
   `E2E_ALLOW_WRITES=1 npx playwright test --grep "<títulos de las 5 pruebas>|authenticate as"`.
7. **Suite principal** contra `:9094`, excluyendo esas 5 pruebas con `--grep-invert`.

## Fase 2 (tests/phase2)

Las pruebas permanentes de la Fase 2 cubren el selector de unidades (elección obligatoria, SOS, dos pestañas y
revocación parcial), la asistencia por varias unidades, el voto por dos unidades con el estado leído del backend, la
delegación bloqueada por asistencia administrativa previa (D10), la revocación bloqueada por asistencia del delegado
(D9) y el filtro administrativo por estructura. Se ejecutan **solo** en este sandbox, con `E2E_SANDBOX=1` y
`E2E_PHASE2=1`; fuera de él se omiten.

1. **Credenciales**: además de las claves del punto 2, `SBX_P2OWNER_EMAIL`/`SBX_P2OWNER_PASSWORD` (propietario de dos
   unidades), `SBX_LESSEE_EMAIL`/`SBX_LESSEE_PASSWORD` (arrendatario), y para el cierre de E5 `SBX_COOWNER1_*`,
   `SBX_COOWNER2_*` (copropietarios de `E2E-SBX-104`) y `SBX_LESSEE2_*` (arrendatario de `E2E-SBX-104`), todas
   `@example.test` y fuera del repositorio. El backend del sandbox debe arrancarse con el `SBX_SA_*` del MISMO archivo.
2. **Sembrar** con la Fase 2: `SANDBOX_PHASE2=1 SANDBOX_ENV_FILE=<archivo> python -I e2e/sandbox/seed.py`. Además de
   la siembra base, el propietario de la Fase 2 queda con `E2E-SBX-102` y `E2E-SBX-103` (arrendatario invitado en
   103) y se crean las estructuras «Torre 1» y «Torre 10» con una unidad y un residente de censo cada una. El
   residente base sigue con una sola unidad (`E2E-SBX-101`), así que las pruebas existentes no cambian. Para el cierre
   de E5 se crea `E2E-SBX-104` con dos copropietarios (las dos invitaciones de propietario se generan con la unidad
   aún desocupada y después se registran) y un arrendatario invitado por el primero.
3. **Ejecutar** (desde `e2e`, con el Vite y el backend del sandbox arrancados):

   ```bash
   set -a; . <archivo>; . <dir>/sandbox.state; set +a
   E2E_SANDBOX=1 E2E_PHASE2=1 E2E_ALLOW_WRITES=1 E2E_ALLOW_USER_CREATION=1 \
   E2E_BASE_URL="http://$SBX_SUBDOMAIN.localhost:5177" \
   E2E_ADMIN_EMAIL="$SBX_ADMIN_EMAIL" E2E_ADMIN_PASSWORD="$SBX_ADMIN_PASSWORD" \
   E2E_RESIDENT_EMAIL="$SBX_RESIDENT_EMAIL" E2E_RESIDENT_PASSWORD="$SBX_RESIDENT_PASSWORD" \
   E2E_SECURITY_EMAIL="$SBX_SECURITY_EMAIL" E2E_SECURITY_PASSWORD="$SBX_SECURITY_PASSWORD" \
   E2E_P2_OWNER_EMAIL="$SBX_P2OWNER_EMAIL" E2E_P2_OWNER_PASSWORD="$SBX_P2OWNER_PASSWORD" \
   E2E_LESSEE_EMAIL="$SBX_LESSEE_EMAIL" E2E_LESSEE_PASSWORD="$SBX_LESSEE_PASSWORD"    E2E_COOWNER1_EMAIL="$SBX_COOWNER1_EMAIL" E2E_COOWNER1_PASSWORD="$SBX_COOWNER1_PASSWORD"    E2E_COOWNER2_EMAIL="$SBX_COOWNER2_EMAIL" E2E_COOWNER2_PASSWORD="$SBX_COOWNER2_PASSWORD"    E2E_LESSEE2_EMAIL="$SBX_LESSEE2_EMAIL" E2E_LESSEE2_PASSWORD="$SBX_LESSEE2_PASSWORD" \
   npx playwright test            # suite completa; solo la Fase 2: npx playwright test tests/phase2
   ```

   Cada ejecución de `tests/phase2` crea sus propias asambleas (y las finaliza), votos y una unidad temporal para la
   revocación parcial; la delegación de prueba se revoca al terminar. Una siembra nueva crea una comunidad nueva; no
   hay limpiezas sobre otras bases.
4. **Copropietarios** (cierre de E5, D11): `p2-representation.spec.ts` cubre la representación única entre dos
   copropietarios, la delegación entre copropietarios, la revocación bloqueada desde el pre-registro (D12), el
   registro administrativo (D13) y la representación administrativa obligatoria (D14: la administración elige al
   representante; el apoderado no está disponible y la administración no vota).
