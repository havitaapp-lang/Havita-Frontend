# Seguridad en Havita

**Versión:** 1.0
**Fecha de entrada en vigencia:** 01 de Octubre de 2026

En **Havita**, entendemos que la plataforma gestiona información esencial para el funcionamiento diario y la convivencia de las Copropiedades. Por ello, hemos diseñado nuestra arquitectura integrando la seguridad desde su base. 

Esta página describe públicamente nuestras prácticas y controles de seguridad orientados a proteger la confidencialidad, integridad y disponibilidad de la información de su Conjunto.

---

## 1. Arquitectura de Aislamiento (Multi-Tenancy)

Havita opera bajo un modelo *Multi-Tenant* (múltiples inquilinos). Esto significa que la base de datos está diseñada con barreras estrictas de aislamiento:
- Todo el acceso a los datos requiere invariablemente la identificación del `tenant_id` (Identificador único de su Copropiedad).
- Los datos de su Conjunto están lógicamente aislados; un residente, vigilante o administrador de un Conjunto "A" no tiene forma alguna de consultar, modificar o visualizar los registros del Conjunto "B".

## 2. Autenticación y Autorización

Implementamos esquemas rigurosos para validar quién accede al sistema y qué puede hacer:
- **Contraseñas Seguras:** Las contraseñas de los usuarios no se almacenan en texto plano. Se procesan a través de algoritmos de hashing fuertes antes de ser guardadas, haciéndolas ilegibles incluso para nuestros administradores de base de datos.
- **Sesiones mediante Tokens (JWT):** Las sesiones de los usuarios se manejan utilizando *JSON Web Tokens* (JWT), con un esquema de refresco de tokens, lo que minimiza el impacto en caso de que una sesión quede expuesta en un dispositivo público.
- **Control de Acceso Basado en Roles (RBAC):** El sistema asigna niveles de acceso granulares. Un perfil de "Guarda de Seguridad" tiene una vista limitada orientada al control físico, mientras que un "Propietario" solo ve sus datos y un "Administrador" tiene privilegios de gestión de la comunidad.

## 3. Protección en Tránsito

Toda la comunicación entre su dispositivo (navegador o celular) y nuestros servidores se encuentra cifrada de extremo a extremo utilizando los protocolos modernos de encriptación (TLS/HTTPS). Esto evita que terceros puedan interceptar o leer información como contraseñas, chats o datos de residentes mientras viajan por internet.

## 4. Almacenamiento de Archivos y Documentos

Los documentos cargados en los módulos (como actas, comprobantes o anexos de PQRS) se almacenan utilizando servicios de almacenamiento en la nube (como Cloudflare R2 / Local Storage) que no son indexados por motores de búsqueda públicos y solo se exponen mediante la Plataforma.

## 5. Códigos QR y Control de Acceso

- Los códigos QR generados por la plataforma para autorizar visitas son **temporales y dinámicos**, contando con un tiempo de expiración programado (por defecto 12 horas).
- Un trabajo automatizado (cronjob) revoca los permisos y el estado del código cuando el tiempo culmina, evitando que sean reutilizados al día siguiente o distribuidos a terceros.

## 6. Disponibilidad y Backups

Aplicamos políticas de respaldo de la información (backups) de la base de datos transaccional, lo que nos permite asegurar la continuidad del negocio y la recuperación de desastres frente a eventualidades técnicas imprevistas.

## 7. Reporte de Vulnerabilidades

La seguridad es un proceso en constante evolución. Si usted es un investigador de seguridad, residente o administrador y cree haber encontrado una vulnerabilidad técnica en la plataforma Havita, le agradecemos reportarla de manera responsable.

Por favor, no publique los hallazgos de forma abierta ni escanee agresivamente nuestros entornos. Envíe los detalles de la vulnerabilidad a:
📧 **[EMAIL DE SEGURIDAD]**

Nuestro equipo de ingeniería evaluará el reporte e implementará las correcciones necesarias de forma prioritaria.

---

*Nota: Havita implementa medidas razonables de seguridad alineadas a estándares de la industria tecnológica. Sin embargo, ningún sistema de software conectado a internet está exento de riesgos, por lo cual alentamos a todos los usuarios a utilizar contraseñas fuertes y proteger sus dispositivos personales.*
