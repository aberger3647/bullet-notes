import { X, IndentIncrease, IndentDecrease, Check } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { Button } from '@/components/ui/button';

/** Floating bulk-action bar shown while multiple bullets are shift-click selected. */
export function SelectionToolbar() {
  const { selectedIds, readOnly, clearSelection, bulkIndent, bulkOutdent, bulkToggleComplete } = useAppState();

  if (selectedIds.size === 0 || readOnly) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
      role="toolbar"
      aria-label="Selected bullets actions"
    >
      <span className="px-2 text-sm text-muted-foreground">{selectedIds.size} selected</span>
      <Button type="button" variant="ghost" size="sm" onClick={bulkToggleComplete}>
        <Check className="size-4" aria-hidden />
        Complete
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={bulkOutdent}>
        <IndentDecrease className="size-4" aria-hidden />
        Outdent
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={bulkIndent}>
        <IndentIncrease className="size-4" aria-hidden />
        Indent
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={clearSelection}>
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
