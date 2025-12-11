import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventFormDialog from './EventFormDialog';
import { trpc } from '../../lib/trpc';
import { mockTrpc } from '../../../tests/setup'; // Assuming mockTrpc is exported from setup

// Remove the local vi.mock statement entirely.

describe('EventFormDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockClear();

    // Setup global mock responses for the component's dependencies
    mockTrpc.calendar.createEvent.useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    mockTrpc.calendar.updateEvent.useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    mockTrpc.calendar.getEventById.useQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    // Mock other dependencies used by the component (userManagement.listUsers and clients.list)
    mockTrpc.userManagement.listUsers.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    mockTrpc.clients.list.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('renders the form when open', () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText('Create Event')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <EventFormDialog
        isOpen={false}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('submits form with valid data', async () => {
    mockMutateAsync.mockResolvedValue({ id: 1 });

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    // Fill in required fields
    const titleInput = screen.getByLabelText(/event title/i) || screen.getByPlaceholderText(/event title/i);
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: 'Test Event' } });
    }

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it('shows loading state during submission', () => {
    mockTrpc.calendar.createEvent.useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: true,
    });

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole('button', { name: /saving/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles submission errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    mockMutateAsync.mockRejectedValue(new Error('Network error'));

    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={null}
        onSaved={mockOnSaved}
      />
    );

    // Fill in required fields to enable submission
    const titleInput = screen.getByLabelText(/event title/i) || screen.getByPlaceholderText(/event title/i);
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: 'Test Event' } });
    }

    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Failed to save event. Please try again.');
    });

    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('shows Edit Event title when editing', () => {
    render(
      <EventFormDialog
        isOpen={true}
        onClose={mockOnClose}
        eventId={123}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument();
  });
});