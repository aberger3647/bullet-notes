import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';
import type { Snapshot } from '../state/types';

vi.mock('../context/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'me@example.com' }, signOut: vi.fn() }),
}));

const snap: Snapshot = { tree: [node('a')], zoomPath: [] };

describe('SettingsPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithContext(<SettingsPanel open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('toggles the theme', () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    fireEvent.click(screen.getByRole('switch', { name: /mode/i }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_THEME', value: 'dark' });
  });

  it('toggles hide-completed', () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Hide completed bullets' }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'SET_HIDE_COMPLETED', value: true });
  });

  it('wires expand-all and collapse-all', () => {
    const expandAll = vi.fn();
    const collapseAll = vi.fn();
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { expandAll, collapseAll });
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(expandAll).toHaveBeenCalled();
    expect(collapseAll).toHaveBeenCalled();
  });

  it('undo/redo buttons dispatch and reflect history availability', () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')], { history: { past: [snap], future: [] } }),
    });
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toBeEnabled();
    expect(redo).toBeDisabled(); // empty future
    fireEvent.click(undo);
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('hides undo/redo controls in shared mode', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { mode: 'shared' });
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.getByText(/disabled in shared documents/i)).toBeInTheDocument();
  });
});
