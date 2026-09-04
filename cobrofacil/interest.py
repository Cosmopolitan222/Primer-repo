"""Motor de cálculo de intereses de demora según la Ley 3/2004, de 29 de
diciembre, de medidas de lucha contra la morosidad en las operaciones
comerciales (modificada por Ley 15/2010 y Ley 18/2022).

Resumen de las reglas aplicadas (estables en el tiempo; el único dato que
cambia periódicamente es el TIPO de interés, publicado por el Banco de
España/BOE cada semestre — por eso es un parámetro configurable por
empresa, no una constante en el código):

- El interés de demora se devenga automáticamente desde el día siguiente
  al vencimiento pactado, sin necesidad de aviso previo (art. 5).
- Si no hay pacto expreso, el tipo aplicable es el interés legal de
  referencia que fije la empresa en su configuración (por defecto se
  sugiere el tipo BCE + 8 puntos, pero SIEMPRE debe verificarse el valor
  vigente en boe.es antes de reclamar formalmente).
- Además del interés, el acreedor tiene derecho a una indemnización fija
  de 40 euros por cada factura impagada por los costes de cobro (art. 8),
  reclamable sin necesidad de justificar gasto alguno.
"""

from dataclasses import dataclass


@dataclass
class CalculoIntereses:
    dias_retraso: int
    importe_pendiente: float
    tipo_anual_pct: float
    interes_demora: float
    indemnizacion_fija: float
    total_reclamable: float


def calcular_intereses(
    importe_pendiente: float,
    dias_retraso: int,
    tipo_anual_pct: float,
    indemnizacion_fija: float = 40.0,
) -> CalculoIntereses:
    """Calcula el interés de demora simple proporcional a los días de
    retraso, más la indemnización fija por costes de cobro.

    interés = importe_pendiente * (tipo_anual / 100) * (días / 365)
    """
    dias = max(dias_retraso, 0)
    interes = importe_pendiente * (tipo_anual_pct / 100.0) * (dias / 365.0)
    interes = round(interes, 2)
    indemnizacion = round(indemnizacion_fija, 2) if importe_pendiente > 0 and dias > 0 else 0.0
    total = round(importe_pendiente + interes + indemnizacion, 2)
    return CalculoIntereses(
        dias_retraso=dias,
        importe_pendiente=round(importe_pendiente, 2),
        tipo_anual_pct=tipo_anual_pct,
        interes_demora=interes,
        indemnizacion_fija=indemnizacion,
        total_reclamable=total,
    )
