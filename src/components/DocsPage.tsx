import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'bullet-notes:v1';

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd>{children}</kbd>;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const mod = isMac ? '⌘' : 'Ctrl';

type Shortcut = { keys: string[]; action: string };

const shortcuts: Shortcut[] = [
  { keys: ['Enter'], action: 'New sibling bullet' },
  { keys: ['Tab'], action: 'Indent under bullet above' },
  { keys: ['Shift', 'Tab'], action: 'Outdent one level' },
  { keys: [mod, 'Enter'], action: 'Toggle complete' },
  { keys: [mod, 'Z'], action: 'Undo (outside text fields)' },
  { keys: [mod, 'Shift', 'Z'], action: 'Redo' },
];

type DocSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

export function DocsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Documentation · Bullet Notes';
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { settings?: { theme?: string } };
        if (parsed.settings?.theme === 'light' || parsed.settings?.theme === 'dark') {
          document.documentElement.dataset.theme = parsed.settings.theme;
        }
      }
    } catch {
      /* ignore */
    }
    return () => {
      document.title = 'Home';
    };
  }, []);

  const sections: DocSection[] = [
    {
      id: 'basics',
      title: 'Basics',
      body: (
        <>
          <p>
            Bullet Notes is a hierarchical outliner. Each line is a bullet that can have nested
            children. Click a bullet to edit, press <Kbd>Enter</Kbd> for a new sibling, and use the{' '}
            <strong>+</strong> button to add a bullet at the top of your current view.
          </p>
        </>
      ),
    },
    {
      id: 'zoom',
      title: 'Zoom & navigation',
      body: (
        <>
          <p>
            Click a bullet&apos;s circle marker to <strong>zoom in</strong> and focus on its
            children. Breadcrumbs in the header show where you are — click any crumb to jump back.
            If you zoom into a bullet with no children, an empty child is created automatically.
          </p>
        </>
      ),
    },
    {
      id: 'outline',
      title: 'Inline outline',
      body: (
        <>
          <p>
            Bullets with children show a disclosure triangle to expand or collapse sub-bullets in
            place. Use <strong>Expand all</strong> and <strong>Collapse all</strong> in Settings to
            toggle the whole tree at once.
          </p>
        </>
      ),
    },
    {
      id: 'complete',
      title: 'Completing bullets',
      body: (
        <>
          <p>
            Press <Kbd>{mod}</Kbd>+<Kbd>Enter</Kbd> to mark a bullet complete. Completed bullets
            get a strikethrough. Turn on <strong>Hide completed bullets</strong> in Settings to
            filter them from view.
          </p>
        </>
      ),
    },
    {
      id: 'drag',
      title: 'Drag and drop',
      body: (
        <>
          <p>
            Drag a bullet by its circle marker to reorder. Drop on a sibling to reorder; drag{' '}
            <strong>to the right</strong> while dropping to nest it as a child. You can also drag
            bullets between levels — up to parents, grandparents, or the top level.
          </p>
        </>
      ),
    },
    {
      id: 'search',
      title: 'Search',
      body: (
        <>
          <p>Search lives in Settings and scans your entire outline.</p>
          <ul className="docs-list">
            <li>
              <Kbd>-term</Kbd> — exclude matches (e.g. <Kbd>-draft</Kbd>)
            </li>
            <li>
              <Kbd>OR</Kbd> — match alternatives (e.g. <Kbd>@Steve OR @Lisa</Kbd>)
            </li>
            <li>
              <Kbd>&gt;</Kbd> — hierarchy path (e.g. <Kbd>Projects &gt; Write draft</Kbd>)
            </li>
            <li>
              <Kbd>is:complete</Kbd> / <Kbd>is:open</Kbd> — filter by completion status
            </li>
          </ul>
          <p>Click a result to jump to that bullet. The app zooms to the right level automatically.</p>
        </>
      ),
    },
    {
      id: 'account',
      title: 'Account',
      body: (
        <>
          <p>
            Bullet Notes requires a <strong>Google account</strong>. Sign in on first visit to
            access your notes, shared links, and this documentation.
          </p>
          <p>
            Sign out anytime from <strong>Settings → Account</strong>. Your notes stay saved in the
            cloud and are available when you sign back in.
          </p>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Sharing',
      body: (
        <>
          <p>
            Share any bullet and everything nested under it. On desktop, hover a bullet row and
            click the <strong>users icon</strong> beside the bullet marker. On mobile, the share
            sheet opens so you can copy or send the link.
          </p>
          <p>
            Shared bullets live at <Kbd>/d/:shareToken</Kbd>. Everyone with the link must{' '}
            <strong>sign in with Google</strong> to view or edit. Changes sync in real time;
            presence shows how many others are editing. Undo and redo are disabled in shared
            documents.
          </p>
        </>
      ),
    },
    {
      id: 'storage',
      title: 'Saving',
      body: (
        <>
          <p>
            Your notes save automatically to the cloud, linked to your Google account. Edits sync
            across devices when signed in with the same account. Saves are debounced to a couple of
            seconds while you edit.
          </p>
          <p>
            Your bullet tree, zoom level, and settings (theme, hide completed) are remembered.
            Expand/collapse state and undo history are not saved.
          </p>
          <p>
            If you used Bullet Notes before cloud storage, notes in browser localStorage are
            imported on your first sign-in.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="docs-shell">
      <header className="docs-header">
        <button
          type="button"
          className="docs-back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <BackIcon />
          Back to notes
        </button>
        <h1 className="docs-title">Documentation</h1>
        <p className="docs-lead">
          Everything you can do in Bullet Notes — shortcuts, search, zoom, and more.
        </p>
      </header>

      <nav className="docs-toc" aria-label="On this page">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="docs-toc-link">
            {s.title}
          </a>
        ))}
      </nav>

      <section className="docs-shortcuts" aria-labelledby="shortcuts-heading">
        <h2 id="shortcuts-heading" className="docs-section-title">
          Keyboard shortcuts
        </h2>
        <div className="docs-shortcut-grid">
          {shortcuts.map((s) => (
            <div key={s.action} className="docs-shortcut-card">
              <div className="docs-shortcut-keys">
                {s.keys.map((k, i) => (
                  <span key={`${s.action}-${k}`}>
                    {i > 0 ? <span className="docs-key-sep">+</span> : null}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </div>
              <span className="docs-shortcut-action">{s.action}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="docs-sections">
        {sections.map((s) => (
          <article key={s.id} id={s.id} className="docs-section">
            <h2 className="docs-section-title">{s.title}</h2>
            <div className="docs-section-body">{s.body}</div>
          </article>
        ))}
      </main>
    </div>
  );
}
