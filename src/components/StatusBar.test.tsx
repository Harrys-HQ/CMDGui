import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBar from './StatusBar';

describe('StatusBar', () => {
  it('renders the correct status text', () => {
    render(<StatusBar status="Ready" tabCount={0} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('displays the active tab title when provided', () => {
    render(<StatusBar status="Active" activeTabTitle="My Project" tabCount={1} />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders RAM footprint and active tab title', () => {
    render(<StatusBar status="Ready" activeTabTitle="Tab 1" tabCount={5} />);
    expect(screen.getByText('⚡ RAM: ~140MB')).toBeInTheDocument();
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
  });
});
