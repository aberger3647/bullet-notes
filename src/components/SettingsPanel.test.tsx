import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';
import type { Snapshot } from '../state/types';

const signOutMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'me@example.com', user_metadata: { full_name: 'Ada Lovelace' } },
    signOut: signOutMock,
  }),
}));

const updateProfileNameMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../sync/accountApi', () => ({
  updateProfileName: (...args: unknown[]) => updateProfileNameMock(...args),
}));

const downloadFileMock = vi.fn();
vi.mock('../lib/downloadFile', () => ({
  downloadFile: (...args: unknown[]) => downloadFileMock(...args),
}));

const restoreSnapshotMock = vi.fn().mockResolvedValue({
  tree: [{ id: 'restored', text: 'restored', completed: false, children: [] }],
  zoom_path: [],
  settings: { hideCompleted: false, theme: 'light' },
});
let snapshotsState: { snapshots: Array<{ id: string; created_at: string }>; loading: boolean } = {
  snapshots: [],
  loading: false,
};
const useSnapshotsListMock = vi.fn((enabled: boolean) => ({
  ...snapshotsState,
  enabled,
  refresh: vi.fn(),
  restore: restoreSnapshotMock,
}));
vi.mock('../sync/useSnapshotsList', () => ({
  useSnapshotsList: (enabled: boolean) => useSnapshotsListMock(enabled),
}));

const togglePermissionMock = vi.fn().mockResolvedValue(undefined);
const revokeShareMock = vi.fn().mockResolvedValue(undefined);
let sharesState: {
  shares: Array<{ id: string; share_token: string; updated_at: string; permission: 'edit' | 'view'; revoked: boolean }>;
  loading: boolean;
  error?: boolean;
} = { shares: [], loading: false, error: false };
const useMySharesListMock = vi.fn((enabled: boolean) => ({
  ...sharesState,
  enabled,
  refresh: vi.fn(),
  togglePermission: togglePermissionMock,
  revoke: revokeShareMock,
}));
vi.mock('../sync/useMySharesList', () => ({
  useMySharesList: (enabled: boolean) => useMySharesListMock(enabled),
}));

const snap: Snapshot = { tree: [node('a')], zoomPath: [] };

describe('SettingsPanel', () => {
  beforeEach(() => {
    snapshotsState = { snapshots: [], loading: false };
    restoreSnapshotMock.mockClear();
    useSnapshotsListMock.mockClear();
    sharesState = { shares: [], loading: false, error: false };
    togglePermissionMock.mockClear();
    revokeShareMock.mockClear();
    useMySharesListMock.mockClear();
    signOutMock.mockClear();
    updateProfileNameMock.mockClear();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithContext(<SettingsPanel open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not enable the version-history fetch while closed', () => {
    renderWithContext(<SettingsPanel open={false} onClose={() => {}} />);
    expect(useSnapshotsListMock).toHaveBeenCalledWith(false);
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

  it('lists version-history snapshots and restores one on confirmation', async () => {
    snapshotsState = { snapshots: [{ id: 'snap-1', created_at: '2026-06-30T12:00:00Z' }], loading: false };
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: /restore this version/i });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(restoreSnapshotMock).toHaveBeenCalledWith('snap-1'));
    await waitFor(() =>
      expect(value.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HYDRATE',
          payload: expect.objectContaining({
            tree: expect.arrayContaining([expect.objectContaining({ text: 'restored' })]),
          }),
        }),
      ),
    );
  });

  it('does not restore when the confirmation is cancelled', async () => {
    snapshotsState = { snapshots: [{ id: 'snap-1', created_at: '2026-06-30T12:00:00Z' }], loading: false };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: /restore this version/i });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Cancel' }));
    expect(restoreSnapshotMock).not.toHaveBeenCalled();
  });

  it('lists my shared links with permission toggle and revoke', () => {
    sharesState = {
      shares: [
        { id: '1', share_token: 'tok-123', updated_at: '2026-06-30T12:00:00Z', permission: 'edit', revoked: false },
      ],
      loading: false,
    };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    expect(screen.getByRole('button', { name: /make view-only/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });

  it('toggles a share to view-only', async () => {
    sharesState = {
      shares: [
        { id: '1', share_token: 'tok-123', updated_at: '2026-06-30T12:00:00Z', permission: 'edit', revoked: false },
      ],
      loading: false,
    };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: /make view-only/i }));
    await waitFor(() => expect(togglePermissionMock).toHaveBeenCalledWith('tok-123', 'view'));
  });

  it('revokes a share after confirmation', async () => {
    sharesState = {
      shares: [
        { id: '1', share_token: 'tok-123', updated_at: '2026-06-30T12:00:00Z', permission: 'edit', revoked: false },
      ],
      loading: false,
    };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: /revoke this shared link/i });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Revoke' }));
    expect(revokeShareMock).toHaveBeenCalledWith('tok-123');
  });

  it('does not enable the shares fetch while closed', () => {
    renderWithContext(<SettingsPanel open={false} onClose={() => {}} />);
    expect(useMySharesListMock).toHaveBeenCalledWith(false);
  });

  it('shows an error message instead of silently claiming no shares when the list fails to load', () => {
    sharesState = { shares: [], loading: false, error: true };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    expect(screen.getByText(/could not load your shared links/i)).toBeInTheDocument();
    expect(screen.queryByText("You haven't shared any bullets yet.")).not.toBeInTheDocument();
  });

  it('pre-fills the display name and saves it', async () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    const nameInput = screen.getByLabelText('Display name');
    expect(nameInput).toHaveValue('Ada Lovelace');
    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(updateProfileNameMock).toHaveBeenCalledWith('Grace Hopper'));
  });

  it('exports the tree as Markdown', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [], { text: 'hello' })]),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export as Markdown' }));
    expect(downloadFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.md$/),
      'text/markdown',
      '- [ ] hello',
    );
  });

  it('exports the tree as plain text', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [], { text: 'hello' })]),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export as plain text' }));
    expect(downloadFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.txt$/),
      'text/plain',
      'hello',
    );
  });

  it('imports an uploaded outline file at the root level', async () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    const file = new File(['imported\n\tchild'], 'notes.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Import outline file');
    await userEvent.upload(input, file);
    await waitFor(() =>
      expect(value.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IMPORT_OUTLINE',
          parentId: '__root__',
          roots: expect.arrayContaining([expect.objectContaining({ text: 'imported' })]),
        }),
      ),
    );
  });

  it('imports into the currently zoomed bullet instead of the root when zoomed in', async () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [node('b')])], { zoomPath: ['a'] }),
    });
    const file = new File(['imported'], 'notes.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Import outline file');
    await userEvent.upload(input, file);
    await waitFor(() =>
      expect(value.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'IMPORT_OUTLINE', parentId: 'a' }),
      ),
    );
  });

  it('exports the tree as JSON', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [], { text: 'hello' })]),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export as JSON' }));
    expect(downloadFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.json$/),
      'application/json',
      expect.stringContaining('"text": "hello"'),
    );
  });
});
