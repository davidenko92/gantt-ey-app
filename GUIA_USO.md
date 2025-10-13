# Guía de Uso - Planificador de Proyectos EY

## 📋 Formato de Archivos

### 1. Archivo de Usuarios (usuarios.json)

El sistema ahora soporta un archivo JSON para definir usuarios con sus categorías, colores y vacaciones.

**Formato:**
```json
[
  {
    "id": "user-1",
    "name": "Juan Pérez",
    "category": "Senior",
    "color": "#3B82F6",
    "vacations": ["2025-10-15", "2025-10-16"]
  },
  {
    "id": "user-2",
    "name": "María López",
    "category": "Staff",
    "color": "#EF4444",
    "vacations": []
  }
]
```

**Campos:**
- `id` (opcional): Identificador único del usuario
- `name` (obligatorio): Nombre del usuario
- `category` (obligatorio): "Senior" o "Staff"
  - **Senior**: Multiplicador 1.0x (completa tareas en tiempo estándar)
  - **Staff**: Multiplicador 1.4x (tarda 40% más que un Senior)
- `color` (opcional): Color en formato hexadecimal. Si no se especifica, se asigna automáticamente
- `vacations` (opcional): Array de fechas en formato "YYYY-MM-DD"

**Ejemplo de uso:**
1. Ir a "Configuración" en la aplicación
2. Hacer clic en "Cargar Usuarios JSON"
3. Seleccionar el archivo `usuarios.json`

### 2. Archivo de Tareas (CSV o Excel)

**Formato actualizado con 4 columnas:**

| Tarea | Esfuerzo | Prioridad | Persona asignada |
|-------|----------|-----------|------------------|
| Diseño de arquitectura | 5 | Alta | Juan Pérez |
| Implementación API | 8 | Alta | María López;Carlos Gómez |
| Testing | 3 | Media | |
| Code Review | 2 | Baja | Juan Pérez |

**Columnas:**
1. **Tarea** (obligatorio): Nombre de la tarea
2. **Esfuerzo** (obligatorio): Días de esfuerzo base (antes de aplicar multiplicadores)
3. **Prioridad** (opcional): "Alta", "Media" o "Baja" (por defecto: "Media")
4. **Persona asignada** (opcional):
   - Vacío: Se auto-asigna al primer desarrollador disponible
   - Un nombre: "Juan Pérez"
   - Múltiples nombres separados por punto y coma: "María López;Carlos Gómez"

## 🎯 Flujo de Trabajo Recomendado

### Opción 1: Cargar Usuarios JSON + Tareas CSV/Excel

1. **Preparar archivo de usuarios** (`usuarios.json`)
   - Define todos los usuarios del equipo con sus categorías
   - Incluye vacaciones si las conoces de antemano
   - Los colores y vacaciones pueden editarse desde la UI después

2. **Preparar archivo de tareas** (CSV o Excel)
   - Columna 1: Nombre de la tarea
   - Columna 2: Esfuerzo en días (base, sin multiplicadores)
   - Columna 3: Prioridad (Alta/Media/Baja)
   - Columna 4: Persona(s) asignada(s), separadas por ";"

3. **En la aplicación:**
   - Abre "Configuración"
   - Carga el archivo `usuarios.json`
   - Carga el archivo de tareas
   - Haz clic en "Planificar"

### Opción 2: Crear Usuarios Manualmente + Tareas CSV/Excel

1. **En la aplicación:**
   - Abre "Configuración"
   - Haz clic en "Agregar Usuario" para cada miembro del equipo
   - Selecciona la categoría (Senior/Staff) de cada uno
   - Ajusta colores si lo deseas
   - Agrega vacaciones conocidas

2. **Cargar tareas:**
   - Carga el archivo CSV/Excel con las tareas
   - Haz clic en "Planificar"

## 📊 Cálculo de Esfuerzos

### División de Esfuerzo entre Múltiples Usuarios

Cuando una tarea está asignada a varios usuarios, el esfuerzo base se divide:

**Ejemplo 1:** Tarea de 5 días, 2 usuarios (ambos Senior)
- Usuario 1: Math.ceil(5/2) = 3 días × 1.0 = **3 días**
- Usuario 2: 2 días × 1.0 = **2 días**

