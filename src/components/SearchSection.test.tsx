import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchSection } from './SearchSection';
import { renderWithContext, makeState } from '../test/renderWithContext';
import { node } from '../test/factories';

const tree = () => [
  node('p', [node('c1', [], { text: 'buy milk' }), node('c2', [], { text: 'buy eggs' })], {
    text: 'groceries',
  }),
];

describe('SearchSection', () => {
  it('shows matching results with breadcrumb paths as you type', async () => {
    renderWithContext(<SearchSection />, { state: makeState(tree()) });
    await userEvent.type(screen.getByRole('searchbox'), 'milk');

    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('buy milk');
    expect(option).toHaveTextContent('groceries');
  });

  it('dispatches NAVIGATE_TO_BULLET when a result is clicked', async () => {
    const { value } = renderWithContext(<SearchSection />, { state: makeState(tree()) });
    await userEvent.type(screen.getByRole('searchbox'), 'eggs');
    await userEvent.click(screen.getByRole('option'));
    expect(value.dispatch).toHaveBeenCalledWith({ type: 'NAVIGATE_TO_BULLET', id: 'c2' });
  });

  it('shows an empty-state message when nothing matches', async () => {
    renderWithContext(<SearchSection />, { state: makeState(tree()) });
    await userEvent.type(screen.getByRole('searchbox'), 'zzznope');
    expect(screen.getByText('No bullets match your search.')).toBeInTheDocument();
  });

  it('renders no results list for an empty query', () => {
    renderWithContext(<SearchSection />, { state: makeState(tree()) });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
