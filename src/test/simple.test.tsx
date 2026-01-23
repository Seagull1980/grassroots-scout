import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Simple component for testing
const SimpleComponent = ({ text }: { text: string }) => {
  return <div>{text}</div>;
};

describe('Simple Component Test', () => {
  it('renders text correctly', () => {
    const { getByText } = render(<SimpleComponent text="Hello World" />);
    expect(getByText('Hello World')).toBeInTheDocument();
  });
});