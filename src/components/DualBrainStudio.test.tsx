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
    workflowCheckpoint: vi.fn(),
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

const overview = (selected: WorkflowRun | null, includeHistory = true) => {
  const summary = selected
    ? {
        id: selected.id,
        cwd: selected.options.cwd,
        prompt: selected.options.prompt,
        startedAt: selected.startedAt,
        status: selected.status,
      }
    : null;
  return {
    history: includeHistory ? (summary ? [summary] : []) : null,
    active: selected?.status === 'running' ? summary : null,
    selected,
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tauriBridge.settingsGet).mockResolvedValue(null);
  vi.mocked(tauriBridge.settingsSet).mockResolvedValue(undefined);
  vi.mocked(tauriBridge.getProjectDetails).mockResolvedValue({
    type: 'node',
    envVars: {},
    gitBranch: null,
    gitDirty: false,
    gitFiles: [],
    scripts: { build: 'tsc', test: 'vitest' },
  });
  vi.mocked(tauriBridge.workflowList).mockResolvedValue(overview(null));
  vi.mocked(tauriBridge.workflowStart).mockResolvedValue(fixture());
});

describe('Mission Control', () => {
  it('restores the saved project YOLO setting over the app default', async () => {
    vi.mocked(tauriBridge.settingsGet).mockResolvedValue({ taskType: 'discovery', yoloMode: true });
    render(<DualBrainStudio {...props} initialPrompt="Fix focus" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Start task/ })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: /YOLO mode/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({ yoloMode: true })
      )
    );
  });

  it('inherits app YOLO mode and sends it to workflow initiation', async () => {
    render(<DualBrainStudio {...props} isYoloModeEnabled initialPrompt="Fix focus" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Start task/ })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: /YOLO mode/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({ yoloMode: true })
      )
    );
  });

  it('saves a project YOLO override and sends the disabled mode explicitly', async () => {
    render(<DualBrainStudio {...props} isYoloModeEnabled initialPrompt="Fix focus" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Start task/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('checkbox', { name: /YOLO mode/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({ yoloMode: false })
      )
    );
    expect(tauriBridge.settingsSet).toHaveBeenCalledWith(
      'workflow:C:/project',
      expect.objectContaining({ yoloMode: false })
    );
  });

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
    vi.mocked(tauriBridge.workflowList).mockResolvedValue(
      overview(
        fixture({
          status: 'failed',
          brief: '{"objective":"saved evidence"}',
          message: 'Build failed',
        })
      )
    );
    render(<DualBrainStudio {...props} />);
    expect((await screen.findAllByText('Build failed')).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: /Hand Off|Mark Complete/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Handoff brief' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('saved evidence');
  });

  it('blocks concurrent tasks across projects and cancels the actual active run', async () => {
    vi.mocked(tauriBridge.workflowList).mockResolvedValue(overview(fixture()));
    render(<DualBrainStudio {...props} initialPrompt="Another task" />);
    await screen.findByRole('button', { name: 'Cancel run' });
    expect(screen.getByRole('button', { name: /Start task/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(tauriBridge.workflowCancel).toHaveBeenCalledWith('run-1'));
    expect(tauriBridge.workflowStart).not.toHaveBeenCalled();
  });

  it('loads an interrupted run, previews its changes, and sends the reviewed handoff', async () => {
    vi.mocked(tauriBridge.workflowList).mockResolvedValue(
      overview(
        fixture({ status: 'interrupted', stage: 'implementing', codexSessionId: 'partial-1' })
      )
    );
    vi.mocked(tauriBridge.workflowCheckpoint).mockResolvedValue({
      handoff: 'Partial edits in src/main.ts',
      diff: '+pending change',
      continuation: { runId: 'run-1', fingerprint: 'fixture' },
      prompt: 'Fix focus handling',
      codexSessionId: 'partial-1',
      checks: ['npm run build'],
    });
    render(<DualBrainStudio {...props} />);
    const continueButton = await screen.findByRole('button', { name: 'Continue with…' });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    const notes = await screen.findByDisplayValue('Partial edits in src/main.ts');
    expect(screen.getByText('+pending change')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Resume this run/ })).not.toBeChecked();
    fireEvent.change(notes, { target: { value: 'Preserve the verified edits.' } });
    fireEvent.click(screen.getByRole('button', { name: /Start task/ }));
    await waitFor(() =>
      expect(tauriBridge.workflowStart).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'codex-only',
          handoff: 'Preserve the verified edits.',
          continuation: { runId: 'run-1', fingerprint: 'fixture' },
          resumeSession: false,
        })
      )
    );
  });

  it('requests project history and offers a separate compact run view', async () => {
    render(<DualBrainStudio {...props} />);
    await waitFor(() =>
      expect(tauriBridge.workflowList).toHaveBeenCalledWith(props.cwd, null, true)
    );
    const details = screen.getByRole('button', { name: 'Run details' });
    fireEvent.click(details);
    expect(details).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No runs for this project')).toBeInTheDocument();
  });

  it('refreshes only the live run, then reloads history when the run finishes', async () => {
    const running = fixture();
    const finished = fixture({ status: 'verified', message: 'Checks passed' });
    vi.mocked(tauriBridge.workflowList)
      .mockResolvedValueOnce(overview(running))
      .mockResolvedValueOnce(overview(null, false))
      .mockResolvedValue(overview(finished));
    render(<DualBrainStudio {...props} />);
    expect(await screen.findByRole('button', { name: 'Cancel run' })).toBeInTheDocument();
    await waitFor(() => expect(tauriBridge.workflowList).toHaveBeenCalledTimes(3), {
      timeout: 2500,
    });
    expect(tauriBridge.workflowList).toHaveBeenNthCalledWith(2, props.cwd, null, false);
    expect(tauriBridge.workflowList).toHaveBeenNthCalledWith(3, props.cwd, null, true);
    expect(screen.queryByRole('button', { name: 'Cancel run' })).not.toBeInTheDocument();
  });
});
