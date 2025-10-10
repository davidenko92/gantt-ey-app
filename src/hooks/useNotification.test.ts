import { renderHook, act } from '@testing-library/react';
import { useNotification } from './useNotification';

// Mock setTimeout
jest.useFakeTimers();

describe('useNotification', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Estado inicial', () => {
    it('debe inicializar con notification null', () => {
      const { result } = renderHook(() => useNotification());

      expect(result.current.notification).toBeNull();
    });

    it('debe proveer funciones notify y closeNotification', () => {
      const { result } = renderHook(() => useNotification());

      expect(typeof result.current.notify).toBe('function');
      expect(typeof result.current.closeNotification).toBe('function');
    });
  });

  describe('notify', () => {
    it('debe crear notificación con tipo "success"', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Operación exitosa', 'success');
      });

      expect(result.current.notification).toEqual({
        message: 'Operación exitosa',
        type: 'success',
      });
    });

    it('debe crear notificación con tipo "error"', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Ha ocurrido un error', 'error');
      });

      expect(result.current.notification).toEqual({
        message: 'Ha ocurrido un error',
        type: 'error',
      });
    });

    it('debe usar "info" como tipo por defecto', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Mensaje informativo');
      });

      expect(result.current.notification).toEqual({
        message: 'Mensaje informativo',
        type: 'info',
      });
    });

    it('debe limpiar la notificación después de 5 segundos', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Test message', 'info');
      });

      expect(result.current.notification).not.toBeNull();

      // Avanzar tiempo 4999ms - todavía debe estar visible
      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(result.current.notification).not.toBeNull();

      // Avanzar 1ms más (total 5000ms) - debe limpiarse
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.notification).toBeNull();
    });
  });

  describe('closeNotification', () => {
    it('debe cerrar la notificación manualmente', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Test', 'info');
      });

      expect(result.current.notification).not.toBeNull();

      act(() => {
        result.current.closeNotification();
      });

      expect(result.current.notification).toBeNull();
    });

    it('debe poder cerrar antes de que expire el timeout', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Test', 'info');
      });

      expect(result.current.notification).not.toBeNull();

      // Cerrar manualmente después de 2 segundos
      act(() => {
        jest.advanceTimersByTime(2000);
        result.current.closeNotification();
      });

      expect(result.current.notification).toBeNull();
    });
  });

  describe('Múltiples notificaciones', () => {
    it('debe reemplazar notificación existente con una nueva', () => {
      const { result } = renderHook(() => useNotification());

      act(() => {
        result.current.notify('Primera notificación', 'info');
      });

      expect(result.current.notification?.message).toBe('Primera notificación');

      act(() => {
        result.current.notify('Segunda notificación', 'success');
      });

      expect(result.current.notification?.message).toBe('Segunda notificación');
      expect(result.current.notification?.type).toBe('success');
    });
  });
});
