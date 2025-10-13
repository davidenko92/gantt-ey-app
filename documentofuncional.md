# Documento Funcional - Planificador de Proyectos EY

**Versión**: 2.0 - Sistema Multi-Equipo
**Fecha**: 2025-10-13
**Proyecto**: Gantt EY App

---

## 1. LÓGICA DE NEGOCIO

### 1.1 Descripción General

El **Planificador de Proyectos EY** es una aplicación web que permite la planificación automática de tareas de proyectos multi-equipo, distribuyendo la carga de trabajo entre múltiples equipos y usuarios de forma balanceada. Soporta workflows configurables con dependencias entre equipos, respetando días laborables, vacaciones y prioridades.

### 1.2 Flujo de Trabajo Principal (Multi-Equipo)

```
┌─────────────────┐
│ 1. Configurar   │
│    Equipos      │ → Desarrollo, Calidad, Auditoría, Testing...
└────────┬────────┘
         ↓
┌─────────────────┐
│ 2. Cargar       │
│    Tareas Base  │ → Excel/CSV: Tarea | Esfuerzo | Prioridad | Devs
└────────┬────────┘
         ↓
┌─────────────────┐
│ 3. Configurar   │
│    Workflow     │ → Por cada tarea: Habilitar equipos, tipos, prioridades
└────────┬────────┘
         ↓
┌─────────────────┐
│ 4. Expandir y   │
│    Planificar   │ → Sistema crea tareas por equipo + dependencias
└────────┬────────┘
         ↓
┌─────────────────┐
│ 5. Visualizar   │ → Gantt multi-fase + Resumen por equipo/usuario
└────────┬────────┘
         ↓
┌─────────────────┐
│ 6. Exportar     │ → Excel con workflow completo
└─────────────────┘
```

### 1.3 Entidades del Sistema

#### **Task (Tarea)**
```typescript
interface Task {
  id: string;                    // Identificador único
  code: string;                  // Código de tarea (P035, P036...)
  name: string;                  // Nombre de la tarea
  effortBase: number;            // Esfuerzo base antes de multiplicadores
  priority: Priority;            // 'Alta' | 'Media' | 'Baja'
  team: string;                  // ID del equipo responsable
  assignedUsers: string[];       // Usuarios asignados

  // Workflow multi-equipo
  taskType?: TaskType;           // 'development' | 'review' | 'stabilization'
  parentTaskId?: string;         // Tarea padre si es derivada
  teamEfforts: Record<string, TaskTeamEffort>; // Configuración por equipo

  // Dependencias
  dependsOn?: string[];          // IDs de tareas prerequisito
  canStartInParallel?: boolean;  // Puede ejecutarse en paralelo
  interruptsCurrent?: boolean;   // Interrumpe tareas en curso

  // Calculados
  effortByUser?: Record<string, number>; // Esfuerzo por usuario tras multiplicadores
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
}
```

#### **User (Usuario/Desarrollador)**
```typescript
interface User {
  id: string;              // Identificador único
  name: string;            // Nombre del usuario
  category: UserCategory;  // 'Senior' | 'Staff'
  color: string;           // Color hexadecimal para visualización
  vacations: Date[];       // Fechas de vacaciones
}
```

#### **Team (Equipo)**
```typescript
interface Team {
  id: string;              // Identificador (dev, quality, audit...)
  name: string;            // Nombre visible
  color: string;           // Color del equipo
  icon?: string;           // Icono opcional
  users: User[];           // Miembros del equipo
  config: TeamConfig;      // Configuración del equipo
}
```

#### **TaskTeamEffort (Configuración de Equipo por Tarea)**
```typescript
interface TaskTeamEffort {
  enabled: boolean;                    // ¿Equipo activo para esta tarea?

  // Tarea primaria
  reviewEffort: number;                // Días de esfuerzo base
  reviewAssignedUsers: string[];       // Usuarios asignados
  reviewTaskName?: string;             // Nombre personalizado (ej: "Auditoría")
  reviewPriority?: Priority;           // Prioridad específica

  // Tarea de seguimiento
  correctionEffort: number;
  correctionAssignedUsers: string[];
  correctionTaskName?: string;         // Nombre personalizado (ej: "Corrección")
  correctionPriority?: Priority;
  generateCorrection: boolean;         // ¿Generar tarea de seguimiento?
}
```

