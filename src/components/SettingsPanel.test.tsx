import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
const deleteMyDataMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../sync/accountApi', () => ({
  updateProfileName: (...args: unknown[]) => updateProfileNameMock(...args),
  deleteMyData: (...args: unknown[]) => deleteMyDataMock(...args),
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
} = { shares: [], loading: false };
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
    sharesState = { shares: [], loading: false };
    togglePermissionMock.mockClear();
    revokeShareMock.mockClear();
    useMySharesListMock.mockClear();
    signOutMock.mockClear();
    updateProfileNameMock.mockClear();
    deleteMyDataMock.mockClear();
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
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    snapshotsState = { snapshots: [{ id: 'snap-1', created_at: '2026-06-30T12:00:00Z' }], loading: false };
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    const restoreBtn = screen.getByRole('button', { name: /restore/i });
    fireEvent.click(restoreBtn);
    expect(confirmSpy).toHaveBeenCalled();
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
    confirmSpy.mockRestore();
  });

  it('does not restore when the confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    snapshotsState = { snapshots: [{ id: 'snap-1', created_at: '2026-06-30T12:00:00Z' }], loading: false };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    expect(restoreSnapshotMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
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

  it('revokes a share after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sharesState = {
      shares: [
        { id: '1', share_token: 'tok-123', updated_at: '2026-06-30T12:00:00Z', permission: 'edit', revoked: false },
      ],
      loading: false,
    };
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(revokeShareMock).toHaveBeenCalledWith('tok-123');
    confirmSpy.mockRestore();
  });

  it('does not enable the shares fetch while closed', () => {
    renderWithContext(<SettingsPanel open={false} onClose={() => {}} />);
    expect(useMySharesListMock).toHaveBeenCalledWith(false);
  });

  it('pre-fills the display name and saves it', async () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    const nameInput = screen.getByLabelText('Display name');
    expect(nameInput).toHaveValue('Ada Lovelace');
    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(updateProfileNameMock).toHaveBeenCalledWith('Grace Hopper'));
  });

  it('deletes all account data after typing the confirmation phrase', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('DELETE');
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my data' }));
    await waitFor(() => expect(deleteMyDataMock).toHaveBeenCalled());
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    promptSpy.mockRestore();
  });

  it('does not delete data when the confirmation phrase does not match', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('nope');
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { state: makeState([node('a')]) });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my data' }));
    expect(deleteMyDataMock).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('creates and zooms into a new "today" note when none exists yet', () => {
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a')]),
    });
    fireEvent.click(screen.getByRole('button', { name: "Go to today's note" }));
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'APPEND_CHILD', parentId: '__root__' }),
    );
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_TEXT', text: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
    expect(value.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ZOOM_INTO' }));
  });

  it('navigates to an existing "today" note instead of creating a duplicate', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('existing', [], { text: today })]),
    });
    fireEvent.click(screen.getByRole('button', { name: "Go to today's note" }));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'NAVIGATE_TO_BULLET', id: 'existing' });
    expect(value.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'APPEND_CHILD' }),
    );
  });

  it('saves the zoomed-in bullet as a template and lists it', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Weekly review');
    renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [node('b')], { text: 'root' })], { zoomPath: ['a'] }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save current page as template' }));
    expect(await screen.findByText('Weekly review')).toBeInTheDocument();
    promptSpy.mockRestore();
  });

  it('inserts a saved template into the document', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Weekly review');
    const { value } = renderWithContext(<SettingsPanel open onClose={() => {}} />, {
      state: makeState([node('a', [], { text: 'root' })], { zoomPath: ['a'] }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save current page as template' }));
    await screen.findByText('Weekly review');
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    expect(value.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'IMPORT_OUTLINE',
        roots: expect.arrayContaining([expect.objectContaining({ text: 'root' })]),
      }),
    );
    promptSpy.mockRestore();
  });

  it('shows a "My documents" link in local mode', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { mode: 'local' });
    expect(screen.getByRole('button', { name: 'My documents' })).toBeInTheDocument();
  });

  it('hides the "My documents" link in shared mode', () => {
    renderWithContext(<SettingsPanel open onClose={() => {}} />, { mode: 'shared' });
    expect(screen.queryByRole('button', { name: 'My documents' })).not.toBeInTheDocument();
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
