import { render, screen, fireEvent } from '@testing-library/react';
import { Notification } from './Notification';

describe('Notification', () => {
  describe('Renderizado básico', () => {
    it('debe renderizar el mensaje correctamente', () => {
      const mockOnClose = jest.fn();
      render(<Notification message="Test message" type="info" onClose={mockOnClose} />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('debe renderizar el botón de cierre', () => {
      const mockOnClose = jest.fn();
      render(<Notification message="Test" type="info" onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('×');
    });
  });

  describe('Estilos por tipo', () => {
    it('debe aplicar estilos verdes para tipo "success"', () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <Notification message="Success!" type="success" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('bg-green-50');
      expect(notification).toHaveClass('text-green-700');
      expect(notification).toHaveClass('border-green-400');
    });

    it('debe aplicar estilos rojos para tipo "error"', () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <Notification message="Error!" type="error" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('bg-red-50');
      expect(notification).toHaveClass('text-red-700');
      expect(notification).toHaveClass('border-red-400');
    });

    it('debe aplicar estilos azules para tipo "info"', () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <Notification message="Info!" type="info" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('bg-blue-50');
      expect(notification).toHaveClass('text-blue-700');
      expect(notification).toHaveClass('border-blue-400');
    });
  });

  describe('Funcionalidad de cierre', () => {
    it('debe llamar onClose cuando se hace clic en el botón de cierre', () => {
      const mockOnClose = jest.fn();
      render(<Notification message="Test" type="info" onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Estructura y clases CSS', () => {
    it('debe tener las clases de posicionamiento fijo', () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <Notification message="Test" type="info" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('fixed');
      expect(notification).toHaveClass('top-4');
      expect(notification).toHaveClass('right-4');
      expect(notification).toHaveClass('z-50');
    });

    it('debe tener clases de estilo común', () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <Notification message="Test" type="info" onClose={mockOnClose} />
      );

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('p-4');
      expect(notification).toHaveClass('rounded-lg');
      expect(notification).toHaveClass('shadow-lg');
      expect(notification).toHaveClass('max-w-md');
      expect(notification).toHaveClass('border-l-4');
    });
  });
});
