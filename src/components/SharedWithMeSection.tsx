import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useSharedWithMeList } from '../sync/useSharedWithMeList';
import { isNewActivity } from '../sync/sharedWithMeApi';
import { formatRelativeTime } from '../lib/relativeTime';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SHARED_WITH_ME_EXPANDED_KEY = 'bullet-notes:v1:sharedWithMeExpanded';
const ITEMS_REGION_ID = 'shared-with-me-items';

function readSectionExpanded(): boolean {
  try {
    return localStorage.getItem(SHARED_WITH_ME_EXPANDED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeSectionExpanded(value: boolean) {
  try {
    localStorage.setItem(SHARED_WITH_ME_EXPANDED_KEY, String(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

function NewActivityDot() {
  return <span className="inline-block size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />;
}

/**
 * A collapsible "Shared with me" divider + list rendered above the user's own outline at the
 * root of their document. Deliberately not built from real BulletNode/BulletRow — these are
 * read-only pointers into other people's documents, not part of state.tree, so they skip
 * dnd-kit/contentEditable entirely and just reuse the same CSS classes real rows use (see
 * BulletRowOverlay for the precedent) to look native.
 */
export function SharedWithMeSection() {
  const { mode, state } = useAppState();
  const navigate = useNavigate();
  const atRoot = mode === 'local' && state.zoomPath.length === 0;
  const { items, loading, error, hasMore, loadingMore, loadMore } = useSharedWithMeList(atRoot);
  const [sectionExpanded, setSectionExpanded] = useState(readSectionExpanded);

  useEffect(() => {
    writeSectionExpanded(sectionExpanded);
  }, [sectionExpanded]);

  if (!atRoot || loading || error || items.length === 0) return null;

  const newCount = items.filter(isNewActivity).length;
  const headerLabel = newCount > 0 ? `Shared with me — ${newCount} new` : 'Shared with me';

  return (
    <div className="outline-block shared-with-me-block" role="presentation">
      <div className="outline-item">
        <div className="bullet-row shared-with-me-row">
          <button
            type="button"
            className="bullet-row-content shared-with-me-row-button"
            aria-expanded={sectionExpanded}
            aria-controls={ITEMS_REGION_ID}
            aria-label={headerLabel}
            onClick={() => setSectionExpanded((prev) => !prev)}
          >
            <div className="share-slot" />
            <div className="disclosure-slot">
              <span
                className={cn('disclosure-triangle', sectionExpanded && 'shared-with-me-triangle--open')}
                aria-hidden
              />
            </div>
            <span className="bullet-marker bullet-marker--parent bullet-marker--incoming-shared">
              <Inbox className="size-3.5" aria-hidden />
            </span>
            <span className="bullet-input flex items-center gap-1.5 font-semibold">
              Shared with me
              {newCount > 0 ? <NewActivityDot /> : null}
            </span>
          </button>
        </div>

        <div id={ITEMS_REGION_ID} className="outline-children" hidden={!sectionExpanded}>
          {sectionExpanded ? (
            <div className="outline-block" role="list" aria-label="Shared with me">
              {items.map((item) => (
                <div className="outline-item" key={item.share_token}>
                  <div className="bullet-row shared-with-me-row">
                    <button
                      type="button"
                      className="bullet-row-content shared-with-me-row-button"
                      aria-label={`Open note shared by ${item.owner_name ?? 'Someone'}`}
                      onClick={() => navigate(`/d/${item.share_token}`)}
                    >
                      <div className="share-slot" />
                      <div className="disclosure-slot">
                        <span className="disclosure-spacer" aria-hidden />
                      </div>
                      <span className="bullet-marker bullet-marker--leaf bullet-marker--incoming-shared">
                        <span className="bullet-marker-ring" aria-hidden />
                      </span>
                      <span className="bullet-input flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          {item.owner_name ?? 'Someone'}
                          {isNewActivity(item) ? <NewActivityDot /> : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.permission === 'view' ? 'View-only' : 'Editable'} ·{' '}
                          {formatRelativeTime(item.updated_at)}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
              {hasMore ? (
                <div className="outline-item">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
