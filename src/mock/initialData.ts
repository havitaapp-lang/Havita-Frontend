import type { 
  Resident, PropertyUnit, Package, Visitor, 
  RequestPQRS, Reservation, Communication, CommunityDocument 
} from '../types';

export const initialProperties: PropertyUnit[] = [
  // Limonar (Sample units)
  { id: 'prop-101', tenantId: 'tenant-limonar', name: '101', path: 'Torre 1 -> 101', type: 'Apartamento', area: 85, status: 'OCCUPIED', residentName: 'Carlos Rodríguez' },
  { id: 'prop-102', tenantId: 'tenant-limonar', name: '102', path: 'Torre 1 -> 102', type: 'Apartamento', area: 92, status: 'OCCUPIED', residentName: 'Lucía Fernández' },
  { id: 'prop-201', tenantId: 'tenant-limonar', name: '201', path: 'Torre 1 -> 201', type: 'Apartamento', area: 85, status: 'VACANT' },
  { id: 'prop-202', tenantId: 'tenant-limonar', name: '202', path: 'Torre 1 -> 202', type: 'Apartamento', area: 92, status: 'OCCUPIED', residentName: 'Mateo Morales' },
  { id: 'prop-504', tenantId: 'tenant-limonar', name: '504', path: 'Torre 2 -> 504', type: 'Apartamento', area: 110, status: 'OCCUPIED', residentName: 'Sebastián Gómez' },
  { id: 'prop-505', tenantId: 'tenant-limonar', name: '505', path: 'Torre 2 -> 505', type: 'Apartamento', area: 95, status: 'OCCUPIED', residentName: 'Valentina Restrepo' },
  { id: 'prop-601', tenantId: 'tenant-limonar', name: '601', path: 'Torre 2 -> 601', type: 'Apartamento', area: 120, status: 'MAINTENANCE' },
  { id: 'prop-casa-1', tenantId: 'tenant-limonar', name: 'Casa 01', path: 'Manzana A -> Casa 01', type: 'Casa', area: 180, status: 'OCCUPIED', residentName: 'Andrés Pastrana' },
  { id: 'prop-casa-2', tenantId: 'tenant-limonar', name: 'Casa 02', path: 'Manzana A -> Casa 02', type: 'Casa', area: 180, status: 'OCCUPIED', residentName: 'Elena Martínez' }
];

