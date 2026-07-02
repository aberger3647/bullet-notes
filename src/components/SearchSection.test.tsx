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

  it('shows clickable tag chips for tags used in the document, and filters results on click', async () => {
    renderWithContext(<SearchSection />, {
      state: makeState([
        node('p', [node('c1', [], { text: 'buy milk #groceries' }), node('c2', [], { text: 'buy eggs #groceries' })], {
          text: 'groceries',
        }),
        node('e', [], { text: 'call mom #family' }),
      ]),
    });
    expect(screen.getByRole('button', { name: '#family' })).toBeInTheDocument();
    const groceriesTag = screen.getByRole('button', { name: '#groceries' });
    await userEvent.click(groceriesTag);
    expect(screen.getByRole('searchbox')).toHaveValue('#groceries');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('shows no tag chips when the document has no tags', () => {
    renderWithContext(<SearchSection />, { state: makeState(tree()) });
    expect(screen.queryByRole('button', { name: /^#/ })).not.toBeInTheDocument();
  });

  it('focuses the search input when focusToken changes (e.g. opened via Cmd+K)', () => {
    const { rerender } = renderWithContext(<SearchSection focusToken={0} />, {
      state: makeState(tree()),
    });
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
    rerender(<SearchSection focusToken={1} />);
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
