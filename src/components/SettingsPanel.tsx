import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sun, Moon, Undo2, Redo2, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppState } from '../hooks/useAppState';
import { downloadFile } from '../lib/downloadFile';
import { exportToJSON, exportToMarkdown, exportToPlainText } from '../lib/exportOutline';
import { parseImportedOutline } from '../lib/importOutline';
import { useSnapshotsList } from '../sync/useSnapshotsList';
import { useMySharesList } from '../sync/useMySharesList';
import { useSharedWithMeList } from '../sync/useSharedWithMeList';
import { listRevokedShareTokens, listShareRecipients, type ShareRecipient } from '../sync/sharesApi';
import { clearRevokedShareTokens } from '../state/treeOps';
import { updateProfileName } from '../sync/accountApi';
import { SearchSection } from './SearchSection';
import { ListSkeleton } from './ListSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Bump this to focus the search field when the panel opens (e.g. via Cmd/Ctrl+K). */
  searchFocusToken?: number;
};

function SettingsSwitchRow({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
      <span className="inline-flex items-center gap-2">
        {icon ? (
          <span className="inline-flex text-muted-foreground" aria-hidden>
            {icon}
          </span>
        ) : null}
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-sm font-semibold">{children}</h3>;
}

function ResultRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
      {children}
    </li>
  );
}

