"""Datos de demostración: una pyme distribuidora de suministro industrial
con una cartera de clientes B2B realista (algunos pagan bien, otros son
morosos crónicos en distintas fases de retraso). Pensado para que una
demo comercial se vea real desde el primer minuto.

Uso:  python -m cobrofacil.seed_data
"""

from datetime import date, timedelta, datetime

from werkzeug.security import generate_password_hash

from .app import create_app
from .models import db, Empresa, Cliente, Factura, Gestion, Plantilla
from .messaging import PLANTILLAS_POR_DEFECTO, fase_para_dias_retraso

HOY = date.today()


def dias_atras(n):
    return HOY - timedelta(days=n)


CLIENTES_DEMO = [
    dict(
        nombre="Construcciones Hermanos Salado S.L.",
        cif="B08123456",
        email="administracion@hermanossalado.es",
        telefono="93 500 11 22",
        persona_contacto="Marta Salado",
        direccion="Polígono Can Roca, Nave 7, 08340 Vilassar de Mar (Barcelona)",
        facturas=[
            (110, 4200.00, "impagada"),
            (75, 3100.50, "impagada"),
            (40, 1890.00, "impagada"),
            (10, 2450.00, "impagada"),
        ],
    ),
    dict(
        nombre="Hostelería Costa Brava, S.L.",
        cif="B17654321",
        email="pagos@hosteleriacostabrava.com",
        telefono="972 30 45 10",
        persona_contacto="Jordi Puig",
        direccion="Av. de la Platja 22, 17300 Blanes (Girona)",
        facturas=[
            (25, 980.00, "impagada"),
            (5, 610.00, "impagada"),
            (95, 1200.00, "pagada_tarde", 20),
        ],
    ),
    dict(
        nombre="Talleres Mecánicos Ferrán, S.L.",
        cif="B25987654",
        email="ferran.talleres@gmail.com",
        telefono="973 20 15 30",
        persona_contacto="Ferran Vila",
        direccion="C/ Indústria 8, 25001 Lleida",
        facturas=[
            (-10, 540.00, "pendiente"),
            (60, 2100.00, "pagada_tarde", 15),
            (150, 1750.00, "pagada_tarde", 5),
        ],
    ),
    dict(
        nombre="Panadería Industrial Vall d'Aran",
        cif="B22334455",
        email="compras@panvallaran.com",
        telefono="973 64 22 11",
        persona_contacto="Nuria Boya",
        direccion="Ctra. Nacional 230, km 4, 25530 Vielha",
        facturas=[
            (-20, 320.00, "pendiente"),
            (30, 890.00, "impagada"),
        ],
    ),
    dict(
        nombre="Distribuciones Alimentarias Ebro, S.A.",
        cif="A44556677",
        email="finanzas@disebro.com",
        telefono="976 40 55 66",
        persona_contacto="Carlos Marín",
        direccion="Poligono Malpica, Calle F 12, 50016 Zaragoza",
        facturas=[
            (200, 6200.00, "pagada_tarde", 8),
            (170, 5400.00, "pagada_tarde", 3),
            (140, 4100.00, "pagada"),
            (-5, 3200.00, "pendiente"),
        ],
    ),
    dict(
        nombre="Reformas y Obras Levante, S.L.",
        cif="B33445566",
        email="oficina@reformaslevante.es",
        telefono="963 11 22 33",
        persona_contacto="Vicente Ferrer",
        direccion="Av. del Cid 145, 46017 Valencia",
        facturas=[
            (130, 8900.00, "impagada"),
            (70, 3300.00, "impagada"),
            (20, 1500.00, "impagada"),
        ],
    ),
    dict(
        nombre="Óptica y Salud Vision Plus",
        cif="B55667788",
        email="administracion@visionplus.es",
        telefono="954 22 11 00",
        persona_contacto="Elena Ríos",
        direccion="C/ Feria 33, 41003 Sevilla",
        facturas=[
            (-15, 275.00, "pendiente"),
            (45, 410.00, "pagada"),
            (10, 390.00, "pagada"),
        ],
    ),
    dict(
        nombre="Transportes Rápidos del Norte, S.L.",
        cif="B66778899",
        email="pagos@transportesnorte.com",
        telefono="985 30 40 50",
        persona_contacto="Pablo Menéndez",
        direccion="Poligono Industrial de Silvota, 33192 Llanera (Asturias)",
        facturas=[
            (65, 2750.00, "impagada"),
            (35, 1980.00, "impagada"),
            (5, 1200.00, "impagada"),
            (-25, 900.00, "pendiente"),
        ],
    ),
]

