from datetime import date, datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Empresa(db.Model):
    """Datos del despacho/pyme que usa la herramienta (configuración white-label)."""

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False, default="Mi Empresa S.L.")
    cif = db.Column(db.String(20), default="")
    direccion = db.Column(db.String(300), default="")
    email_contacto = db.Column(db.String(120), default="")
    telefono = db.Column(db.String(30), default="")
    iban = db.Column(db.String(40), default="")
    logo_filename = db.Column(db.String(200), default="")
    color_primario = db.Column(db.String(10), default="#0f4c5c")

    # Motor legal de intereses de demora (Ley 3/2004 de lucha contra la morosidad)
    tipo_interes_anual = db.Column(db.Float, default=12.0)  # % anual, editable según BOE
    fecha_tipo_interes = db.Column(db.String(20), default="")  # referencia informativa
    indemnizacion_fija = db.Column(db.Float, default=40.0)  # art. 8 Ley 3/2004
    plazo_pago_dias = db.Column(db.Integer, default=60)  # plazo legal máximo B2B
    limite_riesgo_cliente = db.Column(db.Float, default=3000.0)  # para scoring

    admin_password_hash = db.Column(db.String(300), default="")

    plantillas = db.relationship("Plantilla", backref="empresa", lazy=True)


class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    cif = db.Column(db.String(20), default="")
    email = db.Column(db.String(120), default="")
    telefono = db.Column(db.String(30), default="")
    direccion = db.Column(db.String(300), default="")
    persona_contacto = db.Column(db.String(120), default="")
    notas = db.Column(db.Text, default="")
    creado = db.Column(db.DateTime, default=datetime.utcnow)

    facturas = db.relationship(
        "Factura", backref="cliente", lazy=True, cascade="all, delete-orphan"
    )


class Factura(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("cliente.id"), nullable=False)
    numero = db.Column(db.String(60), nullable=False)
    fecha_emision = db.Column(db.Date, nullable=False, default=date.today)
    fecha_vencimiento = db.Column(db.Date, nullable=False)
    base_imponible = db.Column(db.Float, nullable=False, default=0.0)
    iva_pct = db.Column(db.Float, nullable=False, default=21.0)
    importe_total = db.Column(db.Float, nullable=False, default=0.0)
    importe_pagado = db.Column(db.Float, nullable=False, default=0.0)
    estado = db.Column(db.String(20), nullable=False, default="pendiente")
    # pendiente | parcial | pagada | incobrable
    fecha_pago = db.Column(db.Date, nullable=True)
    fase_actual = db.Column(db.Integer, default=0)  # 0=al día, 1..4 escalado
    creado = db.Column(db.DateTime, default=datetime.utcnow)

    gestiones = db.relationship(
        "Gestion", backref="factura", lazy=True, cascade="all, delete-orphan",
        order_by="desc(Gestion.fecha)",
    )

    @property
    def pendiente(self):
        return round(max(self.importe_total - self.importe_pagado, 0.0), 2)

    @property
    def dias_retraso(self):
        if self.estado == "pagada":
            if self.fecha_pago and self.fecha_pago > self.fecha_vencimiento:
                return (self.fecha_pago - self.fecha_vencimiento).days
            return 0
        hoy = date.today()
        return max((hoy - self.fecha_vencimiento).days, 0)

    @property
    def vencida(self):
        return self.estado in ("pendiente", "parcial") and self.dias_retraso > 0


class Gestion(db.Model):
    """Registro de una acción de cobro: llamada, email, carta, nota, promesa de pago."""

    id = db.Column(db.Integer, primary_key=True)
    factura_id = db.Column(db.Integer, db.ForeignKey("factura.id"), nullable=False)
    tipo = db.Column(db.String(30), nullable=False)  # llamada|email|carta|nota|promesa
    fase = db.Column(db.Integer, default=0)
    descripcion = db.Column(db.Text, default="")
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_promesa_pago = db.Column(db.Date, nullable=True)


class Plantilla(db.Model):
    """Plantillas de texto editables para cada fase de reclamación."""

    id = db.Column(db.Integer, primary_key=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey("empresa.id"), nullable=False)
    fase = db.Column(db.Integer, nullable=False)  # 1,2,3,4
    asunto = db.Column(db.String(200), nullable=False)
    cuerpo = db.Column(db.Text, nullable=False)