export const initialResidents: Resident[] = [
  // ── Limonar Parque Residencial ──
  { id: 'res-1', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', name: 'Sebastián Gómez', type: 'Propietario', phone: '+57 311 456 7890', email: 'sebas@ejemplo.com', status: 'ACTIVE', registeredAt: '2025-01-15' },
  { id: 'res-2', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 101', name: 'Carlos Rodríguez', type: 'Propietario', phone: '+57 300 123 9988', email: 'carlos.rodriguez@email.com', status: 'ACTIVE', registeredAt: '2024-11-20' },
  { id: 'res-3', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 102', name: 'Lucía Fernández', type: 'Arrendatario', phone: '+57 315 789 1234', email: 'lucia.f@email.com', status: 'ACTIVE', registeredAt: '2025-02-01' },
  { id: 'res-4', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 202', name: 'Mateo Morales', type: 'Propietario', phone: '+57 318 654 3210', email: 'mateo.m@email.com', status: 'ACTIVE', registeredAt: '2024-08-10' },
  { id: 'res-5', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 505', name: 'Valentina Restrepo', type: 'Arrendatario', phone: '+57 320 987 6543', email: 'valen.restrepo@email.com', status: 'ACTIVE', registeredAt: '2025-03-05' },
  { id: 'res-6', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 01', name: 'Andrés Pastrana', type: 'Propietario', phone: '+57 310 111 2233', email: 'andres.p@email.com', status: 'ACTIVE', registeredAt: '2024-05-12' },
  { id: 'res-7', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 02', name: 'Elena Martínez', type: 'Propietario', phone: '+57 314 555 4433', email: 'elena.m@email.com', status: 'INACTIVE', registeredAt: '2024-03-10' },

  // ── Altos del Río Club Residencial ──
  { id: 'res-alt-1', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 101', name: 'Camilo Andrés Echeverry', type: 'Propietario', phone: '+57 312 345 6789', email: 'camilo.e@altosdelrio.co', status: 'ACTIVE', registeredAt: '2024-09-01' },
  { id: 'res-alt-2', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 102', name: 'Daniela Jaramillo', type: 'Arrendatario', phone: '+57 301 222 3344', email: 'daniela.j@altosdelrio.co', status: 'ACTIVE', registeredAt: '2025-01-10' },
  { id: 'res-alt-3', tenantId: 'tenant-altos-rio', propertyId: 'Torre 2 - 301', name: 'Santiago Peláez', type: 'Propietario', phone: '+57 316 444 5566', email: 'santiago.p@altosdelrio.co', status: 'ACTIVE', registeredAt: '2024-06-18' },
  { id: 'res-alt-4', tenantId: 'tenant-altos-rio', propertyId: 'Torre 3 - 402', name: 'Isabella Montoya', type: 'Propietario', phone: '+57 317 888 9900', email: 'isabella.m@altosdelrio.co', status: 'ACTIVE', registeredAt: '2024-10-05' },

  // ── Torres del Valle Club Residencial ──
  { id: 'res-tdv-1', tenantId: 'tenant-torres-valle', propertyId: 'Bloque A - 101', name: 'Nicolás Giraldo', type: 'Propietario', phone: '+57 315 111 4455', email: 'nicolas.g@torresvalle.com', status: 'ACTIVE', registeredAt: '2023-11-20' },
  { id: 'res-tdv-2', tenantId: 'tenant-torres-valle', propertyId: 'Bloque B - 202', name: 'Mariana Quintero', type: 'Arrendatario', phone: '+57 320 333 7788', email: 'mariana.q@torresvalle.com', status: 'ACTIVE', registeredAt: '2024-02-14' },
  { id: 'res-tdv-3', tenantId: 'tenant-torres-valle', propertyId: 'Bloque C - 303', name: 'Fernando Sanclemente', type: 'Propietario', phone: '+57 318 999 0011', email: 'fernando.s@torresvalle.com', status: 'ACTIVE', registeredAt: '2024-01-08' },

  // ── Reserva Campestre del Sur ──
  { id: 'res-rcs-1', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana A - Casa 1', name: 'Guillermo Ospina', type: 'Propietario', phone: '+57 310 777 8899', email: 'guillermo.o@reservacampestre.co', status: 'ACTIVE', registeredAt: '2024-04-01' },
  { id: 'res-rcs-2', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana B - Casa 4', name: 'Patricia Londoño', type: 'Propietario', phone: '+57 314 222 1133', email: 'patricia.l@reservacampestre.co', status: 'ACTIVE', registeredAt: '2024-07-22' }
];

export const initialPackages: Package[] = [
  // Limonar
  { id: 'pkg-1', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', recipientName: 'Sebastián Gómez', company: 'Mercado Libre', trackingNumber: 'ML-9823412', status: 'RECEIVED', receivedAt: 'Hoy, 10:30 AM', observations: 'Caja mediana de tecnología' },
  { id: 'pkg-2', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', recipientName: 'Sebastián Gómez', company: 'Amazon', trackingNumber: 'AMZ-551294', status: 'NOTIFIED', receivedAt: 'Hoy, 11:15 AM', observations: 'Sobre sellado' },
  { id: 'pkg-3', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 101', recipientName: 'Carlos Rodríguez', company: 'Servientrega', trackingNumber: 'SER-119284', status: 'RECEIVED', receivedAt: 'Hoy, 09:10 AM', observations: 'Documentos' },
  { id: 'pkg-4', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 102', recipientName: 'Lucía Fernández', company: 'Coordinadora', trackingNumber: 'COO-448192', status: 'DELIVERED', receivedAt: 'Ayer, 04:20 PM', deliveredAt: 'Ayer, 06:15 PM', observations: 'Entregado a la titular' },
  { id: 'pkg-5', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 505', recipientName: 'Valentina Restrepo', company: 'DHL', trackingNumber: 'DHL-881294', status: 'DELIVERED', receivedAt: 'Ayer, 02:00 PM', deliveredAt: 'Ayer, 07:00 PM', observations: 'Paquete de ropa' },
  { id: 'pkg-6', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 01', recipientName: 'Andrés Pastrana', company: 'Mercado Libre', trackingNumber: 'ML-7729104', status: 'RECEIVED', receivedAt: 'Hoy, 01:20 PM', observations: 'Herramientas' },

  // Altos del Río
  { id: 'pkg-alt-1', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 101', recipientName: 'Camilo Andrés Echeverry', company: 'Amazon', trackingNumber: 'AMZ-882194', status: 'RECEIVED', receivedAt: 'Hoy, 09:40 AM', observations: 'Caja pequeña de libros' },
  { id: 'pkg-alt-2', tenantId: 'tenant-altos-rio', propertyId: 'Torre 2 - 301', recipientName: 'Santiago Peláez', company: 'Mercado Libre', trackingNumber: 'ML-443918', status: 'NOTIFIED', receivedAt: 'Hoy, 11:00 AM', observations: 'Electrodoméstico cocina' },
  { id: 'pkg-alt-3', tenantId: 'tenant-altos-rio', propertyId: 'Torre 3 - 402', recipientName: 'Isabella Montoya', company: 'Coordinadora', trackingNumber: 'COO-991283', status: 'DELIVERED', receivedAt: 'Ayer, 03:15 PM', deliveredAt: 'Ayer, 05:30 PM', observations: 'Firma en tablet' },

  // Torres del Valle
  { id: 'pkg-tdv-1', tenantId: 'tenant-torres-valle', propertyId: 'Bloque A - 101', recipientName: 'Nicolás Giraldo', company: 'Servientrega', trackingNumber: 'SER-552918', status: 'RECEIVED', receivedAt: 'Hoy, 08:30 AM', observations: 'Sobre bancario' },
  { id: 'pkg-tdv-2', tenantId: 'tenant-torres-valle', propertyId: 'Bloque B - 202', recipientName: 'Mariana Quintero', company: 'Mercado Libre', trackingNumber: 'ML-119402', status: 'NOTIFIED', receivedAt: 'Hoy, 10:45 AM', observations: 'Artículos para el hogar' },

  // Reserva Campestre
  { id: 'pkg-rcs-1', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana A - Casa 1', recipientName: 'Guillermo Ospina', company: 'DHL', trackingNumber: 'DHL-338291', status: 'RECEIVED', receivedAt: 'Hoy, 10:15 AM', observations: 'Repuesto vehicular' }
];

export const initialVisitors: Visitor[] = [
  // Limonar
  { id: 'vis-1', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', name: 'Laura Camila Torres', documentId: '1098234122', status: 'APPROVED', expectedAt: 'Hoy, 03:00 PM', vehiclePlate: 'XYZ-123', qrCode: 'QR-VIS-504-1' },
  { id: 'vis-2', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 101', name: 'Carlos Rodríguez Jr.', documentId: '1020492811', status: 'ENTERED', expectedAt: 'Hoy, 10:00 AM', enteredAt: 'Hoy, 10:15 AM', vehiclePlate: 'ABC-789', qrCode: 'QR-VIS-101-1' },
  { id: 'vis-3', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 102', name: 'Técnico de Claro (Juan Pérez)', documentId: '80192834', status: 'EXITED', expectedAt: 'Hoy, 08:30 AM', enteredAt: 'Hoy, 08:45 AM', exitedAt: 'Hoy, 10:20 AM', observations: 'Instalación de fibra óptica' },
  { id: 'vis-4', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 505', name: 'Mariana Duarte', documentId: '52981023', status: 'PENDING', expectedAt: 'Mañana, 05:00 PM', observations: 'Cena familiar' },
  { id: 'vis-5', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 01', name: 'Jardinero (Pedro Silva)', documentId: '19482910', status: 'ENTERED', expectedAt: 'Hoy, 07:00 AM', enteredAt: 'Hoy, 07:15 AM', observations: 'Mantenimiento prado frontal' },

  // Altos del Río
  { id: 'vis-alt-1', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 101', name: 'Jorge Iván Restrepo', documentId: '98452103', status: 'APPROVED', expectedAt: 'Hoy, 04:00 PM', vehiclePlate: 'KLR-982', qrCode: 'QR-VIS-ALT-1' },
  { id: 'vis-alt-2', tenantId: 'tenant-altos-rio', propertyId: 'Torre 2 - 301', name: 'Dra. Sandra Milena Caicedo', documentId: '51982341', status: 'ENTERED', expectedAt: 'Hoy, 11:30 AM', enteredAt: 'Hoy, 11:40 AM', vehiclePlate: 'MNQ-456' },

  // Torres del Valle
  { id: 'vis-tdv-1', tenantId: 'tenant-torres-valle', propertyId: 'Bloque A - 101', name: 'Fabián Henao', documentId: '71928341', status: 'ENTERED', expectedAt: 'Hoy, 09:15 AM', enteredAt: 'Hoy, 09:20 AM', vehiclePlate: 'WXY-789' },

  // Reserva Campestre
  { id: 'vis-rcs-1', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana A - Casa 1', name: 'Veterinario Dr. Gómez', documentId: '16928472', status: 'APPROVED', expectedAt: 'Hoy, 02:30 PM', vehiclePlate: 'RST-112' }
];

export const initialPQRS: RequestPQRS[] = [
  // Limonar
  { id: 'pqrs-1', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', residentName: 'Sebastián Gómez', category: 'Plomería', title: 'Fuga de agua en pasillo piso 5', description: 'Se observa goteo constante cerca a la puerta del ducto de basuras.', priority: 'Alta', status: 'IN_PROGRESS', createdAt: '2026-03-12', updatedAt: '2026-03-13', responseNotes: 'Técnico revisando válvula general de piso.' },
  { id: 'pqrs-2', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 101', residentName: 'Carlos Rodríguez', category: 'Ascensor', title: 'Ruido extraño al frenar ascensor 1', description: 'El ascensor hace una vibración fuerte al llegar al piso 1.', priority: 'Crítica', status: 'NEW', createdAt: '2026-03-14', updatedAt: '2026-03-14' },
  { id: 'pqrs-3', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 202', residentName: 'Mateo Morales', category: 'Seguridad', title: 'Luz fundida en parqueadero sótano B', description: 'La bahía 45 está totalmente a oscuras desde anoche.', priority: 'Media', status: 'RESOLVED', createdAt: '2026-03-10', updatedAt: '2026-03-11', responseNotes: 'Bombillo LED reemplazado por conserje.' },
  { id: 'pqrs-4', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 02', residentName: 'Elena Martínez', category: 'Zonas comunes', title: 'Malla rota en cancha de microfútbol', description: 'La portería sur tiene la red suelta y el balón se sale.', priority: 'Baja', status: 'NEW', createdAt: '2026-03-13', updatedAt: '2026-03-13' },

  // Altos del Río
  { id: 'pqrs-alt-1', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 102', residentName: 'Daniela Jaramillo', category: 'Electricidad', title: 'Intermitencia eléctrica en citófono', description: 'El citófono no timbra cuando llaman de la portería principal.', priority: 'Media', status: 'IN_PROGRESS', createdAt: '2026-03-11', updatedAt: '2026-03-12', responseNotes: 'Cuadrilla de telecomunicaciones agendada para revisión.' },
  { id: 'pqrs-alt-2', tenantId: 'tenant-altos-rio', propertyId: 'Torre 3 - 402', residentName: 'Isabella Montoya', category: 'Zonas comunes', title: 'Filtro de piscina infantil requiere mantenimiento', description: 'El agua luce turbia en la zona de chapoteadero.', priority: 'Alta', status: 'NEW', createdAt: '2026-03-14', updatedAt: '2026-03-14' },

  // Torres del Valle
  { id: 'pqrs-tdv-1', tenantId: 'tenant-torres-valle', propertyId: 'Bloque B - 202', residentName: 'Mariana Quintero', category: 'Seguridad', title: 'Sensor de puerta peatonal no detecta tarjeta', description: 'La chapa magnética del Bloque B no abre con el tag.', priority: 'Alta', status: 'RESOLVED', createdAt: '2026-03-08', updatedAt: '2026-03-09', responseNotes: 'Sensor recalibrado y funcionando normalmente.' },

  // Reserva Campestre
  { id: 'pqrs-rcs-1', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana B - Casa 4', residentName: 'Patricia Londoño', category: 'Zonas comunes', title: 'Poda de ramas cerca al tendido de alumbrado', description: 'Un árbol frondoso está rozando la luminaria del sendero.', priority: 'Baja', status: 'NEW', createdAt: '2026-03-12', updatedAt: '2026-03-12' }
];

export const initialReservations: Reservation[] = [
  // Limonar
  { id: 'resv-1', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 504', residentName: 'Sebastián Gómez', zone: 'Zona BBQ', date: '2026-03-21', startTime: '12:00', endTime: '18:00', guestsCount: 15, status: 'Confirmada', observations: 'Almuerzo de cumpleaños' },
  { id: 'resv-2', tenantId: 'tenant-limonar', propertyId: 'Torre 1 - 101', residentName: 'Carlos Rodríguez', zone: 'Salón Social', date: '2026-03-28', startTime: '19:00', endTime: '23:30', guestsCount: 40, status: 'PENDING', observations: 'Reunión familiar' },
  { id: 'resv-3', tenantId: 'tenant-limonar', propertyId: 'Manzana A - Casa 01', residentName: 'Andrés Pastrana', zone: 'Cancha Múltiple', date: '2026-03-18', startTime: '08:00', endTime: '10:00', guestsCount: 10, status: 'Confirmada' },
  { id: 'resv-4', tenantId: 'tenant-limonar', propertyId: 'Torre 2 - 505', residentName: 'Valentina Restrepo', zone: 'Piscina', date: '2026-03-15', startTime: '10:00', endTime: '13:00', guestsCount: 4, status: 'Confirmada' },

  // Altos del Río
  { id: 'resv-alt-1', tenantId: 'tenant-altos-rio', propertyId: 'Torre 1 - 101', residentName: 'Camilo Andrés Echeverry', zone: 'Zona BBQ', date: '2026-03-22', startTime: '13:00', endTime: '19:00', guestsCount: 12, status: 'Confirmada', observations: 'Asado dominical' },
  { id: 'resv-alt-2', tenantId: 'tenant-altos-rio', propertyId: 'Torre 2 - 301', residentName: 'Santiago Peláez', zone: 'Salón Social', date: '2026-03-27', startTime: '18:00', endTime: '23:00', guestsCount: 30, status: 'PENDING' },

  // Torres del Valle
  { id: 'resv-tdv-1', tenantId: 'tenant-torres-valle', propertyId: 'Bloque C - 303', residentName: 'Fernando Sanclemente', zone: 'Cancha Múltiple', date: '2026-03-20', startTime: '16:00', endTime: '18:00', guestsCount: 8, status: 'Confirmada' },

  // Reserva Campestre
  { id: 'resv-rcs-1', tenantId: 'tenant-reserva-campestre', propertyId: 'Manzana A - Casa 1', residentName: 'Guillermo Ospina', zone: 'Salón Social', date: '2026-03-29', startTime: '14:00', endTime: '22:00', guestsCount: 25, status: 'Confirmada' }
];

export const initialCommunications: Communication[] = [
  // Limonar
  { id: 'com-1', tenantId: 'tenant-limonar', title: 'Lavado general de tanques de agua potable', content: 'Se informa a toda la comunidad que el próximo martes 24 de marzo se suspenderá el servicio de agua entre 8:00 AM y 4:00 PM por mantenimiento reglamentario.', authorName: 'Administración Limonar', audience: 'Todos', createdAt: '2026-03-14', status: 'PUBLISHED', category: 'MAINTENANCE' },
  { id: 'com-2', tenantId: 'tenant-limonar', title: 'Convocatoria a Asamblea General Ordinaria 2026', content: 'Invitamos a todos los propietarios a participar en la asamblea que se llevará a cabo el sábado 28 de marzo a las 9:00 AM en el salón social.', authorName: 'Consejo de Administración', audience: 'Propietarios', createdAt: '2026-03-10', status: 'PUBLISHED', category: 'Asamblea' },
  { id: 'com-3', tenantId: 'tenant-limonar', title: 'Recordatorio: Horario de zonas húmedas y mascotas', content: 'Recordamos mantener a las mascotas con collar en pasillos y zonas verdes comunes, así como recoger sus deposiciones.', authorName: 'Administración Limonar', audience: 'Todos', createdAt: '2026-03-05', status: 'PUBLISHED', category: 'General' },
  { id: 'com-4', tenantId: 'tenant-limonar', title: 'Jornada de fumigación en sótanos y shut de basuras', content: 'Borrador para aprobación de presupuesto con empresa de control de plagas.', authorName: 'Comité de Mantenimiento', audience: 'Personal', createdAt: '2026-03-13', status: 'DRAFT', category: 'MAINTENANCE' },

  // Altos del Río
  { id: 'com-alt-1', tenantId: 'tenant-altos-rio', title: 'Mantenimiento preventivo de ascensores torres 1 a 6', content: 'Los técnicos de Otis realizarán inspección periódica este jueves de 8:00 AM a 12:00 PM.', authorName: 'Administración Altos del Río', audience: 'Todos', createdAt: '2026-03-13', status: 'PUBLISHED', category: 'MAINTENANCE' },
  { id: 'com-alt-2', tenantId: 'tenant-altos-rio', title: 'Horarios especiales del gimnasio y zona húmeda', content: 'A partir de este lunes el gimnasio estará abierto desde las 5:30 AM de lunes a viernes.', authorName: 'Consejo de Administración', audience: 'Todos', createdAt: '2026-03-09', status: 'PUBLISHED', category: 'General' },

  // Torres del Valle
  { id: 'com-tdv-1', tenantId: 'tenant-torres-valle', title: 'Pintura y demarcación de zonas de parqueo', content: 'Iniciamos obras de señalización en la bahía de visitantes el próximo viernes.', authorName: 'Administración Torres del Valle', audience: 'Todos', createdAt: '2026-03-12', status: 'PUBLISHED', category: 'MAINTENANCE' },

  // Reserva Campestre
  { id: 'com-rcs-1', tenantId: 'tenant-reserva-campestre', title: 'Instalación de iluminación solar en senderos ecológicos', content: 'Se instalaron 24 luminarias solares LED autónomas a lo largo del sendero del bosque.', authorName: 'Comité Ambiental', audience: 'Todos', createdAt: '2026-03-11', status: 'PUBLISHED', category: 'General' }
];

export const initialDocuments: CommunityDocument[] = [
  // Limonar
  { id: 'doc-1', tenantId: 'tenant-limonar', title: 'Reglamento de Propiedad Horizontal Vigente', category: 'Reglamento', fileSize: '4.2 MB', uploadedAt: '2025-01-10', fileType: 'PDF', description: 'Normas y estatutos registrados en notaría', downloadsCount: 142 },
  { id: 'doc-2', tenantId: 'tenant-limonar', title: 'Acta de Asamblea General Ordinaria 2025', category: 'Acta', fileSize: '2.8 MB', uploadedAt: '2025-04-15', fileType: 'PDF', description: 'Decisiones aprobadas y presupuesto asignado', downloadsCount: 98 },
  { id: 'doc-3', tenantId: 'tenant-limonar', title: 'Estados Financieros y Balance General Q4', category: 'Estados Financieros', fileSize: '1.5 MB', uploadedAt: '2026-01-20', fileType: 'XLSX', description: 'Cierre fiscal y cuentas por cobrar', downloadsCount: 65 },
  { id: 'doc-4', tenantId: 'tenant-limonar', title: 'Manual de Convivencia y Uso de Zonas Comunes', category: 'Manual', fileSize: '850 KB', uploadedAt: '2025-06-12', fileType: 'PDF', description: 'Reglamento de piscina, BBQ y mascotas', downloadsCount: 215 },
  { id: 'doc-5', tenantId: 'tenant-limonar', title: 'Directorio de Proveedores y Emergencias 2026', category: 'Circular', fileSize: '320 KB', uploadedAt: '2026-02-01', fileType: 'PDF', description: 'Contactos de plomería, cerrajería y cuadrilla', downloadsCount: 84 },

  // Altos del Río
  { id: 'doc-alt-1', tenantId: 'tenant-altos-rio', title: 'Reglamento Interno Altos del Río Club', category: 'Reglamento', fileSize: '3.9 MB', uploadedAt: '2024-05-10', fileType: 'PDF', description: 'Reglamento de copropiedad registrado', downloadsCount: 110 },
  { id: 'doc-alt-2', tenantId: 'tenant-altos-rio', title: 'Presupuesto Aprobado 2026 y Cuotas de Administración', category: 'Estados Financieros', fileSize: '1.8 MB', uploadedAt: '2026-02-01', fileType: 'PDF', description: 'Desglose de expensas comunes', downloadsCount: 76 },

  // Torres del Valle
  { id: 'doc-tdv-1', tenantId: 'tenant-torres-valle', title: 'Manual de Convivencia Torres del Valle', category: 'Manual', fileSize: '1.1 MB', uploadedAt: '2024-02-15', fileType: 'PDF', description: 'Normas de uso de zonas sociales y parqueaderos', downloadsCount: 52 },

  // Reserva Campestre
  { id: 'doc-rcs-1', tenantId: 'tenant-reserva-campestre', title: 'Reglamento de Urbanismo y Zonas Verdes', category: 'Reglamento', fileSize: '2.4 MB', uploadedAt: '2024-06-01', fileType: 'PDF', description: 'Normas arquitectónicas y cuidado ambiental', downloadsCount: 38 }
];


