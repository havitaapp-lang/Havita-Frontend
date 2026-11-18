# Protocolos y Prácticas de Seguridad en Havita

**Versión:** 1.0  
**Fecha de entrada en vigencia:** 05 de Noviembre de 2026  
**Operador:** Persona Natural identificada con NIT / C.C. 1005871910 — Havita  
**Contacto de seguridad:** seguridad@havita.com.co  

En **Havita**, la protección y confidencialidad de la información de las copropiedades, administraciones, residentes y visitantes es un pilar fundamental. Nuestra plataforma ha sido diseñada bajo el principio de **seguridad y privacidad desde el diseño y por defecto**.

El presente documento describe públicamente los controles técnicos, arquitectónicos y organizativos implementados para salvaguardar la confidencialidad, integridad y disponibilidad de los datos.

---

## 1. Arquitectura de Aislamiento Lógico (Multi-Tenancy)

Havita opera bajo un modelo de software multi-inquilino (*Multi-Tenant*) con barreras estrictas de segregación:

*   **Identificador Obligatorio de Copropiedad:** Todo registro transaccional y consulta en base de datos está obligatoriamente vinculado a un identificador único de copropiedad (`tenant_id`).
*   **Aislamiento Lógico:** Los datos de cada conjunto residencial están lógicamente aislados a nivel de aplicación y persistencia. Un residente, vigilante o administrador de una copropiedad no tiene capacidad técnica de consultar, visualizar ni modificar información perteneciente a otra copropiedad.
*   **Validación Criptográfica y de Ámbito:** Los componentes de seguridad (`AuthorizationResolver`, `AccessValidator`) verifican en cada petición HTTP que el usuario posea una membresía activa y legítima en la copropiedad consultada.

---

## 2. Autenticación, Sesiones y Control de Acceso (RBAC)

Implementamos esquemas rigurosos para validar la identidad de los usuarios y restringir privilegios:

*   **Contraseñas Seguras y Hashing Fuerte:** Las contraseñas de los usuarios nunca se almacenan en texto plano. Se procesan mediante el algoritmo criptográfico estándar de la industria **BCrypt**, haciéndolas irreversibles e ilegibles incluso para los administradores del sistema.
*   **Tokens Criptográficos de Sesión (JWT):** Las sesiones se gestionan mediante *JSON Web Tokens* (JWT) firmados digitalmente, complementados con un esquema de tokens de refresco (*Refresh Tokens*) que permite la revocación inmediata de sesiones activas en caso de cierre de sesión o cambio de credenciales.
*   **Control de Acceso Basado en Roles (RBAC):** Se aplican niveles de acceso granulares según el perfil asignado (`SUPER_ADMIN`, `COMMUNITY_ADMIN`, `SECURITY`, `STAFF`, `RESIDENT`). Por ejemplo, el personal de portería cuenta con vistas operativas circunscritas al control de acceso y paquetería, sin acceso a información privada no requerida para su función.

---

## 3. Seguridad en Tránsito y Protección de Red

*   **Cifrado TLS/HTTPS:** Toda la comunicación entre los dispositivos de los usuarios (navegadores web o teléfonos móviles) y los servidores de Havita viaja cifrada mediante protocolos criptográficos modernos (TLS 1.2 / TLS 1.3 y HTTPS), protegiendo la información frente a interceptaciones de terceros.
*   **Protección Perimetral y Mitigación DDoS:** La plataforma cuenta con capas de protección perimetral mediante redes de distribución de contenido (CDN) que mitigan ataques de denegación de servicio (DDoS) y filtran tráfico malicioso.

---

## 4. Almacenamiento y Protección de Archivos Adjuntos

*   **Estructura de Almacenamiento Aislada:** Los documentos cargados en la plataforma (comprobantes de reserva, anexos de PQRS, actas o imágenes de publicaciones) se almacenan en rutas estructuradas y aisladas por copropiedad (`/tenants/{tenantId}/...`).
*   **Protección contra Path Traversal:** El servicio de almacenamiento sanea de forma estricta los nombres de archivo y las rutas relativas para prevenir ataques de escape de directorio o acceso no autorizado a archivos del servidor.
*   **No Indexación Pública:** Los archivos privados de la comunidad no son indexados por motores de búsqueda públicos y su descarga requiere la validación de acceso correspondiente a través de la plataforma.

---

## 5. Códigos QR y Control de Acceso Físico

*   **Códigos QR Temporales y Dinámicos:** Los códigos QR emitidos para autorizar el ingreso de visitantes tienen una ventana de validez programada y una expiración por defecto de 12 horas.
*   **Revocación Automatizada:** Un proceso programado en segundo plano (*cronjob*) evalúa periódicamente las visitas pendientes y expira automáticamente los pases cuya vigencia haya culminado, impidiendo su reutilización o redistribución posterior.
*   **Pases Públicos de Consulta:** La visualización del pase para el visitante opera mediante tokens únicos ofuscados que exponen únicamente los datos indispensables para la validación en portería.

---

## 6. Citofonía Digital en Tiempo Real

*   **Comunicaciones Directas sin Grabación:** La citofonía digital opera mediante transmisiones de audio en tiempo real apoyadas en tecnología WebRTC. Havita **no graba, no procesa ni almacena** los archivos de audio de las conversaciones.
*   **Trazabilidad de Metadatos:** Únicamente se conservan registros técnicos no sonoros de la llamada (identificador, hora de timbrado, respuesta, duración y unidades involucradas) para fines de auditoría y seguridad de la portería.

---

## 7. Disponibilidad, Respaldos y Auditoría

*   **Respaldos Periódicos:** Se ejecutan políticas de copia de seguridad (*backups*) de las bases de datos transaccionales para asegurar la resiliencia operativa y la recuperación ante desastres.
*   **Auditoría de Eventos Críticos:** El sistema registra bitácoras de auditoría sobre eventos administrativos clave (creación de usuarios, cambios de membresía, asignación de inmuebles y configuraciones comunitarias) para garantizar la rendición de cuentas.

---

## 8. Reporte y Divulgación Responsable de Vulnerabilidades

La seguridad de la información es un proceso de mejora continua. Si usted es un investigador de seguridad, usuario o administrador y considera haber detectado una vulnerabilidad técnica en Havita, le invitamos a comunicarla de forma responsable:

*   Por favor, no divulgue públicamente la vulnerabilidad ni ejecute escaneos destructivos contra la infraestructura.
*   Envíe los detalles técnicos del hallazgo a:  
    📧 **seguridad@havita.com.co**
*   Nuestro equipo técnico acusará recibo, evaluará la severidad del reporte e implementará las mitigaciones pertinentes con la máxima prioridad.

---

*Nota: Havita implementa medidas razonables y proporcionales conforme a los estándares de la industria del software. No obstante, ningún sistema conectado a internet es absolutamente infalible. Recomendamos a todos los usuarios mantener contraseñas robustas y proteger sus dispositivos personales.*
