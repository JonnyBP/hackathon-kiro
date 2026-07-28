# UI Design — Kiro Spec Studio (v3)

> Documento alineado con los contratos de datos reales de los agentes.
> La fuente de verdad del comportamiento es `.kiro/specs/frontend-ui/requirements.md`.

---

## Cambios respecto a v2

| Elemento | v2 | v3 |
|----------|----|----|
| Pestañas | 5 | **6**, se agrega 🔧 DevSecOps (Agente 4) |
| Generación | Bloqueante, mascota con temporizador | **Incremental**: cada sección aparece al llegar |
| Estado por sección | Disponible / no disponible | **Pendiente / disponible / no disponible** |
| Tab Mercado | Nicho + barras TAM/SAM/SOM numéricas | Sin nicho; valores son texto, barras condicionales |
| Tab Técnico | Región AWS recomendada | Sin región; servicios derivados de políticas IAM |
| Tab Costos | Rangos "$3 – $8" | Montos únicos; totales calculados por el frontend |
| Tab Compliance | Semáforo de 3 niveles | **4 niveles** de regulación + 3 de severidad |
| Tab Tareas | Fases con progreso y completadas | **Niveles de dependencia**; sin progreso ni estados |

El motivo de cada cambio es el mismo: v2 describía datos que los agentes no entregan. Ver "Contratos de datos" al final.

---

## Estructura de Pantallas

```
Pantalla 1: Input
     │
     ▼ (solo Modo Rápido, si hay suposiciones)
Pantalla 2: Confirmación de Suposiciones
     │
     ▼
Pantalla 3: Output — Browser Layout con 6 pestañas
```

La Pantalla 3 se abre en cuanto **la primera sección** está lista, no cuando terminan todas.

---

## Pantalla 1: Input

### Switch de Modo

```
💡 Modo Rápido  ●────────────  📋 Modo Experto
Solo escribe tu idea        Brief completo
```

Rol ARIA `radiogroup`. Deshabilitado mientras hay una generación en curso.

### Modo Rápido

