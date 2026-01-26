/**
 * PreviewCard.test.tsx - Tests unitarios para el componente PreviewCard
 *
 * Este archivo contiene los tests del componente de previsualización de enlaces.
 * Utiliza React Testing Library para renderizar el componente y verificar:
 *
 * 1. Renderizado correcto de todos los elementos (título, descripción, imagen, autor, URL)
 * 2. Selector de formato WhatsApp/Telegram
 * 3. Modo de edición (entrar, guardar, cancelar)
 * 4. Funcionalidad de copiar al portapapeles
 *
 * Dependencias:
 * - @testing-library/react: Para renderizar y consultar el DOM
 * - jest: Para mocks y aserciones
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreviewCard from '@/components/PreviewCard';

/**
 * Mock de la función onEdit.
 * Se usa para verificar que el componente llama correctamente
 * al callback cuando el usuario guarda cambios en modo edición.
 */
const mockOnEdit = jest.fn();

/**
 * Props por defecto para los tests.
 * Incluyen todos los campos necesarios con valores de prueba.
 * Estos valores se pueden sobrescribir en cada test específico.
 */
const defaultProps = {
  title: 'Test Title',              // Título de prueba
  description: 'Test description text', // Descripción de prueba
  image: 'https://example.com/image.jpg', // URL de imagen de prueba
  url: 'https://example.com/article',     // URL del artículo de prueba
  author: 'Test Author',            // Autor de prueba
  onEdit: mockOnEdit,               // Callback mock para edición
};

/**
 * Suite de tests para el componente PreviewCard.
 *
 * Los tests están organizados por funcionalidad:
 * - Renderizado básico
 * - Formato de texto (WhatsApp/Telegram)
 * - Modo edición
 * - Funcionalidad de copiar
 */
