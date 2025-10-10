# Refactorización Gantt EY App - Progreso

## Estado Actual
**Fecha**: 2025-10-10
**Rama**: master
**Archivo principal**: `src/App.tsx` (actualmente ~550 líneas, originalmente ~808 líneas)

---

## ✅ FASE 1: CONFIGURACIÓN DE HERRAMIENTAS (COMPLETADA)

### Instalaciones
- [x] ESLint + plugins React/TypeScript
- [x] Prettier
- [x] serve (para testing de producción)

### Archivos creados
- [x] `.eslintrc.json` - Configuración ESLint
- [x] `.prettierrc` - Configuración Prettier
- [x] `.gitignore` - Actualizado con build/, coverage/, .env

### Scripts package.json añadidos
```json
"lint": "eslint src --ext .ts,.tsx",
"lint:fix": "eslint src --ext .ts,.tsx --fix",
"format": "prettier --write \"src/**/*.{ts,tsx,json,css}\"",
"format:check": "prettier --check \"src/**/*.{ts,tsx,json,css}\"",
"serve": "serve -s build"
```

---

## ✅ FASE 2: MODULARIZACIÓN (EN PROGRESO - 85% completada)

### Estructura de carpetas creada
```
src/
├── components/
│   └── ui/
│       ├── EYLogo.tsx ✅
│       └── Notification.tsx ✅
├── features/
│   └── gantt/
│       ├── components/
│       │   └── GanttChart.tsx ✅
│       ├── constants.ts ✅
│       ├── services/
│       │   ├── csvProcessor.ts ✅
│       │   └── excelExporter.ts ✅
│       └── utils/
│           └── dateUtils.ts ✅
├── hooks/
│   ├── useFileUpload.ts ✅
│   ├── useNotification.ts ✅
│   └── useTaskScheduler.ts ✅
└── types.ts ✅
```

### Módulos extraídos

#### 1. Constantes y tipos (✅ Completado)
- **Archivo**: `src/types.ts`
- **Contenido**: Interfaces `Task`, `User`
- **Archivo**: `src/features/gantt/constants.ts`
- **Contenido**: `EY_COLORS`, `DEFAULT_USER_COLORS`

#### 2. Componentes UI (✅ Completado)
- **EYLogo** (`src/components/ui/EYLogo.tsx`)
  - Props: `size?: number`
  - Renderiza el logo de EY con SVG

- **Notification** (`src/components/ui/Notification.tsx`)
  - Props: `message: string`, `type: 'success' | 'error' | 'info'`, `onClose: () => void`
  - Notificaciones con auto-cierre

#### 3. Utilidades (✅ Completado)
- **dateUtils** (`src/features/gantt/utils/dateUtils.ts`)
  - Funciones: `isWeekend()`, `addWorkingDays()`
  - Tests: 100% coverage ✅

#### 4. Servicios (✅ Completado)
- **csvProcessor** (`src/features/gantt/services/csvProcessor.ts`)
  - Función: `parseCsvToTasks(csvText: string): Task[]`
  - Tests: 100% coverage ✅

- **excelExporter** (`src/features/gantt/services/excelExporter.ts`)
  - Función: `exportToExcel(options: ExportOptions): string`
  - Tests: Omitidos (problemas con mock de XLSX)

#### 5. Custom Hooks (✅ Completado)
- **useNotification** (`src/hooks/useNotification.ts`)
  - Retorna: `{ notification, notify, closeNotification }`
  - Tests: 100% coverage ✅

- **useFileUpload** (`src/hooks/useFileUpload.ts`)
  - Props: `onTasksLoaded`, `onError`
  - Retorna: `{ uploadedFile, handleFileUpload, clearFile }`
  - Soporta CSV y Excel (convierte Excel a CSV internamente)

- **useTaskScheduler** (`src/hooks/useTaskScheduler.ts`)
  - Props: `onScheduled`, `onError`
  - Retorna: `{ scheduleTasks }`
  - Algoritmo: Balanceo de carga + skip weekends + vacaciones

