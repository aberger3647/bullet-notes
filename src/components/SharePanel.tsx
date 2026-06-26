import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { isSupabaseConfigured } from '../lib/supabase';

type Props = {
  open: boolean;
  onClose: () => void;
};

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function statusLabel(status: string, otherEditors: number): string {
  if (status === 'connected') {
    return otherEditors > 0
      ? `Connected · ${otherEditors} other ${otherEditors === 1 ? 'person' : 'people'} editing`
      : 'Connected · waiting for others';
  }
  if (status === 'reconnecting') return 'Reconnecting…';
  if (status === 'error') return 'Connection error';
  return 'Connecting…';
}

export function SharePanel({ open, onClose }: Props) {
  const { mode, shareToken, syncStatus, otherEditors, createShareLink } = useAppState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/d/${shareToken}`
    : null;

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onCreateLink = async () => {
    if (!isSupabaseConfigured()) {
      setError('Sharing is not configured. Add Supabase env vars and rebuild.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await createShareLink();
      const url = `${window.location.origin}/d/${token}`;
      await copyLink(url);
      navigate(`/d/${token}`);
      onClose();
    } catch {
      setError('Could not create share link. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2 id="share-title">Share notes</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close share panel">
            ✕
          </button>
        </div>

        {mode === 'local' ? (
          <div className="settings-section">
            <p className="hint">
              Create a link to collaborate in real time. Anyone with the link can view and edit these bullets.
            </p>
            {error ? <p className="share-error">{error}</p> : null}
            <button
              type="button"
              className="primary-btn"
              disabled={busy}
              onClick={() => void onCreateLink()}
            >
              <LinkIcon />
              {busy ? 'Creating link…' : 'Create share link'}
            </button>
          </div>
        ) : (
          <div className="settings-section">
            <p className={`sync-status sync-status--${syncStatus}`}>
              {statusLabel(syncStatus, otherEditors)}
            </p>
            {shareUrl ? (
              <>
                <label className="share-url-label" htmlFor="share-url">
                  Share link
                </label>
                <div className="share-url-row">
                  <input id="share-url" className="share-url-input" readOnly value={shareUrl} />
                  <button
                    type="button"
                    className="icon-action"
                    onClick={() => void copyLink(shareUrl)}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            ) : null}
            <p className="hint">
              Send this link to a friend. Changes sync live as you both edit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
