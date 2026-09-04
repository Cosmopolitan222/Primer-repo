# Calendarios

- **Implementado de verdad:** exportación `.ics` (`ics.ts`), usada por
  `/api/ics/[token]`. Funciona con Google Calendar, Outlook y Apple
  Calendar sin ninguna integración de pago ni credencial.
- **Pendiente para producción:** sincronización bidireccional (crear/mover
  citas automáticamente en el calendario del profesional). Requiere:
  1. Registrar una app OAuth en Google Cloud / Microsoft Entra.
  2. Guardar el refresh token del profesional de forma segura.
  3. Implementar un adaptador `CalendarProvider` análogo al de
     `src/lib/notifications`, con métodos `createEvent`, `updateEvent`,
     `deleteEvent`.

No se ha implementado en esta demo porque exige credenciales reales de un
proveedor OAuth, incompatible con el requisito de "sin servicios de pago"
y "totalmente funcional sin configuración".
