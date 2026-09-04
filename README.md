# CobroFácil — recobro de impagados para pymes españolas

Solución B2B completa y funcional, lista para demostrar y vender.
Código de la aplicación en [`cobrofacil/`](cobrofacil/) (instrucciones de
instalación y detalle técnico en [`cobrofacil/README.md`](cobrofacil/README.md)).

Arranque rápido:

```bash
pip install -r cobrofacil/requirements.txt
python -m cobrofacil.seed_data   # datos de demo
python -m cobrofacil.run         # http://localhost:5000  (demo1234)
```

---

## El problema

Los impagos son el problema operativo más costoso y silencioso de la pyme
española. Según los informes anuales de morosidad (CEPYME, Crédito y
Caución), el periodo medio de pago entre empresas en España ronda los
80-90 días, muy por encima de los 60 días que marca la ley. Para una pyme
esto significa:

- **Problemas de tesorería reales**: dinero que ya es suyo (facturado,
  entregado, trabajado) pero que no pueden usar para pagar nóminas,
  proveedores o impuestos.
- **Tiempo del dueño o del administrativo perdido** llamando y escribiendo
  a mano a los mismos clientes, sin un proceso sistemático ni un registro
  de qué se dijo y cuándo.
- **Dinero que dejan sobre la mesa por desconocimiento**: la Ley 3/2004
  les permite reclamar intereses de demora + 40 € por factura impagada,
  pero casi ninguna pyme lo calcula ni lo reclama porque es tedioso hacerlo
  a mano.
- **Decisiones de riesgo a ciegas**: siguen fiando a clientes crónicamente
  morosos porque nadie lleva un histórico objetivo de quién paga tarde y
  cuánto.

No es un problema de "falta de CRM". Es un problema de **proceso de cobro
inexistente o manual**, con una pérdida económica directa y medible.

## La solución

CobroFácil no es un CRM genérico ni un dashboard decorativo: es una
herramienta de **una sola tarea, hecha muy bien** — convertir facturas
vencidas en dinero cobrado, lo antes posible y con el mínimo esfuerzo:

- Centraliza clientes y facturas (import CSV en minutos desde su programa
  actual de facturación).
- Cada mañana, la pantalla principal dice **a quién llamar hoy y por
  cuánto**, ordenado por importe — convierte el cobro en una rutina, no en
  una tarea que se posterga.
- Calcula solo, sin que nadie tenga que saber la ley, **cuánto dinero
  extra pueden reclamar legalmente** por los intereses de demora.
- Genera la carta de reclamación adecuada según cuánto retraso lleva cada
  factura, con un clic, ya redactada y con las cifras correctas.
- Si un cliente no paga ni así, genera el **expediente en PDF** listo para
  llevárselo a un abogado o a un procedimiento monitorio.

Resultado económico fácil de entender para el dueño de la pyme: **"esto te
ayuda a cobrar antes lo que ya es tuyo, y a reclamar intereses que hoy
estás regalando"**.

## A quién vendérselo

Pymes españolas con:

- Facturación B2B recurrente a otras empresas (no venta a particulares al
  contado).
- Entre 15 y 300 clientes activos, y una cartera de facturas pendientes
  que se gestiona hoy en Excel, papel o de memoria.
- Al menos algunos clientes "crónicamente tarde" — casi todas la tienen.

Sectores con mayor dolor y mejor encaje inmediato:

- **Construcción y reformas** (impagos endémicos, importes altos).
- **Distribución y suministros industriales/alimentarios**.
- **Transporte y logística** (clientes finales grandes, pagos lentos).
- **Servicios profesionales B2B** (agencias, consultoras, talleres).

Interlocutor de venta: el gerente/dueño de la pyme, o el responsable de
administración/finanzas si la empresa tiene 10+ empleados.

## Cómo presentarlo comercialmente

1. **Abrir con el dolor, no con el producto**: "¿Cuánto dinero tienes hoy
   en facturas vencidas que nadie está reclamando activamente?" — la
   mayoría no lo sabe con precisión; ya ahí se justifica la herramienta.
2. **Demo en vivo con sus propios números si es posible**: importar un CSV
   real (o aproximado) de sus facturas pendientes en la reunión y enseñar
   el panel ya con SU deuda vencida y SUS intereses reclamables. El
   impacto es inmediato porque el ahorro/recuperación se ve en euros
   reales, no en una demo genérica.
3. **El argumento ganador es el de los intereses de demora**: enseñar que
   la ley ya les da ese dinero y que hoy lo están perdiendo por no
   reclamarlo. Es un beneficio que no depende de que el cliente moroso
   "decida pagar antes" — es simplemente dinero que dejan de regalar.
4. **Cerrar con la lista de "acciones de hoy"**: mostrar que en 5 minutos
   al día tienen priorizada la gestión de cobro, en vez de perder una
   tarde entera repasando Excel una vez al mes.
5. **Objeción típica ("ya tengo un Excel")**: responder que Excel no
   calcula intereses legales, no genera cartas, no prioriza por riesgo ni
   deja rastro de qué se ha reclamado y cuándo — y que la migración desde
   su Excel a la herramienta se hace en la misma reunión con el
   importador CSV.

### Modelo de precio sugerido

Software instalado/desplegado por cliente (una instancia por pyme, con su
logo y datos), cuota mensual fija tipo SaaS artesanal:
**49-99 €/mes** según volumen de clientes, sin permanencia. Se justifica
solo con recuperar o adelantar el cobro de una única factura media.