**Ejemplo 2:** Tarea de 6 días, 2 usuarios (uno Senior, uno Staff)
- Senior: Math.ceil(6/2) = 3 días × 1.0 = **3 días**
- Staff: 3 días × 1.4 = **5 días** (redondeado hacia arriba)

**Ejemplo 3:** Tarea de 5 días, 1 usuario Staff
- Staff: 5 días × 1.4 = 7.0 días = **7 días**

### Reglas de Redondeo

Todos los cálculos finales se redondean **hacia arriba**:
- 1.5 días → 2 días
- 1.4 días → **2 días** (importante: no es 1 día)
- 1.1 días → 2 días

> **Nota:** Si calculas manualmente 5 × 1.4 = 7.0, el resultado es exactamente 7 días.

## 🎨 Personalización de UI

Todas las siguientes opciones son editables desde la interfaz:

### Colores de Usuarios
- Haz clic en el cuadrado de color al lado del nombre del usuario
- Selecciona un nuevo color del picker

### Categorías de Usuarios
- Usa el dropdown debajo del nombre del usuario
- Opciones: "Senior (x1.0)" o "Staff (x1.4)"

### Vacaciones
- En el panel de configuración de cada usuario
- Selecciona una fecha en el calendario
- Haz clic en "+ Agregar"
- Las vacaciones se pueden definir en el JSON o agregar/editar desde la UI

## ⚠️ Advertencias y Validaciones

El sistema realiza las siguientes validaciones:

1. **Tareas sin asignar:**
   - Muestra advertencia: "X tarea(s) sin asignar serán asignadas automáticamente"
   - Se asignan al primer desarrollador disponible según carga de trabajo

2. **Usuarios no encontrados:**
   - Si una tarea referencia un usuario que no existe en el JSON o en la lista
   - Muestra error específico: "Tarea 'X': usuario 'Y' no existe"

3. **Categorías inválidas:**
   - Acepta variaciones: "senior", "SENIOR", "Senior", "sénior"
   - Si no es válida, muestra error específico

4. **Usuarios duplicados:**
   - Detecta nombres duplicados (case-insensitive)
   - Muestra error: "Usuarios duplicados encontrados: juan perez"

## 📁 Archivos de Ejemplo

En la carpeta `ejemplos/` encontrarás:
- `usuarios.json`: Archivo de ejemplo con 4 usuarios (2 Senior, 2 Staff)
- `tareas-ejemplo.csv`: Archivo de ejemplo con 6 tareas con diferentes configuraciones

## 🔄 Orden de Carga

**Importante:** Si usas el archivo JSON, debes cargarlo **antes** de cargar las tareas.

1. ✅ **Correcto:** Cargar usuarios.json → Cargar tareas.csv → Planificar
2. ❌ **Incorrecto:** Cargar tareas.csv → Cargar usuarios.json

Si cargas tareas que referencian usuarios que aún no existen, obtendrás errores de validación.

## 🚀 Tips de Uso

1. **Usar JSON para equipos grandes:** Si tienes más de 3-4 usuarios, es más rápido usar JSON

2. **Priorizar tareas críticas:** Marca las tareas urgentes como "Alta" prioridad para que se planifiquen primero

3. **Asignación múltiple para tareas complejas:** Usa ";" para asignar tareas grandes a varios desarrolladores

4. **Dejar tareas sin asignar:** Útil cuando no sabes quién las hará. El sistema las asignará balanceando la carga

5. **Editar sobre la marcha:** Puedes cambiar prioridades, categorías, colores y vacaciones sin recargar archivos

## 📖 Ejemplos Prácticos

### Ejemplo 1: Sprint de 2 semanas
```csv
Tarea,Esfuerzo,Prioridad,Persona asignada
Setup proyecto,2,Alta,Juan Pérez
API REST endpoints,5,Alta,María López;Carlos Gómez
Frontend login,4,Alta,Ana Martínez
Tests integración,3,Media,Juan Pérez
Documentación,2,Baja,
```

### Ejemplo 2: Proyecto con vacaciones
```json
[
  {
    "name": "Developer 1",
    "category": "Senior",
    "vacations": ["2025-10-20", "2025-10-21", "2025-10-22"]
  },
  {
    "name": "Developer 2",
    "category": "Staff",
    "vacations": []
  }
]
```

El planificador automáticamente saltará los días de vacaciones al calcular fechas de entrega.
