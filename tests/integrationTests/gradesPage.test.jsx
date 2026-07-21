import { render, screen } from '@testing-library/react';

describe('App', () => {
  it('renders headline', () => {
    render(<h1>hi</h1>);

    screen.debug();
  });
});