GESTIONES_DEMO = {
    "Construcciones Hermanos Salado S.L.": [
        (108, "llamada", "Hablado con Marta, dice que pagarán 'la semana que viene'."),
        (70, "email", "Enviado segundo aviso por email."),
        (35, "llamada", "No contesta al teléfono. Se deja mensaje."),
        (8, "carta", "Enviado requerimiento formal con cálculo de intereses."),
    ],
    "Reformas y Obras Levante, S.L.": [
        (125, "email", "Recordatorio enviado."),
        (60, "llamada", "Vicente promete pagar antes de fin de mes. No cumple."),
        (15, "carta", "Requerimiento formal enviado por email y correo postal."),
    ],
    "Transportes Rápidos del Norte, S.L.": [
        (60, "email", "Recordatorio automático enviado."),
        (30, "llamada", "Contable dice que hay un problema con el banco, reintentan."),
    ],
}


def seed():
    app = create_app()
    with app.app_context():
        if Cliente.query.count() > 0:
            print("Ya existen datos: no se vuelve a sembrar la demo.")
            return

        empresa = Empresa.query.first()
        empresa.nombre = "Suministros Industriales Cantábrico, S.L."
        empresa.cif = "B39112233"
        empresa.direccion = "Polígono Industrial Guarnizo, Nave 14, 39611 Guarnizo (Cantabria)"
        empresa.email_contacto = "administracion@sicantabrico.es"
        empresa.telefono = "942 55 66 77"
        empresa.iban = "ES91 2100 0418 4502 0005 1332"
        empresa.color_primario = "#0f4c5c"
        empresa.tipo_interes_anual = 12.5
        empresa.fecha_tipo_interes = "1er semestre 2025 (BCE + 8, verificar en boe.es)"
        empresa.indemnizacion_fija = 40.0
        empresa.plazo_pago_dias = 60
        empresa.limite_riesgo_cliente = 3000.0
        empresa.admin_password_hash = generate_password_hash("demo1234")
        db.session.commit()

        numero_seq = 1
        for c in CLIENTES_DEMO:
            cliente = Cliente(
                nombre=c["nombre"],
                cif=c["cif"],
                email=c["email"],
                telefono=c["telefono"],
                persona_contacto=c["persona_contacto"],
                direccion=c["direccion"],
            )
            db.session.add(cliente)
            db.session.flush()

            for entrada in c["facturas"]:
                dias_vto, importe_total, tipo = entrada[0], entrada[1], entrada[2]
                dias_pago_tarde = entrada[3] if len(entrada) > 3 else None

                fecha_vencimiento = dias_atras(dias_vto)
                fecha_emision = fecha_vencimiento - timedelta(days=30)
                base = round(importe_total / 1.21, 2)

                factura = Factura(
                    cliente_id=cliente.id,
                    numero=f"F-2025-{numero_seq:04d}",
                    fecha_emision=fecha_emision,
                    fecha_vencimiento=fecha_vencimiento,
                    base_imponible=base,
                    iva_pct=21.0,
                    importe_total=importe_total,
                )
                numero_seq += 1

                if tipo == "pendiente":
                    factura.estado = "pendiente"
                elif tipo == "impagada":
                    factura.estado = "pendiente"
                    factura.fase_actual = fase_para_dias_retraso(max(dias_vto, 1))
                elif tipo == "pagada":
                    factura.estado = "pagada"
                    factura.importe_pagado = importe_total
                    factura.fecha_pago = fecha_vencimiento - timedelta(days=2)
                elif tipo == "pagada_tarde":
                    factura.estado = "pagada"
                    factura.importe_pagado = importe_total
                    factura.fecha_pago = fecha_vencimiento + timedelta(
                        days=dias_pago_tarde or 10
                    )

                db.session.add(factura)
            db.session.flush()

        db.session.commit()

        # gestiones de ejemplo
        for nombre_cliente, gestiones in GESTIONES_DEMO.items():
            cliente = Cliente.query.filter_by(nombre=nombre_cliente).first()
            facturas_vencidas = [f for f in cliente.facturas if f.vencida]
            if not facturas_vencidas:
                continue
            factura_objetivo = max(facturas_vencidas, key=lambda f: f.dias_retraso)
            for dias_hace, tipo, descripcion in gestiones:
                g = Gestion(
                    factura_id=factura_objetivo.id,
                    tipo=tipo,
                    fase=fase_para_dias_retraso(max(factura_objetivo.dias_retraso - dias_hace, 1)),
                    descripcion=descripcion,
                    fecha=datetime.utcnow() - timedelta(days=dias_hace),
                )
                db.session.add(g)
        db.session.commit()

        print("Datos de demostración creados correctamente.")
        print(f"Clientes: {Cliente.query.count()} | Facturas: {Factura.query.count()}")
        print("Usuario de acceso -> contraseña: demo1234")


if __name__ == "__main__":
    seed()