#### 6. Componentes de features (⚠️ EN PROGRESO)
- **GanttChart** (`src/features/gantt/components/GanttChart.tsx`) ✅
  - Props: `scheduledTasks: Task[]`, `users: User[]`
  - Renderiza diagrama Gantt visual
  - **PENDIENTE**: Reemplazar llamada en App.tsx línea 543

- **ConfigPanel** (❌ PENDIENTE)
- **TaskTable** (❌ PENDIENTE)
- **UserSummary** (❌ PENDIENTE)
- **FileUploadPanel** (❌ PENDIENTE)

---

## ⏳ PRÓXIMOS PASOS INMEDIATOS

### 1. Completar extracción GanttChart
```tsx
// En App.tsx línea 543, reemplazar:
{renderGantt()}

// Por:
<GanttChart scheduledTasks={scheduledTasks} users={users} />
```

### 2. Extraer ConfigPanel
Incluye:
- Selector de fecha de inicio
- Gestión de usuarios (add, update, remove)
- Gestión de vacaciones por usuario

### 3. Extraer TaskTable
Muestra tabla de tareas cargadas con:
- Nombre de tarea
- Esfuerzo en días
- Usuario asignado (si está planificado)

### 4. Extraer UserSummary
Grid de resumen por usuario:
- Tareas asignadas
- Días totales
- Días de vacaciones

### 5. Extraer FileUploadPanel
Panel de control con botones:
- Cargar archivo
- Configuración
- Planificar
- Descargar Excel

---

## ❌ FASE 3: PATH ALIASES (PENDIENTE)

### Instalar CRACO
```bash
npm install @craco/craco --save-dev
```

### Configurar tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@components/*": ["components/*"],
      "@features/*": ["features/*"],
      "@hooks/*": ["hooks/*"],
      "@utils/*": ["utils/*"],
      "@types": ["types.ts"]
    }
  }
}
```

### Crear craco.config.js
```js
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types.ts')
    }
  }
};
```

### Actualizar package.json scripts
```json
{
  "start": "craco start",
  "build": "craco build",
  "test": "craco test"
}
```

---

## ❌ FASE 4: LIMPIEZA DE DEPENDENCIAS (PENDIENTE)

### Mover a devDependencies
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Remover dependencias no usadas
```bash
npm uninstall web-vitals
```

---

## ❌ FASE 5: TESTS ADICIONALES (PENDIENTE)

### Tests por crear
- [ ] `useFileUpload.test.ts`
- [ ] `useTaskScheduler.test.ts`
- [ ] `excelExporter.test.ts` (si se resuelve problema con XLSX mock)
- [ ] `App.test.tsx` (test básico de renderizado)

---

## ❌ FASE 6: VALIDACIÓN Y SANITIZACIÓN (PENDIENTE)

### Validaciones a agregar

#### En useFileUpload
```typescript
// Validar tamaño de archivo (max 5MB)
if (file.size > 5 * 1024 * 1024) {
  onError('Archivo muy grande (máx 5MB)');
  return;
}
```

#### En csvProcessor
```typescript
// Sanitizar nombres de tarea
const sanitizeName = (name: string): string => {
  return name
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres peligrosos
    .slice(0, 100); // Limitar longitud
};
```

---

## ❌ FASE 7: VERIFICACIÓN FINAL (PENDIENTE)

### Comandos a ejecutar
```bash
# 1. Formatear código
npm run format

# 2. Verificar linting
npm run lint

# 3. Ejecutar tests
npm test

# 4. Verificar build de producción
npm run build

