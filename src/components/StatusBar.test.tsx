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

  it('shows the correct tab count', () => {
    render(<StatusBar status="Ready" tabCount={5} />);
    expect(screen.getByText('Tabs: 5')).toBeInTheDocument();
  });
});