#### **Priority (Prioridad)**
```typescript
type Priority = 'Alta' | 'Media' | 'Baja';
```

#### **UserCategory (Categoría de Usuario)**
```typescript
type UserCategory = 'Senior' | 'Staff';

const EFFORT_MULTIPLIERS: Record<UserCategory, number> = {
  Senior: 1.0,   // Tiempo base
  Staff: 1.4,    // 40% más tiempo
};
```

### 1.4 Reglas de Negocio

#### **RN-01: Validación de Prioridades**
- Las prioridades válidas son: **Alta**, **Media**, **Baja**
- La validación es **case-insensitive**: "alta", "ALTA", "Alta" → 'Alta'
- Se eliminan **acentos y diacríticos**: "álta", "Altá" → 'Alta'
- Se eliminan **símbolos especiales**: "Alta!", "Alt@" → 'Alta'
- Valor por defecto: **'Media'** (si vacío, inválido o columna ausente)

#### **RN-02: Carga de Archivo**
- Formatos soportados: **Excel (.xlsx, .xls)** y **CSV (.csv)**
- Estructura esperada:
  - **Columna A**: Nombre de tarea (obligatorio)
  - **Columna B**: Esfuerzo en días (obligatorio, numérico > 0)
  - **Columna C**: Prioridad (opcional, default: 'Media')
- Primera fila se considera **encabezado** si contiene "tarea" (ignorada)
- Tamaño máximo: **5MB**

#### **RN-03: Expansión de Tareas Multi-Equipo**
1. **Para cada tarea base**:
   - Crear tareas de desarrollo (una por desarrollador asignado)
   - Para cada equipo habilitado:
     - Crear tarea(s) primaria(s) (revisión/auditoría/testing)
     - Si habilitado, crear tarea(s) de seguimiento (estabilización/corrección)

2. **Dependencias**:
   - Tareas primarias dependen del desarrollo completado
   - Tareas de seguimiento dependen de TODAS las tareas primarias del equipo
   - Garantiza orden lógico de ejecución

3. **Auto-asignación con balanceo**:
   - Si no hay usuarios asignados, usa round-robin
   - Distribuye carga equitativamente entre miembros del equipo
   - Actualiza workload por cada asignación

#### **RN-04: Algoritmo de Planificación**
1. **Ordenar tareas por prioridad**:
   - Orden: Alta (1) → Media (2) → Baja (3)
   - Aplica a tareas de todos los equipos

2. **Para cada tarea (en orden)**:
   - Verificar dependencias (todas completadas)
   - Seleccionar usuario con **menor carga total** de días
   - Asignar tarea desde su `nextDate` disponible
   - Calcular `endDate` usando días laborables (RN-05)
   - Actualizar carga y `nextDate` del usuario

3. **Balanceo de carga**:
   - Distribución equitativa entre usuarios de cada equipo
   - Respeta disponibilidad individual y vacaciones

#### **RN-05: Días Laborables**
- **No se cuentan como días de trabajo**:
  - Sábados (día 6)
  - Domingos (día 0)
  - Días en vacaciones del usuario asignado

- **Ejemplo**: Tarea de 5 días iniciando Jueves
  - Jueves (1), Viernes (2), Lunes (3), Martes (4), Miércoles (5)
  - No cuenta: Sábado, Domingo

#### **RN-06: Gestión de Usuarios y Equipos**
- Nombre por defecto: "Usuario N" (N = número secuencial)
- Color asignado de paleta predefinida (rotación circular)
- Vacaciones múltiples por usuario (array de fechas)
- Mínimo 1 usuario requerido para planificar
- **Categoría obligatoria**: Senior o Staff (afecta multiplicador de esfuerzo)
- **Equipos**: Usuarios pueden pertenecer a múltiples equipos

