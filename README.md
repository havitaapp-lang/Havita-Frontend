# Havita SaaS — Frontend Commercial Platform

Plataforma SaaS moderna para digitalizar la operación, comunicación, seguridad y vida diaria de unidades residenciales, condominios y conjuntos cerrados en Colombia y Latinoamérica.

---

## 🏛️ Arquitectura & Principios de Diseño

El frontend está estructurado en una arquitectura modular por capas desacopladas, preparada para conectarse a un backend **Java 21 + Spring Boot + PostgreSQL**:

`
src/
├── api/                  # Capa de cliente HTTP desacoplada (apiClient.ts, DTOs, interceptors)
├── components/           # Componentes globales de diseño
│   ├── ui/               # Design System (Button, Skeleton, EmptyState, Breadcrumbs, FormField)
│   ├── CommandPalette.tsx # Buscador global modal (Ctrl+K / Cmd+K)
│   ├── TenantSwitcher.tsx # Selector rápido de copropiedades en vivo
│   ├── ErrorBoundary.tsx # Captura de fallos en renderizado con UI de recuperación
│   └── OfflineBanner.tsx # Indicador visual defensivo ante pérdida de conectividad
├── contexts/             # Estado de aplicación
│   ├── TenantContext.tsx # Contexto Multi-Tenant dinámico con sincronización de temas
│   ├── AuthContext.tsx   # Autenticación y RBAC (Admin, Portería, Residente)
│   └── DataContext.tsx   # Almacén reactivo de datos de negocio con persistencia
├── features/             # Módulos organizados por dominio / rol
│   ├── admin/            # Panel administrativo (10 módulos con CRUD completo)
│   ├── resident/         # Experiencia Mobile-First / PWA para residentes
│   ├── security/         # Terminal táctil optimizada para portería y tabletas
│   ├── auth/             # Login corporativo multi-rol y multi-tenant
│   └── public/           # Landing page SaaS comercial con diseño de alta fidelidad
├── mock/                 # Semillas de datos colombianos realistas (5 copropiedades)
├── services/             # Capa de servicios (residentService, notificationService)
├── utils/                # Sanitizadores, formateadores (COP, fechas es-CO), RBAC
└── validation/           # Validaciones Zero-Trust con esquemas Zod centralizados
`

---

## 🏢 Multi-Tenancy Dinámico

Havita incluye soporte multi-tenant real en el cliente:
- Inyección del header X-Tenant-ID en cada solicitud a través de piClient.
- Personalización en caliente de variables CSS de marca (--tenant-primary, --tenant-secondary).
- 5 Copropiedades colombianas mock configuradas:
  1. **Limonar Parque Residencial** (Cali) — 428 unidades
  2. **Altos del Río Condominio** (Medellín) — 312 unidades
  3. **Torres del Valle Central** (Bogotá D.C.) — 520 unidades
  4. **Reserva Campestre del Sur** (Bucaramanga) — 198 unidades
  5. **Parque Residencial La Arboleda** (Barranquilla) — 264 unidades

---

## 🛡️ Principios Zero-Trust & Robustez

- **Validación con Zod**: Cada formulario valida longitud máxima, formatos de correo, teléfonos de Colombia (+57 3XX), números de documento y cadenas seguras.
- **Doble clic prevenido**: Botones con estado de isSubmitting y deshabilitación durante peticiones activas.
- **Feedback Estilizado**: Integración con **SweetAlert2** con tema corporativo para confirmaciones críticas y toasts sutiles.
- **Buscador Universal**: Acceso rápido con teclado mediante Ctrl+K o Cmd+K.

---

## 🚀 Puesta en Marcha

### Requisitos Previos
- Node.js 18+ o superior
- npm 9+ o superior

### Instalación
`ash
npm install
`

### Ejecutar Servidor de Desarrollo
`ash
npm run dev
`
Acceso local en: http://localhost:5173/

### Cuentas de Acceso Rápido (Demo)
- **Administrador**: dmin@limonar.com (Redirige a /admin)
- **Portería / Seguridad**: porteria@limonar.com (Redirige a /security)
- **Residente**: esidente@limonar.com (Redirige a /resident)

### Compilación para Producción
`ash
npm run build
`

---

## 🔌 Guía de Integración con Spring Boot

Para sustituir los servicios mock por el backend Spring Boot:
1. Configurar la variable de entorno en .env.production:
   `nv
   VITE_API_BASE_URL=https://api.havita.co/api/v1
   `
2. En src/services/residentService.ts (y los servicios respectivos), cambiar el flag de desarrollo:
   `	s
   const USE_MOCK = false;
   `
3. El cliente src/api/apiClient.ts propagará de forma automática el Bearer JWT Token y la cabecera X-Tenant-ID.
