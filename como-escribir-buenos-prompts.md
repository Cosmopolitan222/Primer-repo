# Cómo escribir buenos prompts

Una guía práctica para comunicarte de forma efectiva con modelos de lenguaje (LLMs) como Claude.

## 1. Sé claro y directo

El error más común es asumir que el modelo "entiende" lo que quieres decir sin decirlo explícitamente. Trata al modelo como a una persona muy competente pero sin contexto previo sobre tu situación.

- **Mal:** "Mejora este texto."
- **Bien:** "Reescribe este párrafo para que sea más conciso, mantén el tono formal y no superes las 100 palabras."

## 2. Da contexto, no solo instrucciones

Explica el "por qué" detrás de la tarea. El contexto ayuda al modelo a tomar mejores decisiones cuando hay ambigüedad.

- ¿Para quién es esto? (audiencia)
- ¿Con qué propósito? (objetivo final)
- ¿Qué restricciones existen? (longitud, tono, formato, tecnología)

**Ejemplo:**
> "Estoy escribiendo un email para rechazar una propuesta de un proveedor. Necesito ser firme pero cordial porque podríamos trabajar con ellos en el futuro."

## 3. Sé específico sobre el resultado esperado

Define el formato de salida: longitud, estructura, estilo, idioma.

- "Responde en una lista con viñetas de máximo 5 puntos."
- "Devuelve solo el código, sin explicaciones adicionales."
- "Usa un tono profesional pero cercano."

## 4. Usa ejemplos (few-shot prompting)

Mostrar 1-3 ejemplos del resultado que buscas suele ser más efectivo que describirlo con adjetivos.

```
Convierte estas notas en tareas accionables:

Nota: "hay que revisar el diseño antes del viernes"
Tarea: [ ] Revisar el diseño (fecha límite: viernes)

Nota: "falta hablar con marketing sobre el lanzamiento"
Tarea:
```

## 5. Divide tareas complejas en pasos

Si la tarea tiene múltiples etapas (investigar, analizar, redactar, revisar), pídeselo por partes o indica explícitamente el orden de razonamiento. Esto reduce errores y facilita corregir a mitad de camino.

## 6. Asigna un rol cuando ayude

Definir un rol o "persona" puede enfocar el tono y el nivel de detalle:

> "Actúa como un revisor de código senior enfocado en seguridad."

Úsalo con moderación: es útil para tono y perspectiva, no reemplaza instrucciones claras sobre el contenido.

## 7. Indica lo que NO quieres

A veces es más fácil delimitar por exclusión:

- "No uses jerga técnica."
- "No incluyas una introducción, ve directo al punto."
- "No inventes datos que no te haya dado."

## 8. Itera

Rara vez el primer prompt es el óptimo. Trata el prompt como un borrador:

1. Escribe una versión inicial.
2. Evalúa el resultado.
3. Ajusta la instrucción según lo que falló (¿fue muy largo?, ¿ignoró una restricción?, ¿mal formato?).
4. Repite.

## 9. Para tareas de razonamiento, pide pensar paso a paso

En problemas lógicos, matemáticos o de análisis, pedir que el modelo razone antes de concluir ("piensa paso a paso", "explica tu razonamiento antes de dar la respuesta final") mejora la precisión.

## 10. Usa delimitadores para separar partes del prompt

Cuando combines instrucciones, contexto y datos, sepáralos claramente (con XML tags, markdown, comillas triples, etc.) para que el modelo no confunda una cosa con otra:

```
<contexto>
Este es un informe financiero del Q3.
</contexto>

<tarea>
Resume los 3 puntos más relevantes para el equipo directivo.
</tarea>
```

## Checklist rápido

- [ ] ¿Definí claramente la tarea y el objetivo?
- [ ] ¿Di suficiente contexto (audiencia, propósito, restricciones)?
- [ ] ¿Especifiqué el formato de salida?
- [ ] ¿Incluí ejemplos si la tarea es ambigua?
- [ ] ¿Separé instrucciones, contexto y datos con claridad?
- [ ] ¿Revisé el resultado y ajusté el prompt si fue necesario?

## Recursos adicionales

- [Anthropic — Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
