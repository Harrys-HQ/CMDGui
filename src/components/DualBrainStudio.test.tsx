import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DualBrainStudio from './DualBrainStudio';
import { tauriBridge } from '../tauriBridge';
import type { Keymap } from '../hooks/useKeybindings';
import type { WorkflowRun } from '../workflows';

vi.mock('../tauriBridge', () => ({
  tauriBridge: {
    settingsGet: vi.fn(),
    settingsSet: vi.fn(),
    getProjectDetails: vi.fn(),
    workflowList: vi.fn(),
    workflowStart: vi.fn(),
    workflowCancel: vi.fn(),
    workflowModels: vi.fn(),
    workflowOpenArtifacts: vi.fn(),
    codexSessionsList: vi.fn(),
    codexSessionContext: vi.fn(),
  },
}));

const props = { cwd: 'C:/project', onClose: vi.fn(), keymap: {} as Keymap };
const fixture = (changes: Partial<WorkflowRun> = {}): WorkflowRun => ({
  id: 'run-1',
  status: 'running',
  stage: 'planning',
  startedAt: 123,
  finishedAt: null,
  message: 'Preparing a brief',
  summary: null,
  brief: null,
  output: '',
  usage: null,
  checks: [],
  artifactDir: 'C:/runs/run-1',
  options: {
    cwd: 'C:/project',
    prompt: 'Fix focus handling',
    mode: 'pipeline',
    checks: ['npm run build'],
    timeoutMinutes: 15,
    agyModel: 'planner-model',
    codexModel: 'coding-model',
    codexEffort: 'medium',
    taskType: 'discovery',
    routingReason: 'Scoped handoff',
  },
  ...changes,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tauriBridge.settingsGet).mockResolvedValue(null);
  vi.mocked(tauriBridge.settingsSet).mockResolvedValue(undefined);
  vi.mocked(tauriBridge.getProjectDetails).mockResolvedValue({
    scripts: { build: 'tsc', test: 'vitest' },
  });
  vi.mocked(tauriBridge.workflowList).mockResolvedValue([]);
  vi.mocked(tauriBridge.workflowStart).mockResolvedValue(fixture());
});

describe('Mission Control', () => {
  it('imports reviewed context and resumes the specifically selected session', async () => {
    vi.mocked(tauriBridge.codexSessionsList).mockResolvedValue({
      sessions: [
        {
          id: 'session-123',
          title: 'Previous settings work',
          cwd: props.cwd,
          updatedAt: 123,
          status: 'notLoaded',
        },
      ],
      nextCursor: null,
    });
    vi.mocked(tauriBridge.codexSessionContext).mockResolvedValue({
      session: {
        id: 'session-123',
        title: 'Previous settings work',
        cwd: props.cwd,
        updatedAt: 123,
        status: 'notLoaded',
      },
      context: 'Original settings decisions',
      truncated: false,
    });
    render(<DualBrainStudio {...props} initialPrompt="Continue the next step" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Start task/ })).toBeEnabled());
    fireEvent.click(screen.getByText('Continue a previous Codex session'));
    fireEvent.click(screen.getByRole('button', { name: 'Load project sessions' }));
    await screen.findByLabelText('Saved Codex session');
    fireEvent.change(screen.getByLabelText('Saved Codex session'), {
      target: { value: 'session-123' },
    });
    const context = await screen.findByLabelText('Context excerpt to share');
    fireEvent.change(context, { target: { value: 'Reviewed: preserve existing settings' } });
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          resumeSession: true,
          sessionContext: 'Reviewed: preserve existing settings',
        })
      )
    );
  });
  it('routes a small task directly, saves settings, and preserves literal task text', async () => {
    render(<DualBrainStudio {...props} />);
    await waitFor(() => expect(screen.getByLabelText('What kind of task?')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('What kind of task?'), { target: { value: 'scoped' } });
    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'Fix "$HOME" and $(literal) rendering' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'codex-only',
          codexModel: 'gpt-6-luna',
          prompt: 'Fix "$HOME" and $(literal) rendering',
          checks: ['npm run build', 'npm test -- --run'],
        })
      )
    );
    expect(tauriBridge.settingsSet).toHaveBeenCalled();
  });

  it('never presents a failed launch as a completed workflow', async () => {
    vi.mocked(tauriBridge.workflowStart).mockRejectedValue(new Error('AGY is not installed'));
    render(<DualBrainStudio {...props} initialPrompt="Add a feature" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Start task/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('AGY is not installed');
    expect(screen.queryByText('Checks passed')).not.toBeInTheDocument();
  });

  it('restores history and exposes the saved brief without a manual handoff', async () => {
    vi.mocked(tauriBridge.workflowList).mockResolvedValue([
      fixture({
        status: 'failed',
        brief: '{"objective":"saved evidence"}',
        message: 'Build failed',
      }),
    ]);
    render(<DualBrainStudio {...props} />);
    expect((await screen.findAllByText('Build failed')).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: /Hand Off|Mark Complete/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Handoff brief' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('saved evidence');
  });

  it('blocks concurrent tasks across projects and cancels the actual active run', async () => {
    vi.mocked(tauriBridge.workflowList).mockResolvedValue([fixture()]);
    render(<DualBrainStudio {...props} initialPrompt="Another task" />);
    await screen.findByRole('button', { name: 'Cancel run' });
    expect(screen.getByRole('button', { name: /Start task/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(tauriBridge.workflowCancel).toHaveBeenCalledWith('run-1'));
    expect(tauriBridge.workflowStart).not.toHaveBeenCalled();
  });

  it('does not show another project’s old runs as this project’s result', async () => {
    const other = fixture({ status: 'verified' });
    other.options.cwd = 'C:/another-project';
    vi.mocked(tauriBridge.workflowList).mockResolvedValue([other]);
    render(<DualBrainStudio {...props} />);
    await waitFor(() => expect(tauriBridge.workflowList).toHaveBeenCalled());
    expect(screen.getByText('One task. The right route.')).toBeInTheDocument();
    expect(screen.queryByText('Fix focus handling')).not.toBeInTheDocument();
  });
});
