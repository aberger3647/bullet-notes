import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Bypass auth entirely: RequireAuth renders its children, useAuth returns a user.
vi.mock('./components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./context/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'me@example.com' }, signOut: vi.fn() }),
}));

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

describe('App (integration)', () => {
  it('renders the initial outline with one bullet', () => {
    renderApp();
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(1);
  });

  it('adds a bullet via the Add bullet FAB', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Add bullet' }));
    expect(screen.getAllByRole('textbox', { name: 'Bullet text' })).toHaveLength(2);
  });

  it('opens the settings dialog from the Settings FAB', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('zooms via a bullet marker and returns Home through the breadcrumb', () => {
    renderApp();
    const markers = screen.getAllByRole('button', { name: 'Open sub-bullets in page view' });
    fireEvent.click(markers[0]!);

    // Zoomed view shows a page title heading + a breadcrumb trail.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'Zoom trail' });
    fireEvent.click(within(trail).getByRole('button', { name: 'Home' }));

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
