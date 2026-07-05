import { vi } from 'vitest';

/** Minimal stand-in for a Supabase `RealtimeChannel`, shared by tests that mock `supabase.channel`. */
export type FakeChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
  _emitStatus?: (status: string) => void;
};

/** Simulates an instant, successful handshake by default; tests can still fire other statuses later via `_emitStatus`. */
export function makeFakeChannel(): FakeChannel {
  const channel: FakeChannel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    send: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
  };
  channel.on.mockImplementation(() => channel);
  channel.subscribe.mockImplementation((cb: (status: string) => void) => {
    channel._emitStatus = cb;
    cb('SUBSCRIBED');
    return channel;
  });
  return channel;
}
