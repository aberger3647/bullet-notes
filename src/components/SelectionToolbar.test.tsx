import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { SelectionToolbar } from './SelectionToolbar';
import { renderWithContext } from '../test/renderWithContext';

describe('SelectionToolbar', () => {
  it('renders nothing when nothing is selected', () => {
    const { container } = renderWithContext(<SelectionToolbar />, { selectedIds: new Set() });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing in read-only mode, even with a selection', () => {
    const { container } = renderWithContext(<SelectionToolbar />, {
      selectedIds: new Set(['a', 'b']),
      readOnly: true,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selection count and wires up the bulk actions', () => {
    const bulkToggleComplete = vi.fn();
    const bulkIndent = vi.fn();
    const bulkOutdent = vi.fn();
    const clearSelection = vi.fn();
    renderWithContext(<SelectionToolbar />, {
      selectedIds: new Set(['a', 'b', 'c']),
      bulkToggleComplete,
      bulkIndent,
      bulkOutdent,
      clearSelection,
    });

    expect(screen.getByText('3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(bulkToggleComplete).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Outdent' }));
    expect(bulkOutdent).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Indent' }));
    expect(bulkIndent).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(clearSelection).toHaveBeenCalled();
  });
});