#### **RN-07: Multiplicadores de Categoría**
- **Senior**: Multiplicador 1.0x (tiempo base)
- **Staff**: Multiplicador 1.4x (40% más tiempo)
- Aplica a TODOS los equipos (desarrollo, revisión, auditoría, etc.)
- Cálculo: `effortFinal = effortBase * multiplier`
- Redondeo: Siempre hacia arriba (ceil)

#### **RN-08: Edición de Prioridades**
- Prioridades editables desde UI en **cualquier momento**
- Al cambiar prioridad:
  - Se actualiza el estado de tareas
  - Se limpia la planificación actual
  - Requiere re-ejecutar "Planificar"
- Cambio en tiempo real mediante dropdown
- Cada equipo puede tener prioridad independiente para su fase

#### **RN-09: Configuración Dinámica de Workflow**
- Por cada tarea y equipo, se puede configurar:
  - **Habilitar/Deshabilitar**: Checkbox para activar el equipo
  - **Nombre de tarea**: Personalizable (Auditoría, Testing, Code Review, etc.)
  - **Prioridad**: Independiente de la tarea base
  - **Esfuerzo**: Ajustable en días (acepta decimales 0.5)
  - **Usuarios**: MultiSelect o auto-asignación
  - **Generar seguimiento**: Checkbox para habilitar tarea correctiva

#### **RN-10: Exportación**
- Genera archivo Excel con 2 hojas:
  1. **"Diagrama Gantt"**: Matriz visual con barras (███)
     - Columnas: Tarea | Usuario | Inicio | Fin | Días | [Fechas del proyecto]
  2. **"Resumen"**: Estadísticas del proyecto
     - Fecha generación
     - Total tareas, fecha inicio/fin proyecto
     - Resumen por usuario: Tareas | Días totales
- Incluye prioridades finales (tras ediciones)

### 1.5 Casos de Uso

#### **CU-01: Cargar Tareas**
**Actor**: Usuario
**Flujo**:
1. Usuario hace click en "Cargar Archivo"
2. Selecciona archivo Excel/CSV
3. Sistema valida formato y tamaño
4. Sistema parsea archivo usando RN-01
5. Sistema muestra tareas con prioridades
6. Sistema limpia planificación previa

**Postcondición**: Tareas cargadas en estado sin asignar

#### **CU-02: Configurar Usuarios**
**Actor**: Usuario
**Flujo**:
1. Usuario hace click en "Configuración"
2. Sistema muestra panel de usuarios
3. Usuario agrega/edita/elimina usuarios
4. Usuario configura vacaciones por usuario
5. Sistema valida fecha de inicio del proyecto

**Postcondición**: Usuarios configurados listos para planificación

#### **CU-03: Editar Prioridad de Tarea**
**Actor**: Usuario
**Flujo**:
1. Usuario visualiza tabla de tareas
2. Usuario hace click en dropdown de prioridad
3. Usuario selecciona nueva prioridad (Alta/Media/Baja)
4. Sistema actualiza prioridad inmediatamente
5. Sistema limpia planificación (requiere replantificar)

**Postcondición**: Tarea con nueva prioridad, planificación obsoleta

#### **CU-04: Planificar Proyecto**
**Actor**: Usuario
**Flujo**:
1. Usuario hace click en "Planificar"
2. Sistema valida: tareas > 0 && usuarios > 0
3. Sistema ejecuta algoritmo de planificación (RN-03)
4. Sistema calcula fechas usando RN-04
5. Sistema muestra:
   - Diagrama de Gantt
   - Tabla de tareas con asignaciones
   - Resumen por usuario con contador de prioridades

**Postcondición**: Proyecto planificado y visualizado

#### **CU-05: Exportar a Excel**
**Actor**: Usuario
**Flujo**:
1. Usuario hace click en "Descargar Excel"
2. Sistema valida: scheduledTasks > 0
3. Sistema genera archivo según RN-07
4. Sistema descarga: `Gantt_EY_YYYY-MM-DD.xlsx`

**Postcondición**: Archivo Excel descargado con planificación

### 1.6 Validaciones y Restricciones

