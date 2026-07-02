import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'bullet-notes:v1';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</kbd>
  );
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const mod = isMac ? '⌘' : 'Ctrl';

type Shortcut = { keys: string[]; action: string };

const shortcuts: Shortcut[] = [
  { keys: ['Enter'], action: 'New sibling bullet' },
  { keys: ['Shift', 'Enter'], action: 'Insert a line break in the current bullet' },
  { keys: ['Tab'], action: 'Indent under bullet above' },
  { keys: ['Shift', 'Tab'], action: 'Outdent one level' },
  { keys: ['↑'], action: 'Move to the bullet above' },
  { keys: ['↓'], action: 'Move to the bullet below' },
  { keys: ['Backspace'], action: 'Merge into the bullet above (or delete if empty)' },
  { keys: [mod, 'Backspace'], action: 'Delete this bullet and its children' },
  { keys: [mod, 'D'], action: 'Duplicate this bullet and its children' },
  { keys: [mod, 'C'], action: 'Copy this bullet and its children' },
  { keys: [mod, 'V'], action: 'Paste a copied bullet as a new sibling' },
  { keys: [mod, 'Enter'], action: 'Toggle complete' },
  { keys: [mod, 'K'], action: 'Open search from anywhere' },
  { keys: [mod, 'Z'], action: 'Undo' },
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
    document.title = 'Documentation · Honeydew';
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
            Honeydew is a hierarchical outliner. Each line is a bullet that can have nested
            children. Click a bullet to edit, press <Kbd>Enter</Kbd> for a new sibling, and use the{' '}
            <strong>+</strong> button to add a bullet at the top of your current view.
          </p>
        </>
      ),
    },
    {
      id: 'editing',
      title: 'Editing bullets',
      body: (
        <>
          <p>
            Press <Kbd>{mod}</Kbd>+<Kbd>D</Kbd> to <strong>duplicate</strong> a bullet and its
            children as a new sibling. Press <Kbd>{mod}</Kbd>+<Kbd>Backspace</Kbd> to delete a
            bullet and its children outright, immediately — no confirmation prompt; undo if it was
            a mistake. Or press <Kbd>Backspace</Kbd> at the start of a bullet to merge it into the
            bullet above, carrying its children up with it.
          </p>
          <p>
            Use <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> to add a line break inside a bullet instead of
            creating a new one — useful for short multi-line notes. <Kbd>{mod}</Kbd>+<Kbd>C</Kbd>{' '}
            on a bullet copies it and everything nested under it; <Kbd>{mod}</Kbd>+<Kbd>V</Kbd>{' '}
            elsewhere pastes the whole branch as a new bullet, instead of flattening it into text.
          </p>
          <p>
            On mobile, swipe a bullet left to reveal a delete action, in addition to the toolbar
            that appears above the keyboard while editing.
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
      id: 'multi-select',
      title: 'Selecting multiple bullets',
      body: (
        <>
          <p>
            <Kbd>Shift</Kbd>+click a bullet&apos;s circle marker, then <Kbd>Shift</Kbd>+click
            another to select every visible bullet in between. Selected bullets get a light-blue
            highlight, and a toolbar appears at the bottom with bulk actions.
          </p>
          <p>
            <strong>Complete</strong> marks the whole selection complete (or incomplete again, if
            they're all already complete); <strong>Indent</strong> and <strong>Outdent</strong>{' '}
            move the whole selection together, keeping their relative order. Press{' '}
            <Kbd>Esc</Kbd>, click the <Kbd>✕</Kbd>, or click into a bullet to edit it to clear the
            selection.
          </p>
        </>
      ),
    },
    {
      id: 'search',
      title: 'Search',
      body: (
        <>
          <p>
            Search lives in Settings — press <Kbd>{mod}</Kbd>+<Kbd>K</Kbd> from anywhere to jump
            straight to it. Search scans your entire outline, not just the current zoom level.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
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
          <p>
            Write <Kbd>#tag</Kbd> anywhere in a bullet&apos;s text to tag it. Every tag used in
            your document shows up as a chip above the search results — click one to filter to
            bullets carrying that tag.
          </p>
        </>
      ),
    },
    {
      id: 'account',
      title: 'Account',
      body: (
        <>
          <p>
            Honeydew requires a <strong>Google account</strong>. Sign in on first visit to
            access your notes, shared links, and this documentation.
          </p>
          <p>
            Set a <strong>display name</strong> in Settings → Account — it&apos;s what
            collaborators see next to your presence badge in shared documents.
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
            <strong>sign in with Google</strong> to view it. Changes sync in real time; anyone else
            currently viewing or editing shows up as a colored badge with their name on the bullet
            they&apos;re on. Undo and redo are disabled in shared documents.
          </p>
          <p>
            Open <strong>Settings → My shared links</strong> to manage everything you&apos;ve
            shared: switch a link between <strong>editable</strong> and{' '}
            <strong>view-only</strong>, or <strong>revoke</strong> it to cut off access
            immediately (the content itself isn&apos;t deleted).
          </p>
        </>
      ),
    },
    {
      id: 'storage',
      title: 'Saving & offline',
      body: (
        <>
          <p>
            Your notes save automatically to the cloud, linked to your Google account. Edits sync
            across devices when signed in with the same account. Saves are debounced to a couple of
            seconds while you edit.
          </p>
          <p>
            Your bullet tree, zoom level, settings, expand/collapse state, and undo history are all
            remembered across reloads.
          </p>
          <p>
            If your connection drops, your <strong>primary document</strong> keeps working from
            the last version that synced successfully — a banner lets you know you&apos;re offline,
            and changes sync again once you&apos;re back online. Honeydew can also be{' '}
            <strong>installed</strong> like an app from your browser&apos;s install/add-to-home-screen
            prompt.
          </p>
          <p>
            If you used Honeydew before cloud storage, notes in browser localStorage are
            imported on your first sign-in.
          </p>
        </>
      ),
    },
    {
      id: 'export',
      title: 'Export & import',
      body: (
        <>
          <p>
            Open <strong>Settings → Export</strong> to download your document as{' '}
            <strong>Markdown</strong> (a GitHub-style task list), <strong>plain text</strong> (a
            tab-indented outline), or <strong>JSON</strong> (full fidelity, including completion
            state).
          </p>
          <p>
            <strong>Settings → Import</strong> reads a JSON export back in, or a tab-indented /
            Markdown outline (including checkboxes like <Kbd>- [x]</Kbd>) from another app. Imported
            bullets are added into whatever you&apos;re currently zoomed into (or the top level),
            without touching your existing content.
          </p>
        </>
      ),
    },
    {
      id: 'history',
      title: 'Version history',
      body: (
        <>
          <p>
            Honeydew automatically snapshots your primary document at most once a day. Open{' '}
            <strong>Settings → Version history</strong> to see past versions by date and{' '}
            <strong>restore</strong> one — this replaces your current bullets, so you&apos;ll be
            asked to confirm first.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
      <header className="mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-3 -ml-1.5"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to notes
        </Button>
        <h1 className="mb-1.5 text-2xl font-bold">Documentation</h1>
        <p className="text-muted-foreground">
          Everything you can do in Honeydew — shortcuts, search, zoom, and more.
        </p>
      </header>

      <nav className="mb-7 flex flex-wrap gap-1.5 border-b pb-6" aria-label="On this page">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border bg-background px-2.5 py-1 text-sm text-primary hover:bg-muted"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <section className="mb-8" aria-labelledby="shortcuts-heading">
        <h2 id="shortcuts-heading" className="mb-3 text-lg font-semibold">
          Keyboard shortcuts
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex flex-col gap-1.5 rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center gap-0.5">
                {s.keys.map((k, i) => (
                  <span key={`${s.action}-${k}`}>
                    {i > 0 ? <span className="mx-0.5 text-xs text-muted-foreground">+</span> : null}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{s.action}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="flex flex-col gap-7">
        {sections.map((s) => (
          <article key={s.id} id={s.id} className="scroll-mt-4">
            <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>
            <div className="flex flex-col gap-2.5 text-[0.92rem] leading-relaxed">{s.body}</div>
          </article>
        ))}
      </main>
    </div>
  );
}
