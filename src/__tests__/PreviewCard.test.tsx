import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreviewCard from '@/components/PreviewCard';

const mockOnEdit = jest.fn();

const defaultProps = {
  title: 'Test Title',
  description: 'Test description text',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/article',
  author: 'Test Author',
  onEdit: mockOnEdit,
};

describe('PreviewCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and description', () => {
    render(<PreviewCard {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('renders author when provided', () => {
    render(<PreviewCard {...defaultProps} />);

    expect(screen.getByText('por Test Author')).toBeInTheDocument();
  });

  it('does not render author when not provided', () => {
    render(<PreviewCard {...defaultProps} author={null} />);

    expect(screen.queryByText(/por/)).not.toBeInTheDocument();
  });

  it('renders image when provided', () => {
    render(<PreviewCard {...defaultProps} />);

    const img = screen.getByAltText('Test Title');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders URL link', () => {
    render(<PreviewCard {...defaultProps} />);

    const link = screen.getByText('https://example.com/article');
    expect(link).toHaveAttribute('href', 'https://example.com/article');
  });

  it('shows WhatsApp format by default', () => {
    render(<PreviewCard {...defaultProps} />);

    // Check the preview text contains WhatsApp format (single asterisks, not double)
    const preElement = document.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    expect(preElement?.textContent).toContain('*Test Title*');
    expect(preElement?.textContent).not.toContain('**Test Title**');
  });

  it('switches to Telegram format when selected', () => {
    render(<PreviewCard {...defaultProps} />);

    const telegramRadio = screen.getByRole('radio', { name: /telegram/i });
    fireEvent.click(telegramRadio);

    // Check the preview text contains Telegram format (double asterisks)
    expect(screen.getByText((content) => content.includes('**Test Title**'))).toBeInTheDocument();
  });

  it('enters edit mode when clicking "Editar detalles"', () => {
    render(<PreviewCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar detalles'));

    // Check edit form is visible
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onEdit when saving changes', () => {
    render(<PreviewCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar detalles'));

    // Find the title input by its value
    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    fireEvent.click(screen.getByText('Guardar'));

    expect(mockOnEdit).toHaveBeenCalledWith({
      title: 'New Title',
      description: 'Test description text',
      url: 'https://example.com/article',
    });
  });

  it('cancels edit mode without saving', () => {
    render(<PreviewCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Editar detalles'));

    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    fireEvent.click(screen.getByText('Cancelar'));

    expect(mockOnEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('copies text to clipboard when clicking "Copiar Texto"', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<PreviewCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Copiar Texto'));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('*Test Title*')
      );
    });
  });

  it('shows "¡Copiado!" after copying', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<PreviewCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Copiar Texto'));

    await waitFor(() => {
      expect(screen.getByText('¡Copiado!')).toBeInTheDocument();
    });
  });
});