| Validación | Descripción | Mensaje de Error |
|------------|-------------|------------------|
| **VAL-01** | Archivo no seleccionado | "No se encontraron tareas válidas" |
| **VAL-02** | Formato no soportado | "Solo archivos CSV o Excel" |
| **VAL-03** | Archivo muy grande (>5MB) | "Archivo muy grande (máx 5MB)" |
| **VAL-04** | Sin tareas válidas en archivo | "No se encontraron tareas válidas" |
| **VAL-05** | Sin usuarios configurados | "Necesitas tareas y usuarios" |
| **VAL-06** | Sin tareas para exportar | "No hay tareas para exportar" |
| **VAL-07** | Error al leer archivo | "Error al leer archivo" |
| **VAL-08** | Error procesando Excel | "Error procesando Excel" |
| **VAL-09** | Error al exportar | "Error al exportar a Excel" |

---

## 2. HERRAMIENTAS Y TECNOLOGÍAS

### 2.1 Stack Tecnológico

#### **Frontend Framework**
- **React 19.1.1**: Librería principal para construcción de UI
- **TypeScript 4.9.5**: Superset de JavaScript con tipado estático
- **React Scripts 5.0.1**: Configuración base de Create React App

#### **Compilación y Build**
- **CRACO 7.1.0**: Create React App Configuration Override
  - Permite path aliases sin eject
  - Configuración webpack personalizada

#### **Estilos**
- **Tailwind CSS**: Framework CSS utility-first
- **Inline Styles**: Para colores dinámicos de EY branding

#### **Iconos**
- **lucide-react 0.544.0**: Librería de iconos SVG moderna

#### **Manejo de Archivos**
- **XLSX 0.18.5**: Lectura y escritura de archivos Excel
- **xlsx-style 0.8.13**: Extensión para estilos en Excel

### 2.2 Herramientas de Desarrollo

#### **Linting y Formateo**
- **ESLint**: Análisis estático de código
  - Plugin: `eslint-plugin-react`
  - Plugin: `eslint-plugin-react-hooks`
  - Plugin: `eslint-plugin-prettier`
- **Prettier 3.6.2**: Formateador de código automático

#### **Testing**
- **Jest**: Framework de testing (incluido en React Scripts)
- **@testing-library/react 16.3.0**: Testing de componentes React
- **@testing-library/jest-dom 6.8.0**: Matchers adicionales para Jest
- **@testing-library/user-event 14.6.1**: Simulación de interacciones

#### **Servidor Local**
- **serve 14.2.5**: Servidor estático para preview de producción

### 2.3 Tipos TypeScript

- **@types/react 19.1.13**
- **@types/react-dom 19.1.9**
- **@types/jest 30.0.0**
- **@types/node 24.3.1**

### 2.4 Control de Versiones

- **Git**: Sistema de control de versiones
- **GitHub**: Repositorio remoto
  - URL: `https://github.com/davidenko92/gantt-ey-app.git`
  - Rama principal: `master`
  - Rama de desarrollo: `dev`

### 2.5 Configuración de Proyecto

#### **package.json - Scripts**
```json
{
  "start": "craco start",           // Dev server con hot reload
  "dev": "npm start",                // Alias de start
  "build": "craco build",            // Build de producción
  "preview": "serve -s build -l 3000", // Preview local del build
  "test": "craco test",              // Tests en watch mode
  "test:coverage": "craco test --coverage --watchAll=false",
  "lint": "eslint \"src/**/*.{ts,tsx}\"",
  "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --fix",
  "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
  "typecheck": "tsc --noEmit"       // Verificación de tipos
}
```

#### **Path Aliases**
Configurados en `tsconfig.json` y `craco.config.js`:
```
@components → src/components
@features   → src/features
@hooks      → src/hooks
@types      → src/types.ts
```

### 2.6 Convenciones de Código

#### **Estructura de Componentes**
```typescript
import React from 'react';
import { Props } from '@types';

interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};
```

#### **Custom Hooks**
```typescript
import { useState, useCallback } from 'react';

interface UseHookOptions {
  // Options
}

export const useHook = ({ option1 }: UseHookOptions) => {
  // Hook logic
  return {
    // Exported values
  };
};
```

