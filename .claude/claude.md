# Reglas de Desarrollo para el Proyecto Gantt EY

## 1. Análisis de Impacto Obligatorio

**IMPORTANTE**: Antes de realizar cualquier cambio solicitado por el usuario, debes:

1. **Analizar todos los flujos del proyecto afectados**
   - Identificar qué componentes, servicios y hooks dependen del código a modificar
   - Revisar las interfaces y tipos que se verán impactados
   - Verificar todos los lugares donde se usa la funcionalidad a cambiar

2. **Documentar el impacto**
   - Listar explícitamente qué archivos necesitan actualizarse
   - Explicar las consecuencias del cambio en cada flujo
   - Identificar posibles efectos secundarios

3. **Solo después del análisis**, proceder con la implementación
   - Actualizar todos los archivos afectados de forma coherente
   - Asegurar que no queden referencias rotas
   - Verificar que la compilación funcione correctamente

### Ejemplo de Análisis:

```
Usuario solicita: "Agregar estrategia de ordenación de tareas"

Análisis de impacto:
1. types.ts → Nuevo tipo SchedulingStrategy
2. useTaskScheduler.ts → Parámetro adicional en scheduleTasks()
3. App.tsx → Estado para la estrategia + UI selector + pasar valor al scheduler
4. Dependencias: Ningún componente hijo necesita cambios (cambio contenido en scheduler)

Flujos afectados:
- Flujo de planificación: scheduleTasks() ahora recibe estrategia
- UI: Nuevo selector en panel de control
- Estado global: Nueva variable schedulingStrategy

Proceder con implementación ✓
```

## 2. Principios de Calidad de Código

### 2.1 Inmutabilidad
- NUNCA mutar arrays o objetos directamente
- Usar spread operator (...) para copias
- Todas las funciones deben ser puras cuando sea posible

### 2.2 Tipos y Validación
- Todo debe estar fuertemente tipado con TypeScript
- No usar `any` excepto cuando sea absolutamente necesario
- Validar entradas antes de procesarlas

### 2.3 Logs de Depuración
- NO dejar console.log() en código de producción
- Eliminar todos los logs antes de commits
- Usar comentarios claros en lugar de logs

### 2.4 Nombres Descriptivos
- Usar nombres que expliquen la intención
- Funciones: verbos descriptivos (calculateEndDate, validateDependencies)
- Variables: sustantivos descriptivos (scheduledTasks, userWorkload)

## 3. Arquitectura del Proyecto

### 3.1 Estructura de Directorios
```
src/
  ├── components/ui/        # Componentes UI reutilizables
  ├── features/gantt/       # Feature del diagrama de Gantt
  │   ├── components/       # Componentes específicos de Gantt
  │   ├── services/         # Lógica de negocio
  │   └── utils/            # Utilidades y helpers
  ├── hooks/                # Custom React hooks
  └── types.ts              # Tipos globales
```

### 3.2 Separación de Responsabilidades
- **Componentes**: Solo UI y eventos
- **Hooks**: Lógica reutilizable y estado
- **Services**: Lógica de negocio pura (sin React)
- **Utils**: Funciones helper sin estado

## 4. Flujos Críticos del Sistema

### 4.1 Flujo de Planificación
```
Usuario carga archivo → parseExcel → setTasks
Usuario configura equipos/usuarios
Usuario selecciona estrategia
Usuario click "Planificar" →
  expandTasksWithTeams →
  applyChildLockDependencies →
  topologicalSort(strategy) →
  scheduleTasks (loop) →
  recalculateTaskDates →
  validateTaskDependencies →
  setScheduledTasks
```

### 4.2 Flujo de Dependencias
```
Tarea original →
  Expansión (dev/review/correction) →
  Child-lock (ancestros esperan descendientes) →
  Topological sort (orden respetando deps) →
  Estrategia de ordenación (mismo nivel) →
  Scheduling (asignación de fechas) →
  Recalcular fechas (ajuste final) →
  Validación (verificar deps respetadas)
```

### 4.3 Flujo de Fechas
```
Fecha inicio + duración →
  addBusinessDays (solo días hábiles) →
  getNextWorkingDay (saltar fines de semana) →
  dateToPosition (mapear a columnas Gantt) →
  Renderizar barras
```

## 5. Testing y Validación

### 5.1 Antes de Commit
- [ ] Compilación exitosa sin warnings
- [ ] Todos los console.log() eliminados
- [ ] Código formateado correctamente
- [ ] Tipos correctos (no `any`)
- [ ] Tests unitarios pasan (si existen)

### 5.2 Validaciones en Código
- Validar dependencias circulares
- Validar que usuarios existan
- Validar que fechas sean working days
- Validar que dependencias se respeten

## 6. Git y Commits

### 6.1 Mensajes de Commit
Formato:
```
tipo: descripción corta

- Detalle del cambio
- Otro detalle
- Impacto en flujos

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### 6.2 Commits Atómicos
- Un commit por funcionalidad completa
- Incluir TODOS los archivos relacionados
- No dejar el proyecto en estado roto

## 7. Documentación de Código

### 7.1 Comentarios JSDoc
```typescript
/**
 * Calcula la fecha de fin basada en duración y días hábiles
 * @param startDate - Fecha de inicio
 * @param duration - Duración en días hábiles
 * @returns Fecha de fin (excluyendo fines de semana)
 */
function calculateEndDate(startDate: Date, duration: number): Date {
  // Implementation
}
```

### 7.2 Comentarios Inline
- Explicar el "por qué", no el "qué"
- Documentar decisiones de diseño importantes
- Marcar TODOs y FIXMEs claramente

## 8. Checklist de Cambios Mayores

Cuando hagas un cambio significativo:

- [ ] Análisis de impacto completado
- [ ] Todos los flujos identificados
- [ ] Todos los archivos actualizados
- [ ] Tipos actualizados
- [ ] UI actualizada (si aplica)
- [ ] Tests actualizados (si existen)
- [ ] Documentación actualizada
- [ ] Código compilado exitosamente
- [ ] Logs de debug eliminados
- [ ] Commit creado con mensaje descriptivo

---

**Nota Final**: Estas reglas están diseñadas para mantener la calidad y consistencia del código. Cuando tengas duda sobre cómo proceder, sigue estas reglas.