# 5. Probar build localmente
npm run serve
```

---

## 📊 MÉTRICAS DE PROGRESO

### Reducción de App.tsx
- **Original**: ~808 líneas
- **Actual**: ~550 líneas
- **Reducción**: ~258 líneas (32%)
- **Meta**: ~200-300 líneas (63-75% reducción)

### Archivos creados
- ✅ 13 archivos de código
- ✅ 4 archivos de tests
- ✅ 3 archivos de configuración

### Cobertura de tests
- dateUtils: 100% ✅
- csvProcessor: 100% ✅
- Notification: 100% ✅
- useNotification: 100% ✅
- excelExporter: 0% (omitido por problemas técnicos)

---

## 🔧 DECISIONES TÉCNICAS

### Arquitectura
- **Patrón**: Feature-based folder structure
- **Estado**: React Hooks (useState, useCallback)
- **Estilos**: Inline styles + Tailwind classes
- **Librería UI**: lucide-react para iconos

### Convenciones
- Componentes en PascalCase
- Hooks con prefijo `use`
- Servicios como funciones puras
- Props interfaces inline en componentes pequeños

### Flujo de datos
```
App.tsx
  ├─ useFileUpload → parseCsvToTasks → Task[]
  ├─ useTaskScheduler → dateUtils.addWorkingDays → ScheduledTask[]
  └─ exportGanttToExcel → XLSX → Archivo descargado
```

---

## 🐛 PROBLEMAS CONOCIDOS

### 1. Tests de excelExporter
- **Problema**: XLSX library tiene propiedades read-only que impiden mocking
- **Error**: `TS2540: Cannot assign to 'utils' because it is a read-only property`
- **Solución temporal**: Tests omitidos, confiar en tests manuales
- **Solución futura**: Wrapper alrededor de XLSX o usar librería alternativa

### 2. Imports de tipos duplicados
- App.tsx define interfaces Task y User localmente
- También existen en types.ts
- **Solución**: Pendiente migrar App.tsx a usar tipos centralizados

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Conversión Excel → CSV
El flujo actual para archivos Excel es:
1. FileReader lee el archivo como ArrayBuffer
2. XLSX.read() parsea el workbook
3. XLSX.utils.sheet_to_csv() convierte la primera hoja a CSV
4. parseCsvToTasks() procesa el CSV
5. Este diseño permite reutilizar toda la lógica de parsing CSV

### Algoritmo de scheduling
1. Inicializar workload de cada usuario
2. Para cada tarea:
   - Elegir usuario con menor carga total
   - Asignar tarea desde su nextDate
   - Calcular endDate con addWorkingDays() (skip weekends + vacaciones)
   - Actualizar workload del usuario

---

## 🚀 COMANDOS ÚTILES

### Desarrollo
```bash
npm start                 # Inicia dev server
npm test                  # Ejecuta tests en watch mode
npm run build            # Build de producción
npm run serve            # Sirve build localmente
```

### Calidad de código
```bash
npm run lint             # Verifica linting
npm run lint:fix         # Arregla problemas de linting
npm run format           # Formatea código
npm run format:check     # Verifica formato
```

### TypeScript
```bash
npx tsc --noEmit        # Verifica tipos sin compilar
```

---

## 📦 DEPENDENCIAS CLAVE

### Producción
- react: 19.1.1
- typescript: 4.9.5
- xlsx: Para manejo de Excel
- lucide-react: Iconos

### Desarrollo
- @testing-library/react
- @testing-library/jest-dom
- eslint + plugins
- prettier

---

## 🎯 OBJETIVOS DEL PROYECTO

1. ✅ Reducir complejidad de App.tsx
2. ⏳ Mejorar mantenibilidad (85% completado)
3. ⏳ Facilitar testing (60% completado)
4. ❌ Mejorar reutilización de código
5. ❌ Preparar para escalabilidad

---

## 📌 RECORDATORIOS

- ⚠️ No commitear hasta completar FASE 2
- ⚠️ Ejecutar tests antes de cada commit
- ⚠️ Verificar build de producción antes de merge
- ⚠️ Documentar cambios significativos en este archivo

---

**Última actualización**: 2025-10-10
**Actualizado por**: Claude Code
**Próxima sesión**: Completar extracción de componentes de FASE 2