#### **Servicios**
```typescript
// Pure functions
export const serviceFunction = (input: Type): ReturnType => {
  // Business logic
  return result;
};
```

---

## 3. ESTRUCTURA DEL PROYECTO

### 3.1 Árbol de Directorios

```
gantt-ey-app/
│
├── public/                          # Archivos estáticos
│   ├── index.html
│   └── favicon.ico
│
├── src/                             # Código fuente
│   │
│   ├── components/                  # Componentes UI reutilizables
│   │   └── ui/
│   │       ├── EYLogo.tsx          # Logo de EY (size prop)
│   │       ├── Notification.tsx     # Sistema de notificaciones
│   │       └── Notification.test.tsx # Tests de Notification
│   │
│   ├── features/                    # Features por dominio
│   │   └── gantt/                  # Feature de planificación Gantt
│   │       │
│   │       ├── components/          # Componentes específicos de Gantt
│   │       │   ├── ConfigPanel.tsx  # Panel de configuración
│   │       │   ├── GanttChart.tsx   # Diagrama de Gantt visual
│   │       │   ├── TaskTable.tsx    # Tabla de tareas
│   │       │   └── UserSummary.tsx  # Resumen por usuario
│   │       │
│   │       ├── constants.ts         # Constantes del feature
│   │       │   ├── EY_COLORS        # Paleta de colores EY
│   │       │   └── DEFAULT_USER_COLORS # Colores por defecto
│   │       │
│   │       ├── services/            # Lógica de negocio
│   │       │   ├── csvProcessor.ts  # Parser CSV/Excel → Task[]
│   │       │   ├── csvProcessor.test.ts
│   │       │   ├── excelExporter.ts # Exportador Task[] → Excel
│   │       │   └── excelExporter.test.ts
│   │       │
│   │       └── utils/               # Utilidades del feature
│   │           ├── dateUtils.ts     # Cálculo de días laborables
│   │           └── dateUtils.test.ts
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useFileUpload.ts        # Manejo de carga de archivos
│   │   ├── useNotification.ts       # Sistema de notificaciones
│   │   ├── useNotification.test.ts
│   │   └── useTaskScheduler.ts      # Algoritmo de planificación
│   │
│   ├── assets/                      # Recursos estáticos
│   │   └── ey_logo_icon_171166.ico
│   │
│   ├── types.ts                     # Tipos globales centralizados
│   ├── App.tsx                      # Componente principal (284 líneas)
│   ├── App.css                      # Estilos globales
│   ├── index.tsx                    # Punto de entrada React
│   ├── index.css                    # Estilos Tailwind
│   ├── custom.d.ts                  # Declaraciones TypeScript custom
│   ├── setupTests.ts                # Configuración Jest
│   └── react-app-env.d.ts          # Tipos de React App
│
├── .eslintrc.json                   # Configuración ESLint
├── .prettierrc                      # Configuración Prettier
├── .gitignore                       # Archivos ignorados por Git
├── craco.config.js                  # Configuración CRACO/webpack
├── tsconfig.json                    # Configuración TypeScript
├── tailwind.config.js               # Configuración Tailwind CSS
├── postcss.config.js                # Configuración PostCSS
├── package.json                     # Dependencias y scripts
├── package-lock.json                # Lock de dependencias
├── README.md                        # Documentación del proyecto
├── claude.md                        # Estado del refactoring
└── documentofuncional.md            # Este documento
```

### 3.2 Descripción de Módulos Principales

#### **App.tsx** (284 líneas, reducido 65%)
- Componente raíz de la aplicación
- Gestiona estado global:
  - `tasks[]`: Tareas cargadas del archivo
  - `scheduledTasks[]`: Tareas planificadas con asignaciones
  - `users[]`: Usuarios/desarrolladores configurados
  - `startDate`: Fecha de inicio del proyecto
- Funciones principales:
  - `updateTaskPriority()`: Actualiza prioridad y limpia planificación
  - `addUser()`, `updateUser()`, `removeUser()`: CRUD de usuarios
  - `scheduleTasksAutomatically()`: Trigger de planificación
  - `exportToExcel()`: Descarga archivo Excel

