import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyDocumentsPage } from './MyDocumentsPage';
import { AppStateContext } from '../context/appStateContext';
import { makeContextValue, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';

const createDocumentMock = vi.fn().mockResolvedValue('new-id');
const deleteDocumentMock = vi.fn().mockResolvedValue(undefined);
let listState: { documents: Array<{ id: string; title: string }>; loading: boolean; error: boolean } = {
  documents: [],
  loading: false,
  error: false,
};

vi.mock('../sync/useDocumentsList', () => ({
  useDocumentsList: () => ({
    ...listState,
    refresh: vi.fn(),
    createDocument: createDocumentMock,
    deleteDocument: deleteDocumentMock,
  }),
}));

function renderPage(state = makeState([node('a', [], { text: 'hello' })])) {
  const value = makeContextValue({ state });
  return render(
    <MemoryRouter>
      <AppStateContext.Provider value={value}>
        <MyDocumentsPage />
      </AppStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('MyDocumentsPage', () => {
  it('lists saved documents by title', () => {
    listState = { documents: [{ id: '1', title: 'Groceries' }], loading: false, error: false };
    renderPage();
    expect(screen.getByRole('button', { name: 'Groceries' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no documents', () => {
    listState = { documents: [], loading: false, error: false };
    renderPage();
    expect(screen.getByText('No saved documents yet.')).toBeInTheDocument();
  });

  it('creates a new blank document', async () => {
    listState = { documents: [], loading: false, error: false };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ New document' }));
    await vi.waitFor(() => expect(createDocumentMock).toHaveBeenCalled());
  });

  it('saves the current primary outline as a new document', async () => {
    listState = { documents: [], loading: false, error: false };
    renderPage(makeState([node('a', [], { text: 'my primary outline' })]));
    fireEvent.click(screen.getByRole('button', { name: 'Save my primary outline as a new document' }));
    await vi.waitFor(() =>
      expect(createDocumentMock).toHaveBeenCalledWith(
        'my primary outline',
        expect.objectContaining({ tree: expect.arrayContaining([expect.objectContaining({ text: 'my primary outline' })]) }),
      ),
    );
  });

  it('deletes a document after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    listState = { documents: [{ id: '1', title: 'Groceries' }], loading: false, error: false };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteDocumentMock).toHaveBeenCalledWith('1');
    confirmSpy.mockRestore();
  });
});