describe('PreviewCard', () => {
  /**
   * Hook que se ejecuta antes de cada test.
   * Limpia todos los mocks para evitar interferencia entre tests.
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- TESTS DE RENDERIZADO BÁSICO ----

  /**
   * Verifica que el título y descripción se renderizan correctamente.
   * Estos son los elementos principales de la tarjeta.
   */
  it('renders title and description', () => {
    render(<PreviewCard {...defaultProps} />);

    // Buscar texto en el documento
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  /**
   * Verifica que el autor se muestra cuando está presente.
   * El autor se muestra con el prefijo "por".
   */
  it('renders author when provided', () => {
    render(<PreviewCard {...defaultProps} />);

    expect(screen.getByText('por Test Author')).toBeInTheDocument();
  });

  /**
   * Verifica que el autor NO se muestra cuando es null.
   * Esto previene mostrar "por null" o similar en la UI.
   */
  it('does not render author when not provided', () => {
    render(<PreviewCard {...defaultProps} author={null} />);

    // queryByText devuelve null si no encuentra el elemento (no lanza error)
    expect(screen.queryByText(/por/)).not.toBeInTheDocument();
  });

  /**
   * Verifica que la imagen se renderiza con los atributos correctos.
   * - El alt debe ser el título
   * - El src debe ser la URL de la imagen
   */
  it('renders image when provided', () => {
    render(<PreviewCard {...defaultProps} />);

    // Buscar imagen por su atributo alt
    const img = screen.getByAltText('Test Title');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  /**
   * Verifica que el enlace a la URL se renderiza correctamente.
   * El enlace debe tener el href correcto para permitir navegación.
   */
  it('renders URL link', () => {
    render(<PreviewCard {...defaultProps} />);

    const link = screen.getByText('https://example.com/article');
    expect(link).toHaveAttribute('href', 'https://example.com/article');
  });

  // ---- TESTS DE FORMATO ----

  /**
   * Verifica que el formato WhatsApp está seleccionado por defecto.
   * WhatsApp usa asteriscos simples (*texto*) para negrita.
   */
  it('shows WhatsApp format by default', () => {
    render(<PreviewCard {...defaultProps} />);

    // Buscar el elemento pre que contiene el texto formateado
    const preElement = document.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    // Verificar formato WhatsApp (asteriscos simples)
    expect(preElement?.textContent).toContain('*Test Title*');
    // Asegurar que NO es formato Telegram (asteriscos dobles)
    expect(preElement?.textContent).not.toContain('**Test Title**');
  });

  /**
   * Verifica que el formato cambia a Telegram al seleccionarlo.
   * Telegram usa asteriscos dobles (**texto**) para negrita.
   */
  it('switches to Telegram format when selected', () => {
    render(<PreviewCard {...defaultProps} />);

    // Encontrar y hacer clic en el radio button de Telegram
    const telegramRadio = screen.getByRole('radio', { name: /telegram/i });
    fireEvent.click(telegramRadio);

    // Verificar que el texto ahora tiene formato Telegram
    expect(screen.getByText((content) => content.includes('**Test Title**'))).toBeInTheDocument();
  });

  // ---- TESTS DE MODO EDICIÓN ----

  /**
   * Verifica que al hacer clic en "Editar detalles" se muestra el formulario.
   * En modo edición deben aparecer campos de entrada y botones de acción.
   */
  it('enters edit mode when clicking "Editar detalles"', () => {
    render(<PreviewCard {...defaultProps} />);

    // Hacer clic en el botón de editar
    fireEvent.click(screen.getByText('Editar detalles'));

    // Verificar que aparecen los elementos del formulario
    expect(screen.getByText('Título')).toBeInTheDocument();       // Label del campo título
    expect(screen.getByText('Descripción')).toBeInTheDocument();  // Label del campo descripción
    expect(screen.getByText('Guardar')).toBeInTheDocument();      // Botón guardar
    expect(screen.getByText('Cancelar')).toBeInTheDocument();     // Botón cancelar
  });

  /**
   * Verifica que el callback onEdit se llama con los datos correctos al guardar.
   * Este es el flujo principal de edición:
   * 1. Entrar en modo edición
   * 2. Modificar un campo
   * 3. Guardar cambios
   */
  it('calls onEdit when saving changes', () => {
    render(<PreviewCard {...defaultProps} />);

    // Entrar en modo edición
    fireEvent.click(screen.getByText('Editar detalles'));

    // Encontrar el input por su valor actual y modificarlo
    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // Guardar los cambios
    fireEvent.click(screen.getByText('Guardar'));

    // Verificar que onEdit fue llamado con los datos esperados
    expect(mockOnEdit).toHaveBeenCalledWith({
      title: 'New Title',
      description: 'Test description text',
      url: 'https://example.com/article',
    });
  });

  /**
   * Verifica que al cancelar se descartan los cambios.
   * El componente debe volver a mostrar los valores originales.
   */
  it('cancels edit mode without saving', () => {
    render(<PreviewCard {...defaultProps} />);

    // Entrar en modo edición
    fireEvent.click(screen.getByText('Editar detalles'));

    // Modificar el título
    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // Cancelar la edición
    fireEvent.click(screen.getByText('Cancelar'));

    // Verificar que onEdit NO fue llamado
    expect(mockOnEdit).not.toHaveBeenCalled();
    // Verificar que el título original se sigue mostrando
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  // ---- TESTS DE FUNCIONALIDAD COPIAR ----

  /**
   * Verifica que al copiar se llama a la API de clipboard con el texto correcto.
   * Usa un mock del clipboard para interceptar la llamada.
   */
  it('copies text to clipboard when clicking "Copiar Texto"', async () => {
    // Mock de la API navigator.clipboard
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined), // Simula éxito
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<PreviewCard {...defaultProps} />);

    // Hacer clic en el botón de copiar
    fireEvent.click(screen.getByText('Copiar Texto'));

    // Esperar y verificar que clipboard.writeText fue llamado con el texto formateado
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('*Test Title*') // Formato WhatsApp por defecto
      );
    });
  });

  /**
   * Verifica que el botón muestra feedback visual después de copiar.
   * El texto del botón cambia de "Copiar Texto" a "¡Copiado!".
   */
  it('shows "¡Copiado!" after copying', async () => {
    // Mock de la API navigator.clipboard
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<PreviewCard {...defaultProps} />);

    // Hacer clic en el botón de copiar
    fireEvent.click(screen.getByText('Copiar Texto'));

    // Esperar y verificar que el texto del botón cambió
    await waitFor(() => {
      expect(screen.getByText('¡Copiado!')).toBeInTheDocument();
    });
  });
});