#### **csvProcessor.ts** (36 líneas)
- Responsabilidad: Parsear archivos CSV/Excel a tareas
- Funciones:
  - `normalizeString()`: Limpia y normaliza strings (acentos, case)
  - `isValidPriority()`: Valida y mapea prioridades
  - `parseCsvToTasks()`: Parser principal
- Reglas:
  - Columnas separadas por: `,`, `;`, o `\t`
  - Skip primera fila si contiene "tarea"
  - Validación robusta de prioridades (RN-01)

#### **useTaskScheduler.ts** (60 líneas)
- Responsabilidad: Algoritmo de planificación automática
- Implementa RN-03 y RN-04
- Usa `dateUtils.addWorkingDays()` para fechas
- Retorna tareas con: `assignedUser`, `startDate`, `endDate`

#### **TaskTable.tsx** (95 líneas)
- Tabla responsive con 4 columnas:
  1. Nombre de tarea
  2. Esfuerzo en días
  3. **Prioridad (dropdown editable)** ⭐
  4. Usuario asignado (con color)
- Dropdown cambia color según prioridad seleccionada
- Callback `onUpdatePriority` para cambios

#### **UserSummary.tsx** (90 líneas)
- Grid de tarjetas por usuario
- Muestra:
  - Total tareas asignadas
  - Total días de trabajo
  - **Badges por prioridad** (3 Alta, 4 Media, 1 Baja) ⭐
  - Días de vacaciones
- Colores: Rojo (Alta), Naranja (Media), Verde (Baja)

#### **GanttChart.tsx** (110 líneas)
- Diagrama visual tipo Gantt
- Header con fechas del proyecto
- Barras de tareas con colores de usuario
- Leyenda de usuarios al final

#### **ConfigPanel.tsx** (213 líneas)
- Panel complejo de configuración
- Secciones:
  1. Selector de fecha de inicio
  2. Gestión de usuarios (add, edit, remove, color picker)
  3. Gestión de vacaciones por usuario (add, remove)
- Validaciones:
  - No duplicar fechas de vacaciones
  - Ordenar vacaciones cronológicamente

### 3.3 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│                    (Estado Global)                          │
│  • tasks[]                                                  │
│  • scheduledTasks[]                                         │
│  • users[]                                                  │
│  • startDate                                                │
└───────────┬─────────────────────────────────────────────────┘
            │
            ├──► useFileUpload ──► csvProcessor ──► tasks[]
            │      (hook)           (service)
            │
            ├──► TaskTable ──► updateTaskPriority() ──► tasks[]
            │    (component)    (callback)
            │
            ├──► useTaskScheduler ──► dateUtils ──► scheduledTasks[]
            │      (hook)              (util)
            │
            ├──► GanttChart ──► (visualización)
            ├──► TaskTable ──► (visualización + edición)
            ├──► UserSummary ──► (visualización)
            └──► ConfigPanel ──► (configuración)
                    │
                    └──► addUser(), updateUser(), removeUser()