export function SettingsPanel({ open, onClose, searchFocusToken }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state, dispatch, mode, expandAll, collapseAll } = useAppState();
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const isShared = mode === 'shared';

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const onSaveName = async () => {
    setSavingName(true);
    try {
      await updateProfileName(displayName);
    } catch {
      toast.error('Could not save your name. Try again.');
    } finally {
      setSavingName(false);
    }
  };

  const onExportMarkdown = () => downloadFile('honeydew.md', 'text/markdown', exportToMarkdown(state.tree));
  const onExportPlainText = () => downloadFile('honeydew.txt', 'text/plain', exportToPlainText(state.tree));
  const onExportJSON = () => downloadFile('honeydew.json', 'application/json', exportToJSON(state.tree));

  const importInputRef = useRef<HTMLInputElement>(null);
  const parentId = state.zoomPath.length > 0 ? state.zoomPath[state.zoomPath.length - 1]! : '__root__';

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    const roots = parseImportedOutline(content, () => crypto.randomUUID());
    if (roots.length > 0) dispatch({ type: 'IMPORT_OUTLINE', parentId, roots });
  };

  const { snapshots, loading: snapshotsLoading, restore } = useSnapshotsList(open && !isShared);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

  const onRestoreSnapshot = async (id: string) => {
    try {
      const restored = await restore(id);
      if (!restored) return;
      const revokedTokens = await listRevokedShareTokens().catch(() => new Set<string>());
      const tree = clearRevokedShareTokens(restored.tree, revokedTokens);
      dispatch({
        type: 'HYDRATE',
        payload: { tree, zoomPath: restored.zoom_path, settings: restored.settings },
      });
    } catch {
      toast.error('Could not restore this version. Try again.');
    }
  };

  const {
    shares,
    loading: sharesLoading,
    loadingMore: sharesLoadingMore,
    hasMore: sharesHasMore,
    error: sharesError,
    loadMore: loadMoreShares,
    togglePermission,
    revoke,
  } = useMySharesList(open && !isShared);

  const onToggleSharePermission = (shareToken: string, current: 'edit' | 'view') => {
    void togglePermission(shareToken, current === 'edit' ? 'view' : 'edit').catch(() => {
      toast.error('Could not update this share. Try again.');
    });
  };

  const [revokeTargetToken, setRevokeTargetToken] = useState<string | null>(null);

  const onRevokeShare = (shareToken: string) => {
    void revoke(shareToken).catch(() => {
      toast.error('Could not revoke this share. Try again.');
    });
  };

  const [viewRecipientsToken, setViewRecipientsToken] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  const onViewRecipients = (shareToken: string) => {
    setViewRecipientsToken(shareToken);
    setRecipientsLoading(true);
    void listShareRecipients(shareToken)
      .then(setRecipients)
      .catch(() => toast.error('Could not load who viewed this share. Try again.'))
      .finally(() => setRecipientsLoading(false));
  };

  const {
    items: sharedWithMe,
    loading: sharedWithMeLoading,
    loadingMore: sharedWithMeLoadingMore,
    hasMore: sharedWithMeHasMore,
    error: sharedWithMeError,
    loadMore: loadMoreSharedWithMe,
  } = useSharedWithMeList(open && !isShared);

  const onOpenSharedWithMe = (shareToken: string) => {
    onClose();
    navigate(`/d/${shareToken}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle id="settings-title">Settings</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <section>
              <SectionHeading>Account</SectionHeading>
              {user?.email ? <p className="mb-2 text-sm break-all text-muted-foreground">{user.email}</p> : null}

              <Label htmlFor="account-display-name" className="mb-1.5">
                Display name
              </Label>
              <Input
                id="account-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={savingName} onClick={() => void onSaveName()}>
                  Save name
                </Button>
              </div>

              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </div>
            </section>

            <Separator className="my-4" />

            <section>
              <SectionHeading>Search</SectionHeading>
              <SearchSection onNavigate={onClose} focusToken={searchFocusToken} />
            </section>

            <Separator className="my-4" />

            <section>
              <SectionHeading>Appearance</SectionHeading>
              <SettingsSwitchRow
                checked={state.settings.theme === 'dark'}
                onChange={(next) => dispatch({ type: 'SET_THEME', value: next ? 'dark' : 'light' })}
                label={state.settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
                icon={state.settings.theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              />
            </section>

            <Separator className="my-4" />

            <section>
              <SectionHeading>Export</SectionHeading>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onExportMarkdown}>
                  Export as Markdown
                </Button>
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onExportPlainText}>
                  Export as plain text
                </Button>
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onExportJSON}>
                  Export as JSON
                </Button>
              </div>
            </section>

            <Separator className="my-4" />

            <section>
              <SectionHeading>Import</SectionHeading>
              <p className="mb-2 text-sm text-muted-foreground">
                Adds bullets from a JSON export or a tab-indented / markdown outline
                {state.zoomPath.length > 0 ? ' into the bullet you are zoomed into.' : ' at the top level.'}
              </p>
              <Button asChild type="button" variant="outline" size="sm">
                <label htmlFor="import-outline-input" className="cursor-pointer">
                  Choose file to import
                </label>
              </Button>
              <input
                id="import-outline-input"
                ref={importInputRef}
                type="file"
                accept=".json,.md,.txt,text/plain,application/json,text/markdown"
                aria-label="Import outline file"
                className="sr-only"
                onChange={(e) => void onImportFile(e)}
              />
            </section>

            <Separator className="my-4" />

            <section>
              <SectionHeading>Bullets</SectionHeading>
              <SettingsSwitchRow
                checked={state.settings.hideCompleted}
                onChange={(next) => dispatch({ type: 'SET_HIDE_COMPLETED', value: next })}
                label="Hide completed bullets"
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={expandAll}>
                  Expand all
                </Button>
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={collapseAll}>
                  Collapse all
                </Button>
              </div>
            </section>

            <Separator className="my-4" />

            {isShared ? (
              <section>
                <SectionHeading>History</SectionHeading>
                <p className="text-sm text-muted-foreground">
                  Undo and redo are disabled in shared documents so everyone stays in sync.
                </p>
              </section>
            ) : (
              <section>
                <SectionHeading>History</SectionHeading>
                <p className="mb-2 text-sm text-muted-foreground">
                  Shortcuts work from anywhere, including while editing a bullet:{' '}
                  <kbd className="rounded border px-1.5 py-0.5 text-xs">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                  </kbd>
                  +<kbd className="rounded border px-1.5 py-0.5 text-xs">Z</kbd> undo,{' '}
                  <kbd className="rounded border px-1.5 py-0.5 text-xs">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                  </kbd>
                  +<kbd className="rounded border px-1.5 py-0.5 text-xs">⇧</kbd>+
                  <kbd className="rounded border px-1.5 py-0.5 text-xs">Z</kbd> redo (or{' '}
                  <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl</kbd>+
                  <kbd className="rounded border px-1.5 py-0.5 text-xs">Y</kbd> on Windows).
                </p>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!canUndo}
                        onClick={() => dispatch({ type: 'UNDO' })}
                        aria-label="Undo"
                      >
                        <Undo2 className="size-4" aria-hidden />
                        Undo
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!canRedo}
                        onClick={() => dispatch({ type: 'REDO' })}
                        aria-label="Redo"
                      >
                        <Redo2 className="size-4" aria-hidden />
                        Redo
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {navigator.platform.includes('Mac') ? '⌘⇧Z' : 'Ctrl+Shift+Z'}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <h3 className="mt-4 mb-1.5 text-sm font-semibold">Version history</h3>
                {snapshotsLoading ? <ListSkeleton rows={2} /> : null}
                {!snapshotsLoading && snapshots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved versions yet — one is taken automatically each day.</p>
                ) : null}
                <ul className="rounded-lg border" role="listbox" aria-label="Version history">
                  {snapshots.map((snap) => (
                    <ResultRow key={snap.id}>
                      <span className="text-sm">{new Date(snap.created_at).toLocaleString()}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setRestoreTargetId(snap.id)}>
                        Restore
                      </Button>
                    </ResultRow>
                  ))}
                </ul>
              </section>
            )}

            {!isShared ? (
              <>
                <Separator className="my-4" />

                <section>
                  <SectionHeading>My shared links</SectionHeading>
                  {sharesLoading ? <ListSkeleton rows={2} /> : null}
                  {!sharesLoading && sharesError ? (
                    <p className="text-sm text-destructive">Could not load your shared links. Try again.</p>
                  ) : null}
                  {!sharesLoading && !sharesError && shares.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You haven't shared any bullets yet.</p>
                  ) : null}
                  <ul className="rounded-lg border" role="listbox" aria-label="My shared links">
                    {shares.map((share) => (
                      <ResultRow key={share.id}>
                        <span className="text-sm">
                          {share.revoked ? 'Revoked' : share.permission === 'view' ? 'View-only' : 'Editable'}
                        </span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onViewRecipients(share.share_token)}
                          >
                            Viewed by
                          </Button>
                          {!share.revoked ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onToggleSharePermission(share.share_token, share.permission)}
                              >
                                {share.permission === 'edit' ? 'Make view-only' : 'Make editable'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRevokeTargetToken(share.share_token)}
                              >
                                Revoke
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </ResultRow>
                    ))}
                  </ul>
                  {sharesHasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      disabled={sharesLoadingMore}
                      onClick={() => void loadMoreShares()}
                    >
                      {sharesLoadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                  ) : null}
                </section>

                <Separator className="my-4" />

                <section>
                  <SectionHeading>Shared with me</SectionHeading>
                  {sharedWithMeLoading ? <ListSkeleton rows={2} /> : null}
                  {!sharedWithMeLoading && sharedWithMeError ? (
                    <p className="text-sm text-destructive">Could not load notes shared with you. Try again.</p>
                  ) : null}
                  {!sharedWithMeLoading && !sharedWithMeError && sharedWithMe.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No one has shared a note with you yet.</p>
                  ) : null}
                  <ul className="rounded-lg border" role="listbox" aria-label="Shared with me">
                    {sharedWithMe.map((item) => (
                      <ResultRow key={item.share_token}>
                        <span className="text-sm">
                          {item.owner_name ?? 'Someone'} · {item.permission === 'view' ? 'View-only' : 'Editable'}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenSharedWithMe(item.share_token)}
                        >
                          Open
                        </Button>
                      </ResultRow>
                    ))}
                  </ul>
                  {sharedWithMeHasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      disabled={sharedWithMeLoadingMore}
                      onClick={() => void loadMoreSharedWithMe()}
                    >
                      {sharedWithMeLoadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                  ) : null}
                </section>
              </>
            ) : null}

            <Separator className="my-4" />

            <section>
              <SectionHeading>Help</SectionHeading>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between"
                onClick={() => {
                  onClose();
                  navigate('/docs');
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="size-4" aria-hidden />
                  Documentation
                </span>
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={restoreTargetId !== null} onOpenChange={(next) => !next && setRestoreTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>Your current bullets will be replaced.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = restoreTargetId;
                setRestoreTargetId(null);
                if (id) void onRestoreSnapshot(id);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeTargetToken !== null} onOpenChange={(next) => !next && setRevokeTargetToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this shared link?</AlertDialogTitle>
            <AlertDialogDescription>People who have it will lose access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const token = revokeTargetToken;
                setRevokeTargetToken(null);
                if (token) onRevokeShare(token);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewRecipientsToken !== null} onOpenChange={(next) => !next && setViewRecipientsToken(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Viewed by</DialogTitle>
          </DialogHeader>
          {recipientsLoading ? <ListSkeleton rows={2} /> : null}
          {!recipientsLoading && recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has opened this link yet.</p>
          ) : null}
          {!recipientsLoading && recipients.length > 0 ? (
            <ul className="rounded-lg border" role="listbox" aria-label="Viewed by">
              {recipients.map((r, i) => (
                <ResultRow key={i}>
                  <span className="text-sm">{r.recipient_name ?? 'Someone'}</span>
                  <span className="text-xs text-muted-foreground">
                    Last opened {new Date(r.last_opened_at).toLocaleString()}
                  </span>
                </ResultRow>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
