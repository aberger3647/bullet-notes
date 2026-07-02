import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useDocumentsList } from '../sync/useDocumentsList';
import { isSupabaseConfigured } from '../lib/supabase';
import { deriveDocTitle } from '../state/treeOps';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from './ListSkeleton';

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
    <div className="mx-auto max-w-2xl px-4 pt-5 pb-22">
      <header className="mb-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-1.5" onClick={() => navigate('/')}>
          ← Back
        </Button>
        <h1 className="mt-1 text-2xl font-semibold">My Documents</h1>
      </header>

      <main>
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            Supabase is not configured, so documents can't be saved to the cloud.
          </p>
        ) : (
          <>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => void onCreateBlank()}>
                + New document
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => void onSaveCurrentAsDocument()}
              >
                Save my primary outline as a new document
              </Button>
            </div>

            {loading ? <ListSkeleton /> : null}
            {error ? <p className="mt-2.5 text-sm text-muted-foreground">Could not load your documents.</p> : null}

            {!loading && !error && documents.length === 0 ? (
              <p className="mt-2.5 text-sm text-muted-foreground">No saved documents yet.</p>
            ) : null}

            <ul className="mt-2.5 rounded-lg border" role="listbox" aria-label="My documents">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                  role="option"
                >
                  <Button type="button" variant="link" className="h-auto p-0" onClick={() => navigate(`/page/${doc.id}`)}>
                    {doc.title}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onDelete(doc.id)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