```

### 3.4 Patrones de Diseño Utilizados

#### **1. Feature-Based Architecture**
- Carpetas organizadas por feature (gantt)
- Cada feature contiene: components, services, utils, constants

#### **2. Custom Hooks Pattern**
- Encapsulación de lógica reutilizable
- Ejemplos: `useNotification`, `useFileUpload`, `useTaskScheduler`

#### **3. Service Layer Pattern**
- Servicios como funciones puras
- Separación de lógica de negocio de UI
- Ejemplos: `csvProcessor`, `excelExporter`, `dateUtils`

#### **4. Component Composition**
- Componentes pequeños y especializados
- Props para comunicación padre-hijo
- Callbacks para comunicación hijo-padre

#### **5. Presentational vs Container Pattern**
- App.tsx: Container (maneja estado y lógica)
- TaskTable, GanttChart: Presentational (reciben props, renderizan)

### 3.5 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Líneas de código (src/)** | ~1,500 |
| **Componentes React** | 7 |
| **Custom Hooks** | 3 |
| **Servicios** | 2 |
| **Utilidades** | 1 |
| **Tests** | 5 archivos |
| **Cobertura de tests** | ~80% |
| **Reducción de App.tsx** | 65% (808 → 284 líneas) |
| **Archivos de configuración** | 6 |
| **Dependencias** | 13 prod + 9 dev |

### 3.6 Archivos de Configuración

#### **.eslintrc.json**
```json
{
  "extends": [
    "react-app",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

#### **.prettierrc**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

#### **craco.config.js**
```javascript
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@types': path.resolve(__dirname, 'src/types.ts'),
    },
  },
};
```

#### **tsconfig.json** (extract)
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "esnext"],
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@components/*": ["components/*"],
      "@features/*": ["features/*"],
      "@hooks/*": ["hooks/*"],
      "@types": ["types.ts"]
    }
  }
}
```

---

## 4. ANEXOS

### 4.1 Glosario

| Término | Definición |
|---------|------------|
| **CRACO** | Create React App Configuration Override - Tool para customizar webpack sin eject |
| **Path Alias** | Shortcut de importación (ej: `@components/...` en lugar de `../../components/...`) |
| **Días Laborables** | Días de semana (Lunes-Viernes) excluyendo vacaciones |
| **Workload** | Carga de trabajo acumulada de un usuario (en días) |
| **Scheduling** | Proceso de asignación automática de tareas a usuarios |
| **Balanceo de Carga** | Distribución equitativa de trabajo entre usuarios |

### 4.2 Referencias

- **React Documentation**: https://react.dev
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **XLSX Library**: https://sheetjs.com
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro

### 4.3 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-10-10 | Documento inicial - Sistema de prioridades híbrido implementado |
| 2.0 | 2025-10-13 | Sistema multi-equipo con workflow configurable - Mejoras visuales en Gantt |

---

## 5. NUEVAS FUNCIONALIDADES v2.0

### 5.1 Sistema Multi-Equipo

**Descripción**: Soporte completo para múltiples equipos con workflows configurables

**Componentes Nuevos**:
- `taskExpander.ts`: Expande tareas base en tareas por equipo con dependencias
- `effortCalculator.ts`: Calcula esfuerzos con multiplicadores de categoría
- `MultiSelect.tsx`: Componente de selección múltiple de usuarios

**Archivos Modificados**:
- `types.ts`: Nuevas interfaces Team, TaskTeamEffort, TeamConfig
- `TaskTable.tsx`: UI de configuración dinámica por equipo
- `UserSummary.tsx`: Agrupación por equipos, fechas de vacaciones
- `GanttChart.tsx`: Visualización solo de días laborables

### 5.2 Configuración Dinámica de Tareas

**Implementación**: Cada tarea puede configurarse independientemente por equipo

**Campos Configurables**:
- ✅ Habilitar/deshabilitar equipo
- 📝 Nombre de tarea personalizado
- 🎯 Prioridad específica
- ⏱️ Esfuerzo ajustable
- 👥 Asignación de usuarios
- 🔄 Generación de tarea de seguimiento

### 5.3 Mejoras Visuales

**Gantt Chart**:
- Solo muestra días laborables (Lun-Vie)
- Mejor uso del espacio horizontal
- Posicionamiento preciso con Map de fechas

**User Summary**:
- Display de fechas de vacaciones específicas (DD/MM)
- Agrupación visual por equipos
- Contadores de tipos de tarea (Dev, Rev, Estab)

### 5.4 Dependencias Inteligentes

**Implementación**:
- Tareas primarias dependen del desarrollo
- Tareas de seguimiento dependen de TODAS las tareas primarias
- Evita inicio prematuro de correcciones

**Ejemplo**:
```typescript
// P035 - Calidad tiene 3 revisores
reviewUsers = ['Ana', 'Carlos', 'María'];

// La estabilización depende de las 3 revisiones
dependsOn: [
  'P035-quality-review-Ana',
  'P035-quality-review-Carlos',
  'P035-quality-review-María'
];
```

---

**Fin del Documento Funcional**