```
┌──────────────────────────────────────────────────────────┐
│  ¿Cuál es tu idea?                          1847 restantes│
│  ┌────────────────────────────────────────────────────┐  │
│  │  Escribe tu idea en una o dos oraciones...         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ▸ Detalles opcionales (2 con valor)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ¿Tecnología preferida?     [__________________]   │  │
│  │  ¿Desde dónde se conectarán │ México          ▾   │  │
│  │   más tus usuarios?         │ LATAM               │  │
│  │                             │ USA/Canadá          │  │
│  │                             │ Europa              │  │
│  │                             │ Global              │  │
│  │  ¿Algo que NO quieres?      [__________________]   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- Idea: único campo obligatorio. Mínimo 20 caracteres útiles, máximo 2000, con contador permanente.
- Selección simple de región, sin opción preseleccionada.
- El colapsable indica cuántos campos tienen valor, y se abre solo si se restauró algo de la sesión.

### Modo Experto

Siete campos visibles, sin colapsables: Idea, Nombre del proyecto, Público objetivo, Tecnología preferida, Algo que NO quieres, Presupuesto aproximado y el selector de región.

El selector de región pasa a **selección múltiple**: México / LATAM / USA / Europa / Asia / Global. `Global` es mutuamente excluyente con las regiones específicas. Debajo, en texto secundario:

*"Esto determina la región AWS recomendada y las regulaciones de privacidad aplicables"*

---

## Pantalla 2: Confirmación de Suposiciones

Tabla de suposiciones con "Cambiar" y "Restaurar" por fila. Edición en línea, una fila a la vez, Escape cancela. Solo aparece en Modo Rápido y solo si el pipeline devolvió suposiciones. Confirmar con al menos una fila modificada dispara una regeneración.

---

## Pantalla 3: Output — Browser Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← → ↺   kiro-spec-studio.app/resultados/tournamenthub       [↓ ZIP] │
├──────────────────────────────────────────────────────────────────────┤
│ 📊 Mercado │🏗 Técnico│💰 Costos│⚖ Compliance│✅ Tareas│🔧 DevSecOps │
│ ────────── │          │         │  generando │no disponible│        │
│                                                                      │
│  [Contenido del tab activo]                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- Barra superior decorativa: los botones de navegación están fuera del orden de tabulación. La URL es texto copiable, no un enlace.
- El tab activo se distingue con subrayado **y** color de acento.
- Cada pestaña puede estar en uno de tres estados, marcados con texto además de color:
  - **normal** — sección lista
  - **"generando"** — su fuente aún no respondió; el panel muestra un marcador de carga
  - **"no disponible"** — su fuente falló; el panel muestra el motivo y un botón de reintento
- Cambiar de pestaña es instantáneo, sin peticiones de red.

### Progreso incremental

Mientras se genera, se muestra "N de 6" secciones listas. Las cuatro fuentes se piden en paralelo:

| Fuente | Secciones que produce |
|--------|-----------------------|
| Agente 1 — PM & Mercado | Mercado |
| Agente 2 — Arquitectura | Técnico, Costos, Tareas |
| Agente 3 — Legal & Compliance | Compliance |
| Agente 4 — DevSecOps | DevSecOps |

Reintentar una fuente no vuelve a pedir las demás. Como Técnico, Costos y Tareas comparten una sola respuesta del Agente 2, reintentar cualquiera de las tres refresca las tres.

---

### Tab 1: 📊 Mercado

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub                                              │
│  Audiencia: Organizador de torneos · Comunidad gaming       │
├───────────────────────────┬─────────────────────────────────┤
│  PROBLEMA                 │  PROPUESTA DE VALOR             │
│  Organizadores gastan     │  "La única plataforma que       │
│  3-5h por torneo en       │   permite organizar torneos     │
│  hojas de cálculo         │   en <10 minutos"               │
├───────────────────────────┴─────────────────────────────────┤
│  TAMAÑO DE MERCADO                                          │
│                                                             │
│   TAM ████████████████████████████  $2.1B  (con fuente)    │
│   SAM ████████████░░░░░░░░░░░░░░░░  $180M  (estimado)      │
│   SOM ██░░░░░░░░░░░░░░░░░░░░░░░░░░  $1.2M  (estimado)      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  COMPETENCIA                                                │
│  ┌───────────┬───────────┬──────────────┬────────────────┐ │
│  │ Competidor│ Fortalezas│ Debilidades  │ Precio         │ │
│  ├───────────┼───────────┼──────────────┼────────────────┤ │
│  │ Challonge │ Conocido  │ Sin español  │ Freemium       │ │
│  │ Battlefy  │ Pro tools │ Solo esports │ $99/mes        │ │
│  └───────────┴───────────┴──────────────┴────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  FEATURES MVP        RIESGOS TOP 3                          │
│  1. Crear torneo     🔴 Alta · mercado                      │
│  2. Bracket auto        Adopción inicial lenta              │
│  3. Resultados live     → Mitigación: alianzas con ligas    │
└─────────────────────────────────────────────────────────────┘
```

Precisiones frente a v2:

- **No hay campo "nicho"** en el esquema del Agente 1. El encabezado usa nombre del proyecto y la audiencia derivada de la persona primaria (rol y tipo de empresa).
- **TAM/SAM/SOM son texto**, no números (`{ value: "$2.1B", source_type: "estimated"|"sourced", source? }`). Se muestran tal cual. Las barras solo se dibujan si los tres valores se interpretan como número finito; si alguno no, se presentan como lista de texto sin proporciones inventadas.
- La "base de cálculo" es el tipo de fuente: **estimado** o **con fuente**, más la fuente si viene.
- La tabla de competencia tiene **cuatro** columnas: el esquema incluye `pricing`.
- Las **features MVP vienen del brief de entrada**, no del reporte de mercado, que no las incluye.
- Cada riesgo muestra severidad (alta/media/baja), categoría (mercado/técnico/negocio) y mitigación.

