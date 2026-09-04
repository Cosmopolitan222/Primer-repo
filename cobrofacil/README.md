# CobroFácil

**Software de recobro de impagados y gestión de morosidad para pymes españolas.**

> "Convierte facturas impagadas en dinero cobrado, con la ley de tu parte."

## Instalación y arranque (local, sin APIs de pago)

Requiere Python 3.10+. No necesita ninguna API externa ni clave de pago: todo
funciona en local con una base de datos SQLite.

```bash
cd Primer-repo
pip install -r cobrofacil/requirements.txt

# Cargar datos de demostración (una pyme ficticia con 8 clientes y 26 facturas)
python -m cobrofacil.seed_data

# Arrancar el servidor
python -m cobrofacil.run
```

Abrir `http://localhost:5000`. Contraseña de la demo: **demo1234**
(cambiarla en Configuración antes de entregar al cliente real).

Para empezar con una empresa real desde cero (sin datos de demo), basta con
arrancar sin ejecutar `seed_data`: la app crea automáticamente una empresa
vacía con contraseña `demo1234` la primera vez.

## Qué hace la aplicación

1. **Gestión de clientes y facturas**, con alta manual o **importación masiva
   por CSV** (plantilla descargable desde la propia app).
2. **Motor legal de intereses de demora** (Ley 3/2004 de lucha contra la
   morosidad): calcula automáticamente, para cada factura vencida, el interés
   de demora proporcional a los días de retraso más la indemnización fija de
   40 € por factura (art. 8), mostrando el **total realmente reclamable** —
   dinero que la mayoría de pymes ni siquiera sabe que puede pedir.
3. **Reclamación escalonada automática en 4 fases**: recordatorio amistoso →
   segundo aviso → requerimiento formal con cálculo legal → aviso previo a
   acciones legales. Los textos son plantillas editables con marcadores que
   se rellenan solos (importe, días de retraso, intereses, datos del
   cliente...). Se pueden copiar, enviar por email o marcar como enviadas.
4. **Scoring de riesgo por cliente** (0-100, con el desglose visible: %
   facturas vencidas, retraso histórico medio, importe en riesgo) para
   decidir a quién seguir fiando y a quién exigir pago por adelantado.
5. **Panel de control operativo** (no decorativo): dinero vencido, intereses
   reclamables, antigüedad de la deuda por tramos, top clientes morosos y,
   lo más importante, una **lista de "acciones de cobro para hoy"** —
   convierte el cobro en una tarea diaria con lista de tareas, no en un
   informe que nadie mira.
6. **Registro de gestiones** (llamadas, emails, cartas, promesas de pago) por
   factura, con historial completo.
7. **Expediente de reclamación en PDF**, listo para entregar a un abogado o
   gestoría, o para adjuntar a una demanda de procedimiento monitorio: reúne
   la deuda, el cálculo de intereses y el historial de gestiones de un
   cliente en un solo documento.
8. **Configuración white-label por cliente**: nombre, CIF, logo, color
   corporativo y parámetros legales (tipo de interés, indemnización, plazo de
   pago) editables desde la propia interfaz — sin tocar código.

## Estructura del proyecto

```
cobrofacil/
  app.py            App Flask y todas las rutas
  models.py         Modelo de datos (SQLAlchemy)
  interest.py       Motor de cálculo de intereses de demora (Ley 3/2004)
  scoring.py        Scoring de riesgo de morosidad por cliente
  messaging.py      Motor de reclamación escalonada (4 fases) y plantillas
  pdf_export.py     Generación del expediente de reclamación en PDF
  seed_data.py       Datos de demostración realistas
  templates/         Vistas Jinja2
  static/            CSS y logos subidos
```

## Notas importantes antes de vender/desplegar

- El **tipo de interés de demora legal** (BCE + 8 puntos) cambia cada
  semestre por resolución del Banco de España. La app lo trae como valor
  editable en Configuración con un enlace a boe.es — **verificar el tipo
  vigente antes de reclamar formalmente a un cliente real**.
- El envío de emails en esta versión es manual (copiar texto / abrir en el
  cliente de correo del usuario) para no depender de ninguna API de pago en
  la demo. Para producción es trivial añadir envío por SMTP con la propia
  cuenta de correo de la pyme (Gmail, Outlook...), sin coste adicional.
- Cambiar `SECRET_KEY` y la contraseña de acceso antes de cualquier
  despliegue con datos reales, y servir con un WSGI de producción
  (gunicorn/waitress) en lugar del servidor de desarrollo de Flask.
