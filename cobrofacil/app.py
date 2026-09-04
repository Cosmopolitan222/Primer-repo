import csv
import io
import os
from datetime import date, datetime, timedelta

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    send_file,
    abort,
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from .models import db, Empresa, Cliente, Factura, Gestion, Plantilla
from .interest import calcular_intereses
from .scoring import calcular_riesgo_cliente
from .messaging import (
    FASES,
    fase_para_dias_retraso,
    PLANTILLAS_POR_DEFECTO,
    generar_mensaje,
    construir_contexto,
)
from .pdf_export import generar_expediente_cliente

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "img", "uploads")


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "cobrofacil-demo-secret-key")
    os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
        BASE_DIR, "instance", "cobrofacil.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    db.init_app(app)

    with app.app_context():
        db.create_all()
        _ensure_empresa()

    register_routes(app)
    return app


def _ensure_empresa():
    empresa = Empresa.query.first()
    if empresa is None:
        empresa = Empresa(
            nombre="Mi Empresa S.L.",
            admin_password_hash=generate_password_hash("demo1234"),
        )
        db.session.add(empresa)
        db.session.commit()
        for fase, datos in PLANTILLAS_POR_DEFECTO.items():
            db.session.add(
                Plantilla(
                    empresa_id=empresa.id,
                    fase=fase,
                    asunto=datos["asunto"],
                    cuerpo=datos["cuerpo"],
                )
            )
        db.session.commit()
    return empresa


def get_empresa():
    return Empresa.query.first()


def get_plantilla(empresa_id, fase):
    p = Plantilla.query.filter_by(empresa_id=empresa_id, fase=fase).first()
    if p:
        return p
    defecto = PLANTILLAS_POR_DEFECTO[fase]
    return type("P", (), {"asunto": defecto["asunto"], "cuerpo": defecto["cuerpo"]})()