---

### Tab 2: 🏗 Técnico

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub — Clean                                      │
│  Stack: Next.js · Lambda · DynamoDB · Cognito               │
├─────────────────────────────────────────────────────────────┤
│  DIAGRAMA DE INFRAESTRUCTURA                                │
│                                                             │
│   [Usuario] ──► [CloudFront] ──► [S3 Frontend]             │
│                      │                                      │
│                      ▼                                      │
│               [API Gateway]                                 │
│         ┌────────────┼────────────┐                         │
│         ▼            ▼            ▼                         │
│    [λ Auth]    [λ Torneos]  [λ Resultados]                  │
│                                                             │
│  (texto Mermaid renderizado; si falla, bloque preformateado)│
├─────────────────────────────────────────────────────────────┤
│  SERVICIOS Y PERMISOS                                       │
│  ┌────────────┬──────────────────────┬──────────┬─────────┐│
│  │ Servicio   │ Acciones IAM         │ Recurso  │ Efecto  ││
│  ├────────────┼──────────────────────┼──────────┼─────────┤│
│  │ dynamodb   │ GetItem, PutItem     │ table/*  │ Allow   ││
│  │ s3         │ GetObject            │ bucket/* │ Allow   ││
│  └────────────┴──────────────────────┴──────────┴─────────┘│
├─────────────────────────────────────────────────────────────┤
│  DECISIONES CLAVE                                           │
│  • Patrón: Clean Architecture                               │
│  • SRP — Cada módulo tiene una razón para cambiar (Domain)   │
│  • Zod Validation — Validación en los límites (Middleware)   │
└─────────────────────────────────────────────────────────────┘
```

Precisiones:

- **Se elimina la "región AWS recomendada"**: no existe en el modelo del Agente 2.
- La tabla de servicios se deriva de `design.iamPolicySummary`, que da servicio, acciones, recurso y efecto. **No hay descripción de uso por servicio.**
- **No hay lista dedicada de decisiones.** "Decisiones clave" se compone del patrón de arquitectura, los límites SOLID y las guardas de seguridad.
- El diagrama llega como texto Mermaid. Si la sintaxis es inválida, el renderizador falla, tarda más de 3 s o declara más de 40 nodos, se degrada al texto fuente en un bloque preformateado.

---

### Tab 3: 💰 Costos

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub — Estimación de Costos AWS                    │
├────────────────────────┬────────────────────────────────────┤
│  MVP                   │  ESCALA                            │
│  500 usuarios/mes      │  50,000 usuarios/mes               │
│                        │                                    │
│  $2.12 / mes           │  $31.85 / mes                      │
│  ███░░░░░░░░░░░░░ 7 %  │  ████████████████████ 100 %        │
├────────────────────────┴────────────────────────────────────┤
│  DESGLOSE POR SERVICIO                                      │
│                                                             │
│  Servicio      MVP/mes     Escala/mes   Diferencia          │
│  ─────────────────────────────────────────────────────      │
│  Lambda        $0 (free)   $1.20        +$1.20              │
│  API Gateway   $0.15       $6.00        +$5.85              │
│  DynamoDB      $1.00       $15.00       +$14.00             │
│  CloudFront    $0.85       $8.50        +$7.65              │
│  Cognito       $0 (free)   $0 (free)    —                   │
│  WAF           No disponible $1.15      No disponible       │
│  ─────────────────────────────────────────────────────      │
│  TOTAL         $2.00       $31.85                           │
│                                                             │
│  ⚠️ Estimados de referencia en USD. Calcular exacto en:      │
│     calculator.aws →                                        │
└─────────────────────────────────────────────────────────────┘
```

Precisiones:

- **Los montos son valores únicos**, no rangos: `{ service, monthlyCostUsd: number }`. Se elimina el formato "$3 – $8".
- **Los totales no vienen dados**: el frontend suma el arreglo de cada escenario. El TOTAL mostrado coincide siempre con la suma de las filas mostradas, redondeando a dos decimales antes de sumar.
- Las **cantidades de usuarios vienen del brief** (`expectedMetrics`), no del Agente 2.
- Los dos escenarios pueden listar servicios distintos. La tabla es la unión; el escenario que no lo tiene muestra "No disponible" y su Diferencia también.
- La barra de cada escenario es su total contra el mayor de los dos totales.

---

### Tab 4: ⚖ Compliance

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub — Compliance & Legal                         │
│  Audiencia: México + LATAM     Riesgo general: 🟢 Baja      │
├─────────────────────────────────────────────────────────────┤
│  DATOS QUE MANEJA LA APP                                    │
│  ✅ Email  ✅ Name  ⬜ Payments  ⬜ Location  ⬜ Health      │
│  (lista dinámica: la entrega el agente)                     │
├─────────────────────────────────────────────────────────────┤
│  REGULACIONES APLICABLES                                    │
│  🔴 Obligatorio  🟠 Requiere verificación                    │
│  🟡 Recomendado  ⬜ No aplica                                │
│                                                             │
│  🔴  LFPDPPP — Processes personal data of Mexican users     │
│  🟠  GDPR — Territorial scope unconfirmed; verify EU users  │
│  🟡  Privacy Policy — Market practice for consumer apps     │
│  ⬜  HIPAA — Not a covered entity                           │
├─────────────────────────────────────────────────────────────┤
│  CHECKLIST ANTES DE LANZAR                                  │
│                                                             │
│  Documentos Legales          (Legal Documents)              │
│  ☑  Aviso de Privacidad                                     │
│  ☐  Términos y Condiciones                                  │
│                                                             │
│  Licencias Open Source       (Open-Source Licenses)         │
│  ☑  Next.js — MIT                                           │
│  ☐  AWS SDK — Apache 2.0                                    │
│                                                             │
│  (grupos dinámicos; solo lectura, reflejan el campo checked) │
└─────────────────────────────────────────────────────────────┘
```

Precisiones:

- El semáforo de regulaciones tiene **cuatro niveles**, no tres: `mandatory`, `verification-required`, `recommended`, `not-applicable`. El nivel extra existe porque el agente distingue "obligatorio confirmado" de "falta un dato para saberlo".
- El **riesgo general usa otra escala**: `low` / `medium` / `high` → baja / media / alta. No es la escala de regulaciones.
- **La lista de datos es dinámica**, pares `{ name, collected }`. No es un conjunto fijo de siete categorías.
- **Los grupos del checklist son dinámicos** y llegan en inglés. Siempre incluyen `Legal Documents` y `Open-Source Licenses`; condicionalmente `Privacy Controls`, `AWS/AI Compliance`, `Children`, `Payments`, `International Transfers`. Las conocidas se traducen; las desconocidas se muestran tal cual en lugar de descartarse.
- Nombres de regulación y justificaciones se muestran **verbatim en inglés**, por ser términos normativos.
- Cada entrada del checklist tiene un booleano `checked`; el marcador es de solo lectura y no persiste avance.
- Aviso permanente: es una guía generada por IA, no reemplaza asesoría legal.

---

### Tab 5: ✅ Tareas

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub — Plan de Implementación                     │
│  18 tareas · Siguiente: TASK-001                            │
├─────────────────────────────────────────────────────────────┤
│  Nivel 1                                                    │
│  TASK-001  Inicializar proyecto Next.js        ← siguiente   │
│            Sin dependencias                                 │
│  TASK-002  Configurar AWS CDK                               │
│            Sin dependencias                                 │
│  ─────────────────────────────────────────────────────      │
│  Nivel 2                                                    │
│  TASK-003  Configurar Cognito User Pool                     │
│            Depende de: TASK-002                             │
│  TASK-004  Configurar DynamoDB y tablas                     │
│            Depende de: TASK-002                             │
│  ─────────────────────────────────────────────────────      │
│  Nivel 3                                                    │
│  TASK-006  Lambda: POST /auth/register                      │
│            Depende de: TASK-003, TASK-004                   │
└─────────────────────────────────────────────────────────────┘
```

Este tab es el que más cambió. `TaskItem` es `{ id, title, description, dependencies }` y **no tiene fase, ni estado de completado, ni estimación de tiempo**. Por lo tanto:

- **Se eliminan** las barras de progreso por fase, los conteos "3/4 tareas", los iconos ✅/⬜ por tarea y el "Est. 2 semanas".
- Las tareas se agrupan por **nivel de dependencia**, calculado como profundidad topológica: nivel 1 son las tareas sin dependencias, y el nivel de una tarea es uno más el máximo de sus dependencias.
- "← siguiente" marca la primera tarea de nivel 1.
- Cada tarea muestra id, título, descripción y sus dependencias.
- Casos que el modelo no impide y hay que manejar: dependencias que apuntan a ids inexistentes (se ignoran para el nivel y se marcan), ciclos (se agrupan al final bajo "Dependencias circulares") e ids duplicados (se marcan).

---

### Tab 6: 🔧 DevSecOps

```
┌─────────────────────────────────────────────────────────────┐
│  TournamentHub — DevSecOps        5 de 5 artefactos         │
├─────────────────────────────────────────────────────────────┤
│  Dockerfile                                      [Copiar]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ # Stage 1: Dependencies                               │ │
│  │ FROM node:20-alpine AS deps                           │ │
│  │ WORKDIR /app                                          │ │
│  │ ...                                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  docker-compose.yml                              [Copiar]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ services:                                             │ │
│  │   app:                                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  .github/workflows/ci.yml                        [Copiar]   │
│  .kiro/hooks/validate-specs.sh   (se ejecuta fuera del app) │
│  .kiro/hooks/scan-secrets.sh     (se ejecuta fuera del app) │
└─────────────────────────────────────────────────────────────┘
```

Pestaña nueva en v3. El Agente 4 entrega cinco cadenas de texto, cada una con su ruta de destino en el repositorio.

- Cada artefacto se muestra en un bloque preformateado desplazable que preserva indentación y saltos de línea exactos, con tope de 20 000 caracteres renderizados y aviso si se truncó.
- "Copiar" entrega el texto **completo**, no la vista truncada.
- Todo es de solo lectura. Los dos hooks se muestran como texto; **el frontend nunca los ejecuta**.
- El contenido se renderiza como texto plano escapado, para que la respuesta del agente no pueda inyectar HTML ni scripts.
- En el ZIP los cinco artefactos entran como archivos separados en su ruta real, no como un único `devsecops`.

---

## Mascota Kiro

Elemento fijo en la esquina inferior derecha, ~80 px de alto, con globo de diálogo arriba. Es el narrador del proceso.

### Estados

| Estado | Cuándo | Mensaje de ejemplo |
|--------|--------|-------------------|
| `esperando` | Pantalla de entrada, sin generación | "Escribe tu idea y yo me encargo del resto" |
| `agente_pm` | Mercado pendiente | "Buscando el tamaño del mercado de [nicho]..." |
| `agente_tecnico` | Técnico pendiente | "Diseñando tu arquitectura en AWS..." |
| `agente_financiero` | Costos pendiente | "Calculando costos para MVP y para escala..." |
| `agente_legal` | Compliance pendiente | "Revisando qué regulaciones aplican..." |
| `procesando` | Tareas pendiente | "Ordenando tus tareas por dependencia..." |
| `agente_devsecops` | DevSecOps pendiente | "Preparando Docker y tu pipeline de CI..." |
| `completado` | Nada pendiente y algo disponible | "¡Todo listo! Navega los resultados con las pestañas" |
| `error` | Las seis secciones fallaron | "Algo salió mal, intentemos de nuevo" |

### Cambio importante respecto a v2

En v2 los mensajes avanzaban con un temporizador de 2 s, lo que significaba que la mascota decía "calculando costos" aunque los costos ya estuvieran listos. En v3 **el mensaje lo determina el estado real**: la mascota muestra el mensaje de la primera sección que sigue pendiente, en el orden Mercado, Técnico, Costos, Compliance, Tareas, DevSecOps. Se mantiene un mínimo de 2 s por mensaje para que no parpadee si dos secciones llegan juntas.

### Mensajes por tab activo

Una vez terminada la generación, el mensaje cambia según la pestaña. Aquí también hubo una corrección: v2 proponía frases como *"Elegí serverless para que no pagues cuando no hay usuarios"* y *"A escala, el mayor costo es DynamoDB"*, que son ciertas para el ejemplo TournamentHub pero **no para cualquier proyecto**. En v3 los mensajes son genéricos, o el dato concreto se toma del reporte.

| Tab activo | Mensaje |
|------------|---------|
| Mercado | "Este análisis es tu mapa del territorio" |
| Técnico | "Así se conectan las piezas de tu arquitectura" |
| Costos | "Compara el MVP con la escala antes de decidir" |
| Compliance | "Revisa lo obligatorio antes de lanzar" |
| Tareas | "Empieza por el Nivel 1 — cada tarea desbloquea las siguientes" |
| DevSecOps | "Copia cada archivo a la ruta que indica su rótulo" |

Si un mensaje trae un marcador como `[nicho]` o `[región]` y el dato no está disponible, se muestra la variante genérica sin ese segmento, nunca el marcador literal.

### Accesibilidad y respeto por el usuario

- El globo usa `aria-live="polite"`, con un mínimo de 5 s entre anuncios para no saturar al lector de pantalla.
- Con `prefers-reduced-motion: reduce` la mascota es imagen estática y los mensajes cambian sin desplazamiento.
- Hay un control para ocultarla, siempre visible y alcanzable con teclado; la preferencia sobrevive a una recarga. Aunque esté oculta, la región `aria-live` sigue anunciando el progreso.

### Implementación sugerida

SVG animado con CSS, o Lottie si hay tiempo. Una imagen estática con el globo animado en CSS es suficiente para el demo.

---

## Accesibilidad y responsividad

Objetivo: WCAG 2.1 AA. Puntos que condicionan el diseño visual:

- Contraste mínimo 4.5:1 en texto normal y 3:1 en texto grande, componentes y foco, en los estados normal, hover, foco y activo.
- **Ningún indicador depende solo del color.** Los cuatro niveles de regulación, las tres severidades y los tres estados de pestaña llevan texto o forma.
- Ningún control se identifica solo con un emoji: las pestañas necesitan nombre accesible textual.
- Rango soportado de viewport: 320–1920 px. Por debajo de 768 px se apilan las columnas y las tablas, el diagrama y los bloques de DevSecOps desplazan dentro de su contenedor, nunca a nivel de documento.
- Áreas táctiles mínimas de 44 × 44 px con 8 px de separación en móvil.
- El carril de pestañas desplaza automáticamente hasta la pestaña activa en pantallas estrechas.

---

## Contratos de datos

Origen de cada sección. Esta tabla es la razón de los cambios de v2 a v3.

| Sección | Fuente | Contrato |
|---------|--------|----------|
| Mercado | Agente 1 | `shared/schemas/market-report-schema.json` |
| Técnico | Agente 2 | `Agent2Output.techSteering` + `design` |
| Costos | Agente 2 | `Agent2Output.design.awsCostProjection` |
| Tareas | Agente 2 | `Agent2Output.tasks` |
| Compliance | Agente 3 | esquema JSON en `COMPLIANCE_SYSTEM_PROMPT` |
| DevSecOps | Agente 4 | `Agent4Output` |

Estado actual del backend: solo el Agente 2 tiene un handler HTTP escrito. Los Agentes 1, 3 y 4 existen como prompts, casos de uso o scripts de consola, sin endpoint. Mientras no lo tengan, sus secciones se resuelven desde los mocks de `.kiro/mocks/` o quedan como "no disponible".
