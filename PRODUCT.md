# Product

## Register

product

## Users

People who want a fast, low-friction way to capture and organize thoughts as nested bullet outlines — quick notes, project breakdowns, daily planning. They work in short bursts, often keyboard-first (Enter, Tab, Cmd/Ctrl+Enter), and expect to drill into a single bullet ("zoom") to focus on just its children, then navigate back out via breadcrumbs.

## Product Purpose

Honeydew (bullet-notes) is a lightweight hierarchical outliner: create, nest, complete, tag, search, share, and zoom into bullets, synced to the cloud via Supabase with offline fallback. Success looks like: typing and restructuring outlines feels instant and frictionless, and moving through the hierarchy (zooming in/out, breadcrumb navigation) feels like a natural extension of the content itself rather than a page change.

## Brand Personality

Snappy and efficient — fast, precise, gets out of the way. Closer to Linear/Superhuman in feel than to a playful or decorative note app. No strong anti-reference; default to quick, purposeful motion over decorative or bouncy motion.

## Anti-references

None specified explicitly. Avoid anything that reads as slow, cinematic, or heavily decorative — it conflicts with the snappy/efficient personality.

## Design Principles

- Motion communicates hierarchy, not decoration — animations should reinforce the parent/child spatial relationship of the outline, not just add polish.
- Speed over spectacle — favor short durations and precise easing over elaborate or bouncy effects.
- Instant should stay instant — core text editing and keyboard interactions (Enter, Tab, typing) must never feel gated by animation.
- Respect reduced motion — every added transition needs a `prefers-reduced-motion` fallback to an instant state change.

## Accessibility & Inclusion

Respect `prefers-reduced-motion`: all navigation/zoom animations must degrade gracefully to instant transitions for users who set that preference. No other specific WCAG target given; follow standard web accessibility practice.