def money(v):
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def register_routes(app):
    app.jinja_env.filters["money"] = money

    @app.context_processor
    def inject_globals():
        return {"empresa": get_empresa(), "fases_nombres": FASES}

    # ---------------- Auth ----------------
    @app.before_request
    def require_login():
        endpoint = request.endpoint or ""
        publicos = {"login", "static"}
        if endpoint in publicos:
            return None
        if not session.get("autenticado"):
            return redirect(url_for("login"))

    @app.route("/login", methods=["GET", "POST"])
    def login():
        empresa = get_empresa()
        if request.method == "POST":
            password = request.form.get("password", "")
            if empresa and check_password_hash(empresa.admin_password_hash, password):
                session["autenticado"] = True
                return redirect(url_for("dashboard"))
            flash("Contraseña incorrecta.", "error")
        return render_template("login.html")

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    # ---------------- Dashboard ----------------
    @app.route("/")
    def dashboard():
        empresa = get_empresa()
        facturas = Factura.query.all()
        pendientes = [f for f in facturas if f.estado in ("pendiente", "parcial")]
        vencidas = [f for f in pendientes if f.vencida]
        al_dia = [f for f in pendientes if not f.vencida]

        total_pendiente = sum(f.pendiente for f in pendientes)
        total_vencido = sum(f.pendiente for f in vencidas)
        total_al_dia = sum(f.pendiente for f in al_dia)

        total_intereses_reclamables = 0.0
        for f in vencidas:
            calc = calcular_intereses(
                f.pendiente, f.dias_retraso, empresa.tipo_interes_anual, empresa.indemnizacion_fija
            )
            total_intereses_reclamables += calc.interes_demora + calc.indemnizacion_fija

        buckets = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0}
        for f in vencidas:
            d = f.dias_retraso
            if d <= 30:
                buckets["0-30"] += f.pendiente
            elif d <= 60:
                buckets["31-60"] += f.pendiente
            elif d <= 90:
                buckets["61-90"] += f.pendiente
            else:
                buckets["90+"] += f.pendiente
        max_bucket = max(buckets.values()) if buckets.values() else 0

        # cobro este mes vs mes anterior
        hoy = date.today()
        inicio_mes = hoy.replace(day=1)
        mes_pasado_fin = inicio_mes - timedelta(days=1)
        mes_pasado_inicio = mes_pasado_fin.replace(day=1)
        cobrado_mes_actual = sum(
            f.importe_pagado
            for f in facturas
            if f.fecha_pago and f.fecha_pago >= inicio_mes
        )
        cobrado_mes_anterior = sum(
            f.importe_pagado
            for f in facturas
            if f.fecha_pago and mes_pasado_inicio <= f.fecha_pago <= mes_pasado_fin
        )

        # clientes con mayor deuda vencida
        deuda_por_cliente = {}
        for f in vencidas:
            deuda_por_cliente.setdefault(f.cliente, 0.0)
            deuda_por_cliente[f.cliente] += f.pendiente
        top_morosos = sorted(deuda_por_cliente.items(), key=lambda x: -x[1])[:5]

        # acciones para hoy: facturas vencidas sin gestión en los últimos 5 días
        acciones_hoy = []
        for f in vencidas:
            ultima_gestion = f.gestiones[0] if f.gestiones else None
            necesita_accion = (
                ultima_gestion is None
                or (datetime.utcnow() - ultima_gestion.fecha).days >= 5
            )
            if necesita_accion:
                fase_sugerida = fase_para_dias_retraso(f.dias_retraso)
                acciones_hoy.append((f, fase_sugerida))
        acciones_hoy.sort(key=lambda t: -t[0].pendiente)

        return render_template(
            "dashboard.html",
            total_pendiente=total_pendiente,
            total_vencido=total_vencido,
            total_al_dia=total_al_dia,
            total_intereses_reclamables=total_intereses_reclamables,
            n_vencidas=len(vencidas),
            n_pendientes=len(pendientes),
            buckets=buckets,
            max_bucket=max_bucket or 1,
            cobrado_mes_actual=cobrado_mes_actual,
            cobrado_mes_anterior=cobrado_mes_anterior,
            top_morosos=top_morosos,
            acciones_hoy=acciones_hoy[:8],
            total_acciones=len(acciones_hoy),
        )

    # ---------------- Clientes ----------------
    @app.route("/clientes")
    def clientes():
        empresa = get_empresa()
        q = request.args.get("q", "").strip()
        query = Cliente.query
        if q:
            query = query.filter(Cliente.nombre.ilike(f"%{q}%"))
        lista = query.order_by(Cliente.nombre).all()
        datos = []
        for c in lista:
            riesgo = calcular_riesgo_cliente(c.facturas, empresa.limite_riesgo_cliente)
            deuda_vencida = sum(f.pendiente for f in c.facturas if f.vencida)
            datos.append((c, riesgo, deuda_vencida))
        datos.sort(key=lambda t: -t[1].score)
        return render_template("clientes.html", datos=datos, q=q)

    @app.route("/clientes/nuevo", methods=["GET", "POST"])
    def cliente_nuevo():
        if request.method == "POST":
            c = Cliente(
                nombre=request.form["nombre"].strip(),
                cif=request.form.get("cif", "").strip(),
                email=request.form.get("email", "").strip(),
                telefono=request.form.get("telefono", "").strip(),
                direccion=request.form.get("direccion", "").strip(),
                persona_contacto=request.form.get("persona_contacto", "").strip(),
                notas=request.form.get("notas", "").strip(),
            )
            db.session.add(c)
            db.session.commit()
            flash(f"Cliente '{c.nombre}' creado.", "success")
            return redirect(url_for("cliente_detalle", cliente_id=c.id))
        return render_template("cliente_form.html", cliente=None)

    @app.route("/clientes/<int:cliente_id>")
    def cliente_detalle(cliente_id):
        empresa = get_empresa()
        cliente = Cliente.query.get_or_404(cliente_id)
        riesgo = calcular_riesgo_cliente(cliente.facturas, empresa.limite_riesgo_cliente)
        facturas = sorted(cliente.facturas, key=lambda f: f.fecha_vencimiento, reverse=True)
        calculos = {}
        for f in facturas:
            calculos[f.id] = calcular_intereses(
                f.pendiente, f.dias_retraso, empresa.tipo_interes_anual, empresa.indemnizacion_fija
            )
        return render_template(
            "cliente_detalle.html",
            cliente=cliente,
            riesgo=riesgo,
            facturas=facturas,
            calculos=calculos,
        )

    @app.route("/clientes/<int:cliente_id>/editar", methods=["GET", "POST"])
    def cliente_editar(cliente_id):
        cliente = Cliente.query.get_or_404(cliente_id)
        if request.method == "POST":
            cliente.nombre = request.form["nombre"].strip()
            cliente.cif = request.form.get("cif", "").strip()
            cliente.email = request.form.get("email", "").strip()
            cliente.telefono = request.form.get("telefono", "").strip()
            cliente.direccion = request.form.get("direccion", "").strip()
            cliente.persona_contacto = request.form.get("persona_contacto", "").strip()
            cliente.notas = request.form.get("notas", "").strip()
            db.session.commit()
            flash("Cliente actualizado.", "success")
            return redirect(url_for("cliente_detalle", cliente_id=cliente.id))
        return render_template("cliente_form.html", cliente=cliente)

    @app.route("/clientes/<int:cliente_id>/expediente.pdf")
    def cliente_expediente_pdf(cliente_id):
        empresa = get_empresa()
        cliente = Cliente.query.get_or_404(cliente_id)
        facturas = [f for f in cliente.facturas if f.estado in ("pendiente", "parcial")]
        if not facturas:
            facturas = cliente.facturas
        buf = generar_expediente_cliente(empresa, cliente, facturas)
        nombre = secure_filename(f"expediente_{cliente.nombre}.pdf")
        return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name=nombre)

    # ---------------- Facturas ----------------
    @app.route("/facturas")
    def facturas():
        empresa = get_empresa()
        estado_filtro = request.args.get("estado", "vencidas")
        todas = Factura.query.all()
        if estado_filtro == "vencidas":
            lista = [f for f in todas if f.vencida]
        elif estado_filtro == "pendientes":
            lista = [f for f in todas if f.estado in ("pendiente", "parcial")]
        elif estado_filtro == "pagadas":
            lista = [f for f in todas if f.estado == "pagada"]
        else:
            lista = todas
        lista.sort(key=lambda f: f.fecha_vencimiento)
        calculos = {
            f.id: calcular_intereses(
                f.pendiente, f.dias_retraso, empresa.tipo_interes_anual, empresa.indemnizacion_fija
            )
            for f in lista
        }
        return render_template(
            "facturas.html", facturas=lista, estado_filtro=estado_filtro, calculos=calculos
        )

    @app.route("/facturas/nueva", methods=["GET", "POST"])
    def factura_nueva():
        clientes_lista = Cliente.query.order_by(Cliente.nombre).all()
        if request.method == "POST":
            base = float(request.form.get("base_imponible", 0) or 0)
            iva = float(request.form.get("iva_pct", 21) or 0)
            total = round(base * (1 + iva / 100.0), 2)
            f = Factura(
                cliente_id=int(request.form["cliente_id"]),
                numero=request.form["numero"].strip(),
                fecha_emision=datetime.strptime(request.form["fecha_emision"], "%Y-%m-%d").date(),
                fecha_vencimiento=datetime.strptime(
                    request.form["fecha_vencimiento"], "%Y-%m-%d"
                ).date(),
                base_imponible=base,
                iva_pct=iva,
                importe_total=total,
            )
            db.session.add(f)
            db.session.commit()
            flash(f"Factura {f.numero} creada.", "success")
            return redirect(url_for("factura_detalle", factura_id=f.id))
        cliente_preseleccionado = request.args.get("cliente_id", type=int)
        return render_template(
            "factura_form.html", clientes=clientes_lista, cliente_preseleccionado=cliente_preseleccionado
        )

    @app.route("/facturas/<int:factura_id>")
    def factura_detalle(factura_id):
        empresa = get_empresa()
        f = Factura.query.get_or_404(factura_id)
        calc = calcular_intereses(
            f.pendiente, f.dias_retraso, empresa.tipo_interes_anual, empresa.indemnizacion_fija
        )
        fase_sugerida = fase_para_dias_retraso(f.dias_retraso)
        return render_template(
            "factura_detalle.html", factura=f, calc=calc, fase_sugerida=fase_sugerida
        )

    @app.route("/facturas/<int:factura_id>/pago", methods=["POST"])
    def factura_pago(factura_id):
        f = Factura.query.get_or_404(factura_id)
        importe = float(request.form.get("importe_pagado", 0) or 0)
        f.importe_pagado = round(f.importe_pagado + importe, 2)
        f.fecha_pago = date.today()
        if f.importe_pagado >= f.importe_total - 0.01:
            f.estado = "pagada"
            f.importe_pagado = f.importe_total
        else:
            f.estado = "parcial"
        db.session.commit()
        flash("Pago registrado.", "success")
        return redirect(url_for("factura_detalle", factura_id=f.id))

    @app.route("/facturas/<int:factura_id>/incobrable", methods=["POST"])
    def factura_incobrable(factura_id):
        f = Factura.query.get_or_404(factura_id)
        f.estado = "incobrable"
        db.session.commit()
        flash("Factura marcada como incobrable.", "success")
        return redirect(url_for("factura_detalle", factura_id=f.id))

    @app.route("/facturas/<int:factura_id>/gestion", methods=["POST"])
    def factura_gestion(factura_id):
        f = Factura.query.get_or_404(factura_id)
        fecha_promesa = request.form.get("fecha_promesa_pago") or None
        g = Gestion(
            factura_id=f.id,
            tipo=request.form.get("tipo", "nota"),
            fase=int(request.form.get("fase", 0) or 0),
            descripcion=request.form.get("descripcion", "").strip(),
            fecha_promesa_pago=(
                datetime.strptime(fecha_promesa, "%Y-%m-%d").date() if fecha_promesa else None
            ),
        )
        db.session.add(g)
        if g.fase:
            f.fase_actual = g.fase
        db.session.commit()
        flash("Gestión registrada.", "success")
        return redirect(url_for("factura_detalle", factura_id=f.id))

    @app.route("/facturas/<int:factura_id>/carta/<int:fase>")
    def factura_carta(factura_id, fase):
        empresa = get_empresa()
        f = Factura.query.get_or_404(factura_id)
        if fase not in FASES:
            abort(404)
        plantilla = get_plantilla(empresa.id, fase)
        asunto, cuerpo = generar_mensaje(f, empresa, plantilla.asunto, plantilla.cuerpo)
        return render_template(
            "carta_preview.html", factura=f, fase=fase, asunto=asunto, cuerpo=cuerpo
        )

    # ---------------- Importar CSV ----------------
    @app.route("/importar", methods=["GET", "POST"])
    def importar():
        if request.method == "POST":
            archivo = request.files.get("csv_file")
            if not archivo or archivo.filename == "":
                flash("Selecciona un archivo CSV.", "error")
                return redirect(url_for("importar"))
            try:
                contenido = archivo.stream.read().decode("utf-8-sig")
                lector = csv.DictReader(io.StringIO(contenido))
                creados_clientes = 0
                creadas_facturas = 0
                for fila in lector:
                    nombre_cliente = (fila.get("cliente_nombre") or "").strip()
                    if not nombre_cliente:
                        continue
                    cliente = Cliente.query.filter_by(nombre=nombre_cliente).first()
                    if not cliente:
                        cliente = Cliente(
                            nombre=nombre_cliente,
                            cif=(fila.get("cliente_cif") or "").strip(),
                            email=(fila.get("cliente_email") or "").strip(),
                            telefono=(fila.get("cliente_telefono") or "").strip(),
                            persona_contacto=(fila.get("cliente_contacto") or "").strip(),
                        )
                        db.session.add(cliente)
                        db.session.flush()
                        creados_clientes += 1

                    numero = (fila.get("factura_numero") or "").strip()
                    if not numero:
                        continue
                    base = float(fila.get("base_imponible") or 0)
                    iva = float(fila.get("iva_pct") or 21)
                    total = round(base * (1 + iva / 100.0), 2)
                    f_emision = datetime.strptime(fila["fecha_emision"], "%Y-%m-%d").date()
                    f_vto = datetime.strptime(fila["fecha_vencimiento"], "%Y-%m-%d").date()
                    factura = Factura(
                        cliente_id=cliente.id,
                        numero=numero,
                        fecha_emision=f_emision,
                        fecha_vencimiento=f_vto,
                        base_imponible=base,
                        iva_pct=iva,
                        importe_total=total,
                    )
                    db.session.add(factura)
                    creadas_facturas += 1
                db.session.commit()
                flash(
                    f"Importación completada: {creados_clientes} clientes nuevos, "
                    f"{creadas_facturas} facturas creadas.",
                    "success",
                )
            except Exception as e:
                db.session.rollback()
                flash(f"Error al importar: {e}", "error")
            return redirect(url_for("importar"))
        return render_template("importar.html")

    @app.route("/importar/plantilla.csv")
    def importar_plantilla():
        contenido = (
            "cliente_nombre,cliente_cif,cliente_email,cliente_telefono,cliente_contacto,"
            "factura_numero,fecha_emision,fecha_vencimiento,base_imponible,iva_pct\n"
            "Ejemplo Distribuciones S.L.,B12345678,pagos@ejemplo.com,910000000,Ana Ruiz,"
            "F-2025-001,2025-06-01,2025-07-01,1200.00,21\n"
        )
        buf = io.BytesIO(contenido.encode("utf-8"))
        return send_file(
            buf, mimetype="text/csv", as_attachment=True, download_name="plantilla_importacion.csv"
        )

    # ---------------- Configuración ----------------
    @app.route("/configuracion", methods=["GET", "POST"])
    def configuracion():
        empresa = get_empresa()
        if request.method == "POST":
            empresa.nombre = request.form.get("nombre", "").strip()
            empresa.cif = request.form.get("cif", "").strip()
            empresa.direccion = request.form.get("direccion", "").strip()
            empresa.email_contacto = request.form.get("email_contacto", "").strip()
            empresa.telefono = request.form.get("telefono", "").strip()
            empresa.iban = request.form.get("iban", "").strip()
            empresa.color_primario = request.form.get("color_primario", "#0f4c5c").strip()
            empresa.tipo_interes_anual = float(request.form.get("tipo_interes_anual", 12) or 12)
            empresa.fecha_tipo_interes = request.form.get("fecha_tipo_interes", "").strip()
            empresa.indemnizacion_fija = float(request.form.get("indemnizacion_fija", 40) or 40)
            empresa.plazo_pago_dias = int(request.form.get("plazo_pago_dias", 60) or 60)
            empresa.limite_riesgo_cliente = float(
                request.form.get("limite_riesgo_cliente", 3000) or 3000
            )

            nueva_password = request.form.get("nueva_password", "").strip()
            if nueva_password:
                empresa.admin_password_hash = generate_password_hash(nueva_password)

            logo = request.files.get("logo")
            if logo and logo.filename:
                nombre_seguro = secure_filename(logo.filename)
                ruta = os.path.join(UPLOAD_DIR, nombre_seguro)
                logo.save(ruta)
                empresa.logo_filename = nombre_seguro

            db.session.commit()
            flash("Configuración guardada.", "success")
            return redirect(url_for("configuracion"))
        return render_template("configuracion.html", empresa=empresa)

    # ---------------- Plantillas de mensajes ----------------
    @app.route("/plantillas", methods=["GET", "POST"])
    def plantillas():
        empresa = get_empresa()
        if request.method == "POST":
            fase = int(request.form["fase"])
            asunto = request.form.get("asunto", "").strip()
            cuerpo = request.form.get("cuerpo", "").strip()
            p = Plantilla.query.filter_by(empresa_id=empresa.id, fase=fase).first()
            if not p:
                p = Plantilla(empresa_id=empresa.id, fase=fase, asunto=asunto, cuerpo=cuerpo)
                db.session.add(p)
            else:
                p.asunto = asunto
                p.cuerpo = cuerpo
            db.session.commit()
            flash(f"Plantilla de fase {fase} guardada.", "success")
            return redirect(url_for("plantillas"))
        datos = {fase: get_plantilla(empresa.id, fase) for fase in FASES}
        return render_template("plantillas.html", datos=datos)

    @app.route("/health")
    def health():
        return {"status": "ok"}


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
