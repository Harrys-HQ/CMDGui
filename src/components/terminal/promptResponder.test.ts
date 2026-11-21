import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElectronAPI } from '../../types';
import { createPromptResponder } from './promptResponder';

describe('PTY prompt responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.electron = { writeTerminal: vi.fn() } as unknown as ElectronAPI;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for output silence across split prompt chunks', () => {
    const responder = createPromptResponder({
      isEnabled: () => true,
      isActive: () => true,
      getPid: () => 'pty',
      notify: vi.fn(),
    });
    responder.handleOutput('Do you want to continue? [y/');
    vi.advanceTimersByTime(400);
    expect(window.electron.writeTerminal).not.toHaveBeenCalled();
    responder.handleOutput('n]: ');
    vi.advanceTimersByTime(499);
    expect(window.electron.writeTerminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(window.electron.writeTerminal).toHaveBeenCalledWith('pty', 'y\r');
    responder.dispose();
  });

  it('rechecks the mode after scheduling and cancels on disposal', () => {
    let enabled = true;
    const responder = createPromptResponder({
      isEnabled: () => enabled,
      isActive: () => true,
      getPid: () => 'pty',
      notify: vi.fn(),
    });
    responder.handleOutput('Continue? [y/n]');
    enabled = false;
    vi.advanceTimersByTime(500);
    expect(window.electron.writeTerminal).not.toHaveBeenCalled();
    enabled = true;
    responder.handleOutput('\r\nContinue? [y/n]');
    responder.dispose();
    vi.advanceTimersByTime(500);
    expect(window.electron.writeTerminal).not.toHaveBeenCalled();
  });

  it('notifies without approving destructive prompts', () => {
    const notify = vi.fn();
    const responder = createPromptResponder({
      isEnabled: () => true,
      isActive: () => true,
      getPid: () => 'pty',
      notify,
    });
    responder.handleOutput('rm -rf /tmp/data\nAre you sure you want to continue? [y/n]');
    vi.advanceTimersByTime(1000);
    expect(notify).toHaveBeenCalledWith('confirmation');
    expect(window.electron.writeTerminal).not.toHaveBeenCalled();
    responder.dispose();
  });
});
