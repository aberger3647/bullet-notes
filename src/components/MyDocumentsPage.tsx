import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useDocumentsList } from '../sync/useDocumentsList';
import { isSupabaseConfigured } from '../lib/supabase';
import { deriveDocTitle } from '../state/treeOps';

export function MyDocumentsPage() {
  const navigate = useNavigate();
  const enabled = isSupabaseConfigured();
  const { documents, loading, error, createDocument, deleteDocument } = useDocumentsList(enabled);
  const { state } = useAppState();

  const onCreateBlank = async () => {
    const id = await createDocument('Untitled', {
      tree: [{ id: crypto.randomUUID(), text: '', completed: false, children: [] }],
      zoomPath: [],
      settings: { hideCompleted: false, theme: 'light' },
    });
    navigate(`/page/${id}`);
  };

  const onSaveCurrentAsDocument = async () => {
    await createDocument(deriveDocTitle(state.tree), {
      tree: state.tree,
      zoomPath: [],
      settings: state.settings,
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    void deleteDocument(id);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button type="button" className="crumb" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="page-title">My Documents</h1>
      </header>

      <main className="app-main">
        {!enabled ? (
          <p className="hint">Supabase is not configured, so documents can't be saved to the cloud.</p>
        ) : (
          <>
            <div className="icon-row outline-actions">
              <button type="button" className="icon-action" onClick={() => void onCreateBlank()}>
                + New document
              </button>
              <button type="button" className="icon-action" onClick={() => void onSaveCurrentAsDocument()}>
                Save my primary outline as a new document
              </button>
            </div>

            {loading ? <p className="hint">Loading…</p> : null}
            {error ? <p className="hint">Could not load your documents.</p> : null}

            {!loading && !error && documents.length === 0 ? (
              <p className="empty-hint">No saved documents yet.</p>
            ) : null}

            <ul className="search-results" role="listbox" aria-label="My documents">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <div className="search-result" role="option">
                    <button
                      type="button"
                      className="settings-nav-link-label"
                      onClick={() => navigate(`/page/${doc.id}`)}
                    >
                      {doc.title}
                    </button>
                    <button type="button" className="icon-action" onClick={() => onDelete(doc.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
