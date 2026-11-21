import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, FolderOpen, Play, Square, X } from 'lucide-react';
import { tauriBridge } from '../tauriBridge';
import {
  resolveRoute,
  taskProfiles,
  TaskType,
  WorkflowCheckpoint,
  WorkflowMode,
  WorkflowRun,
  WorkflowSummary,
} from '../workflows';
import { TerminalRendererType, TerminalTheme } from '../types';
import { Keymap } from '../hooks/useKeybindings';
import './DualBrainStudio.css';
import CodexSessionPicker, { SessionSelection } from './CodexSessionPicker';
import CopyTextButton from './CopyTextButton';

interface DualBrainStudioProps {
  cwd?: string;
  initialPrompt?: string;
  onClose: () => void;
  terminalTheme?: string;
  customTheme?: TerminalTheme;
  terminalFontSize?: number;
  terminalScrollback?: number;
  keymap: Keymap;
  isGPUAccelerationEnabled?: boolean;
  terminalRendererType?: TerminalRendererType;
  isYoloModeEnabled?: boolean;
}

type Models = { agyModel: string; codexModel: string; codexEffort: string };
interface Preferences {
  taskType: TaskType;
  override: 'auto' | WorkflowMode;
  checks: string;
  timeoutMinutes: number;
  models: Record<TaskType, Models>;
  yoloMode: boolean;
}

const defaults = (yoloMode = false): Preferences => ({
  yoloMode,
  taskType: 'discovery',
  override: 'auto',
  checks: '',
  timeoutMinutes: 15,
  models: Object.fromEntries(
    Object.entries(taskProfiles).map(([key, p]) => [
      key,
      {
        agyModel: p.agyModel,
        codexModel: p.codexModel,
        codexEffort: p.codexEffort,
      },
    ])
  ) as Record<TaskType, Models>,
});

const statusLabels: Record<WorkflowRun['status'], string> = {
  running: 'Running',
  verified: 'Checks passed',
  planned: 'Brief ready',
  failed: 'Failed',
  cancelled: 'Cancelled',
  interrupted: 'Interrupted',
  'needs-review': 'Needs review',
};

const routeLabels = {
  pipeline: 'AGY → Codex → Checks',
  'codex-only': 'Codex → Checks',
  'agy-only': 'AGY → Brief',
  'copilot-pipeline': 'Copilot → Codex → Checks',
};

const DualBrainStudio: React.FC<DualBrainStudioProps> = ({
  cwd,
  initialPrompt = '',
  onClose,
  isYoloModeEnabled = false,
}) => {
  const [preferences, setPreferences] = useState<Preferences>(() => defaults(isYoloModeEnabled));
  const [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [catalogs, setCatalogs] = useState<
    Record<string, { id: string; label: string; efforts: string[] }[]>
  >({});
  const [loadingCatalog, setLoadingCatalog] = useState<string | null>(null);
  const [projectRuns, setProjectRuns] = useState<WorkflowSummary[]>([]);
  const [active, setActive] = useState<WorkflowSummary | null>(null);
  const [selected, setSelected] = useState<WorkflowRun | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compactPanel, setCompactPanel] = useState<'task' | 'run'>('task');
  const [pending, setPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'summary' | 'brief' | 'output'>('summary');
  const [sessionSelection, setSessionSelection] = useState<SessionSelection | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [handoff, setHandoff] = useState('');
  const [checkpoint, setCheckpoint] = useState<WorkflowCheckpoint | null>(null);
  const [checkpointSession, setCheckpointSession] = useState<string | null>(null);
  const [resumeCheckpoint, setResumeCheckpoint] = useState(false);
  const [loadingCheckpoint, setLoadingCheckpoint] = useState(false);
  const checkpointRequest = useRef(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const starting = useRef(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const route = resolveRoute(preferences.taskType, preferences.override);
  const usesAgy = route.mode === 'pipeline' || route.mode === 'agy-only';
  const models = preferences.models[preferences.taskType];
  const supportedEfforts = catalogs.codex
    ?.find((m) => m.id === models.codexModel)
    ?.efforts.filter((e) => ['low', 'medium', 'high', 'xhigh'].includes(e));
  const projectName =
    cwd
      ?.replace(/[\\/]$/, '')
      .split(/[\\/]/)
      .pop() || 'Select a project';

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const loadCatalog = async (provider: 'agy' | 'codex') => {
    setLoadingCatalog(provider);
    setError('');
    try {
      const choices = await tauriBridge.workflowModels(provider);
      setCatalogs((prev) => ({ ...prev, [provider]: choices }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingCatalog(null);
    }
  };

  useEffect(() => {
    let disposed = false;
    const pendingCheckpoint = checkpointRequest;
    setLoaded(false);
    setError('');
    setSelectedId(null);
    setSelected(null);
    setProjectRuns([]);
    setCompactPanel('task');
    setSessionSelection(null);
    setHandoff('');
    setCheckpoint(null);
    setCheckpointSession(null);
    setResumeCheckpoint(false);
    setLoadingCheckpoint(false);
    const load = async () => {
      try {
        const saved = await tauriBridge.settingsGet<Preferences>(`workflow:${cwd}`);
        let next = defaults(isYoloModeEnabled);
        if (saved && saved.taskType in taskProfiles) {
          next = {
            ...next,
            ...saved,
            models: Object.fromEntries(
              Object.keys(taskProfiles).map((key) => [
                key,
                {
                  ...next.models[key as TaskType],
                  ...saved.models?.[key as TaskType],
                },
              ])
            ) as Preferences['models'],
          };
        } else if (cwd) {
          const details = await tauriBridge.getProjectDetails(cwd);
          const checks = [];
          if (details.scripts?.build) checks.push('npm run build');
          // Only suggest a one-shot test command when the runner is known.
          if (/\bvitest\b/.test(details.scripts?.test || '')) checks.push('npm test -- --run');
          next.checks = checks.join('\n');
        }
        if (!disposed) setPreferences(next);
      } catch (e) {
        if (!disposed) {
          setPreferences(defaults(isYoloModeEnabled));
          setError(`Could not load project preferences: ${String(e)}`);
        }
      } finally {
        if (!disposed) setLoaded(true);
      }
    };
    void load();
    return () => {
      disposed = true;
      pendingCheckpoint.current++;
    };
  }, [cwd, isYoloModeEnabled]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async (includeHistory: boolean) => {
      try {
        const result = await tauriBridge.workflowList(cwd, selectedId, includeHistory);
        if (disposed) return;
        if (result.history) setProjectRuns(result.history);
        if (result.selected || includeHistory) setSelected(result.selected);
        setActive(result.active);
        if (result.active) timer = setTimeout(() => void refresh(false), 1000);
        else if (!includeHistory) void refresh(true);
      } catch (e) {
        if (!disposed) {
          setError(`Cannot read workflows: ${String(e)}`);
          if (!includeHistory) timer = setTimeout(() => void refresh(false), 1000);
        }
      }
    };
    void refresh(true);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [cwd, selectedId]);

  useEffect(() => {
    if (view === 'output' && outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [selected?.output, view]);

  const changeModel = (field: keyof Models, value: string) =>
    setPreferences((p) => ({
      ...p,
      models: { ...p.models, [p.taskType]: { ...p.models[p.taskType], [field]: value } },
    }));

  const loadCheckpoint = async (id: string) => {
    const request = ++checkpointRequest.current;
    setLoadingCheckpoint(true);
    setError('');
    try {
      const result = await tauriBridge.workflowCheckpoint(id);
      if (request !== checkpointRequest.current) return;
      setCheckpoint(result);
      setHandoff(result.handoff);
      setCheckpointSession(result.codexSessionId);
      setResumeCheckpoint(false);
      setSessionSelection(null);
      setPrompt(result.prompt);
      setCompactPanel('task');
      setPreferences((p) => ({
        ...p,
        override: 'codex-only',
        checks: result.checks.length ? result.checks.join('\n') : p.checks,
      }));
    } catch (e) {
      if (request === checkpointRequest.current) setError(String(e));
    } finally {
      if (request === checkpointRequest.current) setLoadingCheckpoint(false);
    }
  };

  const start = async () => {
    if (
      !cwd ||
      !prompt.trim() ||
      active ||
      starting.current ||
      !loaded ||
      sessionLoading ||
      loadingCheckpoint
    )
      return;
    starting.current = true;
    setPending(true);
    setError('');
    try {
      await tauriBridge.settingsSet(`workflow:${cwd}`, preferences);
      const run = await tauriBridge.workflowStart({
        cwd,
        prompt: prompt.trim(),
        mode: route.mode,
        checks:
          route.mode === 'agy-only'
            ? []
            : preferences.checks
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
        timeoutMinutes: preferences.timeoutMinutes,
        yoloMode: preferences.yoloMode,
        ...models,
        taskType: preferences.taskType,
        routingReason: route.reason,
        sessionId:
          checkpoint && resumeCheckpoint && route.mode !== 'agy-only'
            ? checkpointSession
            : (sessionSelection?.id ?? null),
        sessionContext: sessionSelection?.context ?? '',
        resumeSession:
          route.mode !== 'agy-only' &&
          (checkpoint ? resumeCheckpoint : (sessionSelection?.resume ?? false)),
        handoff: handoff.trim(),
        continuation: checkpoint?.continuation,
      });
      setSelected(run);
      setActive({
        id: run.id,
        cwd: run.options.cwd,
        status: run.status,
        prompt: run.options.prompt,
        startedAt: run.startedAt,
      });
      setSelectedId(run.id);
      setCompactPanel('run');
      setPrompt('');
      setHandoff('');
      setCheckpoint(null);
      setCheckpointSession(null);
      setResumeCheckpoint(false);
      setView('output');
    } catch (e) {
      setError(String(e));
    } finally {
      starting.current = false;
      setPending(false);
    }
  };

  const cancel = async () => {
    if (!active) return;
    setCancelling(true);
    try {
      await tauriBridge.workflowCancel(active.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setCancelling(false);
    }
  };

  const selectedStages =
    selected?.options.mode === 'agy-only'
      ? ['planning']
      : selected?.options.mode === 'codex-only'
        ? ['implementing', 'validating']
        : ['planning', 'implementing', 'validating'];
  const stageIndex = selectedStages.indexOf(selected?.stage || '');

  return (
    <section className="mission-control" aria-label="Dual-Brain Mission Control">
      <header className="mission-header">
        <h1>
          <Bot size={21} /> Mission Control
        </h1>
        <button className="mission-button" onClick={onClose}>
          <X size={14} /> Back to terminals
        </button>
      </header>
      <div className="mission-panel-switch" role="group" aria-label="Mission Control view">
        <button
          type="button"
          className="mission-button"
          aria-pressed={compactPanel === 'task'}
          aria-controls="mission-task-panel"
          onClick={() => setCompactPanel('task')}
        >
          Task setup
        </button>
        <button
          type="button"
          className="mission-button"
          aria-pressed={compactPanel === 'run'}
          aria-controls="mission-run-panel"
          onClick={() => setCompactPanel('run')}
        >
          {active ? 'Running task' : 'Run details'}
        </button>
      </div>
      {error && (
        <div className="mission-error" role="alert">
          {error}
        </div>
      )}
      <div className="mission-layout" data-panel={compactPanel}>
        <aside className="mission-compose" id="mission-task-panel" aria-label="Task setup">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start();
            }}
          >
            <label className="mission-label" htmlFor="mission-task-type">
              What kind of task?
            </label>
            <select
              id="mission-task-type"
              value={preferences.taskType}
              disabled={!loaded || pending}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, taskType: e.target.value as TaskType }))
              }
            >
              {Object.entries(taskProfiles).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
            <label className="mission-label" htmlFor="mission-prompt">
              Task
            </label>
            <textarea
              id="mission-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="Describe the desired behavior, relevant files, and how we will know it works."
            />
            <details className="mission-settings" open={checkpoint ? true : undefined}>
              <summary>Handoff from another run or provider</summary>
              <label className="mission-label" htmlFor="mission-handoff">
                Handoff notes
              </label>
              <textarea
                id="mission-handoff"
                rows={7}
                maxLength={24000}
                value={handoff}
                disabled={pending || !!active}
                onChange={(e) => setHandoff(e.target.value)}
                placeholder="Paste a plan or a summary of completed and remaining work."
              />
              <CopyTextButton text={handoff} label="Copy handoff" onError={setError} />
              {checkpoint && (
                <>
                  <button
                    type="button"
                    className="mission-button"
                    disabled={pending || !!active || loadingCheckpoint}
                    onClick={() => void loadCheckpoint(checkpoint.continuation.runId)}
                  >
                    Refresh checkpoint
                  </button>
                  <button
                    type="button"
                    className="mission-button"
                    disabled={pending || !!active}
                    onClick={() => {
                      setCheckpoint(null);
                      setCheckpointSession(null);
                      setResumeCheckpoint(false);
                      setHandoff('');
                    }}
                  >
                    Clear checkpoint
                  </button>
                  {checkpointSession && route.mode !== 'agy-only' && (
                    <label className="mission-check-option">
                      <input
                        type="checkbox"
                        checked={resumeCheckpoint}
                        disabled={pending || !!active}
                        onChange={(e) => setResumeCheckpoint(e.target.checked)}
                      />
                      Resume this run’s Codex thread
                    </label>
                  )}
                  <details className="mission-settings">
                    <summary>Review tracked changes</summary>
                    <pre
                      className="mission-output"
                      style={{ maxHeight: '16rem', overflow: 'auto' }}
                    >
                      {checkpoint.diff || 'No tracked changes in this working tree.'}
                    </pre>
                  </details>
                </>
              )}
            </details>
            {!checkpoint && (
              <CodexSessionPicker
                cwd={cwd}
                disabled={pending || !!active}
                selection={sessionSelection}
                onChange={setSessionSelection}
                onError={setError}
                implementation={route.mode !== 'agy-only'}
                onBusyChange={setSessionLoading}
              />
            )}
            <details className="mission-settings">
              <summary>Models & routing</summary>
              <p>{route.reason}</p>
              {usesAgy && (
                <p>
                  Planner: <code>{models.agyModel || 'AGY CLI default'}</code> · Gemini API billing
                </p>
              )}
              {route.mode === 'copilot-pipeline' && (
                <p>Planner: GitHub Copilot CLI default model</p>
              )}
              {route.mode !== 'agy-only' && (
                <p>
                  Coder: <code>{models.codexModel || 'Codex CLI default'}</code> ·{' '}
                  {models.codexEffort || 'default'} effort
                </p>
              )}
              <label className="mission-label" htmlFor="mission-route">
                Route override
              </label>
              <select
                id="mission-route"
                value={preferences.override}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    override: e.target.value as Preferences['override'],
                  }))
                }
              >
                <option value="auto">Use task preference</option>
                <option value="copilot-pipeline">Copilot → Codex (pilot)</option>
                <option value="pipeline">AGY via Gemini API → Codex</option>
                <option value="codex-only">Codex only</option>
                <option value="agy-only">AGY via Gemini API, investigation only</option>
              </select>
              {usesAgy && (
                <>
                  <label className="mission-label" htmlFor="mission-agy">
                    AGY model
                  </label>
                  <input
                    id="mission-agy"
                    list="mission-agy-models"
                    value={models.agyModel}
                    placeholder="CLI default"
                    onChange={(e) => changeModel('agyModel', e.target.value)}
                  />
                  <datalist id="mission-agy-models">
                    {catalogs.agy?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className="mission-button"
                    disabled={!!loadingCatalog}
                    onClick={() => void loadCatalog('agy')}
                  >
                    {loadingCatalog === 'agy' ? 'Loading…' : 'Load AGY models'}
                  </button>
                </>
              )}
              {route.mode !== 'agy-only' && (
                <>
                  <label className="mission-label" htmlFor="mission-codex">
                    Codex model
                  </label>
                  <input
                    id="mission-codex"
                    list="mission-codex-models"
                    value={models.codexModel}
                    placeholder="CLI default"
                    onChange={(e) => changeModel('codexModel', e.target.value)}
                  />
                  <datalist id="mission-codex-models">
                    {catalogs.codex?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className="mission-button"
                    disabled={!!loadingCatalog}
                    onClick={() => void loadCatalog('codex')}
                  >
                    {loadingCatalog === 'codex' ? 'Loading…' : 'Load Codex models'}
                  </button>
                  <label className="mission-label" htmlFor="mission-effort">
                    Codex reasoning effort
                  </label>
                  <select
                    id="mission-effort"
                    value={models.codexEffort}
                    onChange={(e) => changeModel('codexEffort', e.target.value)}
                  >
                    <option value="">CLI default</option>
                    {(supportedEfforts?.length
                      ? Array.from(
                          new Set([...supportedEfforts, models.codexEffort].filter(Boolean))
                        )
                      : ['low', 'medium', 'high', 'xhigh']
                    ).map((effort) => (
                      <option key={effort}>{effort}</option>
                    ))}
                  </select>
                </>
              )}
              <p>
                Catalogs do not run inference. A listed model still needs account access when the
                task runs.
              </p>
            </details>
            {route.mode !== 'agy-only' && (
              <>
                <label className="mission-label" htmlFor="mission-checks">
                  Validation checks <span>one command per line</span>
                </label>
                <textarea
                  id="mission-checks"
                  rows={3}
                  value={preferences.checks}
                  onChange={(e) => setPreferences((p) => ({ ...p, checks: e.target.value }))}
                  placeholder="npm run build&#10;npm test -- --run"
                />
                <p className="mission-hint">
                  These commands run locally after implementation. An empty list leaves the result
                  unverified.
                </p>
              </>
            )}
            <label className="mission-label mission-check-option" htmlFor="mission-yolo">
              <input
                id="mission-yolo"
                type="checkbox"
                checked={preferences.yoloMode}
                disabled={!loaded || pending || !!active}
                onChange={(e) => setPreferences((p) => ({ ...p, yoloMode: e.target.checked }))}
              />{' '}
              YOLO mode — auto-approve worker permissions
            </label>
            <p className="mission-hint">
              AGY and Codex run without permission prompts or their CLI sandboxes. The Copilot
              planner uses read tools only. Saved per project.
            </p>
            <label className="mission-label" htmlFor="mission-timeout">
              Time limit per stage (minutes)
            </label>
            <input
              id="mission-timeout"
              type="number"
              min={1}
              max={120}
              required
              value={preferences.timeoutMinutes}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, timeoutMinutes: Number(e.target.value) }))
              }
            />
            <div className="mission-actions">
              {active && (
                <div className="mission-notice" role="status">
                  A workflow is running in {active.cwd}.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(active.id);
                      setCompactPanel('run');
                    }}
                  >
                    View run
                  </button>
                </div>
              )}
              <div className="mission-launch-context" aria-label="Selected project and route">
                <span title={cwd}>
                  <FolderOpen size={14} /> {projectName}
                </span>
                <strong>{routeLabels[route.mode]}</strong>
              </div>
              <button
                className="mission-button mission-primary"
                type="submit"
                disabled={
                  !cwd ||
                  !prompt.trim() ||
                  !!active ||
                  pending ||
                  !loaded ||
                  sessionLoading ||
                  loadingCheckpoint
                }
              >
                <Play size={14} /> {pending ? 'Starting…' : 'Start task'}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </aside>
        <main className="mission-workspace" id="mission-run-panel" aria-label="Run details">
          {!selected ? (
            <div className="mission-empty">
              <Bot size={36} />
              <h2>No runs for this project</h2>
              <p>Start a task to see its progress and validation results here.</p>
            </div>
          ) : (
            <>
              <div className="mission-run-heading">
                <div>
                  <span className={`mission-status ${selected.status}`}>
                    {statusLabels[selected.status]}
                  </span>
                  <h2>{selected.options.prompt}</h2>
                  <p>{selected.message}</p>
                  {selected.status !== 'running' &&
                    projectRuns.some((run) => run.id === selected.id) && (
                      <button
                        className="mission-button"
                        disabled={!!active || !loaded || pending || loadingCheckpoint}
                        onClick={() => void loadCheckpoint(selected.id)}
                      >
                        {loadingCheckpoint ? 'Loading checkpoint…' : 'Continue with…'}
                      </button>
                    )}
                </div>
                {selected.status === 'running' && (
                  <button
                    className="mission-button mission-stop"
                    disabled={cancelling}
                    onClick={() => void cancel()}
                  >
                    <Square size={13} /> {cancelling ? 'Stopping…' : 'Cancel run'}
                  </button>
                )}
              </div>
              <div className="mission-stages">
                {selectedStages.map((stage, index) => {
                  const done =
                    (selected.status === 'verified' ||
                      selected.status === 'planned' ||
                      selected.status === 'needs-review' ||
                      index < stageIndex) &&
                    (stage !== 'validating' ||
                      (selected.options.checks.length > 0 &&
                        selected.checks.length === selected.options.checks.length &&
                        selected.checks.every((c) => c.passed)));
                  return (
                    <div
                      key={stage}
                      className={`mission-stage ${done ? 'done' : ''} ${selected.stage === stage && selected.status === 'running' ? 'current' : ''}`}
                    >
                      <span>
                        {done ? <CheckCircle2 size={16} /> : String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>
                          {stage === 'planning'
                            ? selected.options.mode === 'copilot-pipeline'
                              ? 'Copilot brief'
                              : 'AGY brief'
                            : stage === 'implementing'
                              ? 'Codex implementation'
                              : 'Project checks'}
                        </strong>
                        <small>
                          {stage === 'planning'
                            ? selected.options.mode === 'copilot-pipeline'
                              ? 'CLI default'
                              : selected.options.agyModel || 'CLI default'
                            : stage === 'implementing'
                              ? `${selected.options.codexModel || 'CLI default'} · ${selected.options.codexEffort || 'default'} effort`
                              : `${selected.checks.filter((c) => c.passed).length}/${selected.options.checks.length} passed`}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mission-tabs" role="tablist" aria-label="Run details">
                {(['summary', 'brief', 'output'] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={view === tab}
                    aria-controls="mission-detail"
                    id={`mission-tab-${tab}`}
                    onClick={() => setView(tab)}
                  >
                    {tab === 'summary'
                      ? 'Result & checks'
                      : tab === 'brief'
                        ? 'Handoff brief'
                        : 'Live output'}
                  </button>
                ))}
              </div>
              <div
                ref={detailRef}
                className="mission-detail"
                id="mission-detail"
                role="tabpanel"
                aria-labelledby={`mission-tab-${view}`}
              >
                <div className="mission-copy-toolbar">
                  <CopyTextButton
                    text={
                      view === 'output'
                        ? selected.output
                        : view === 'brief'
                          ? selected.brief || ''
                          : [
                              selected.summary || selected.message,
                              ...(selected.unresolved ?? []),
                              ...selected.checks.map(
                                (c) =>
                                  `${c.passed ? 'PASS' : 'FAIL'} ${c.command} (exit ${c.exitCode ?? 'unknown'})`
                              ),
                            ].join('\n')
                    }
                    label={
                      view === 'output'
                        ? 'Copy output'
                        : view === 'brief'
                          ? 'Copy brief'
                          : 'Copy result'
                    }
                    selectionRoot={detailRef}
                    onError={setError}
                  />
                </div>
                {view === 'output' ? (
                  <pre ref={outputRef} className="mission-output">
                    {selected.output || 'Waiting for worker output…'}
                  </pre>
                ) : view === 'brief' ? (
                  <pre>
                    {selected.brief ||
                      (selected.options.mode === 'codex-only'
                        ? 'Direct implementation: no planning tokens spent.'
                        : 'The validated brief will appear here before handoff.')}
                  </pre>
                ) : (
                  <>
                    <p>{selected.summary || selected.message}</p>
                    {!!selected.unresolved?.length && (
                      <>
                        <h3>Remaining work</h3>
                        <ul>
                          {selected.unresolved.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {selected.codexSessionId && (
                      <p className="mission-hint">
                        Codex session: <code>{selected.codexSessionId}</code>
                      </p>
                    )}
                    {selected.options.sessionId && (
                      <p className="mission-hint">
                        Imported session: <code>{selected.options.sessionId}</code> ·{' '}
                        {selected.options.resumeSession
                          ? 'Original thread resumed'
                          : 'Context excerpt imported'}
                      </p>
                    )}
                    <p className="mission-hint">{selected.options.routingReason}</p>
                    <div className="mission-check-list">
                      {selected.checks.map((check, index) => (
                        <div key={index}>
                          <span className={check.passed ? 'mission-pass' : 'mission-fail'}>
                            {check.passed ? 'PASS' : 'FAIL'}
                          </span>
                          <code>{check.command}</code>
                          <span>exit {check.exitCode ?? 'unknown'}</span>
                        </div>
                      ))}
                    </div>
                    {!selected.options.checks.length && selected.options.mode !== 'agy-only' && (
                      <p className="mission-hint">No validation checks configured.</p>
                    )}
                    <div className="mission-usage">
                      <span>
                        Codex input{' '}
                        <strong>
                          {selected.usage?.inputTokens?.toLocaleString() ?? 'Unavailable'}
                        </strong>
                      </span>
                      <span>
                        Cached input{' '}
                        <strong>
                          {selected.usage?.cachedInputTokens?.toLocaleString() ?? 'Unavailable'}
                        </strong>
                      </span>
                      <span>
                        Codex output{' '}
                        <strong>
                          {selected.usage?.outputTokens?.toLocaleString() ?? 'Unavailable'}
                        </strong>
                      </span>
                    </div>
                    <p className="mission-hint">
                      Token counts are reported by Codex. Checks cover the configured commands.
                    </p>
                    <button
                      className="mission-button"
                      onClick={() =>
                        void tauriBridge
                          .workflowOpenArtifacts(selected.id)
                          .catch((e) => setError(String(e)))
                      }
                    >
                      <FolderOpen size={14} /> Open run artifacts
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          <section className="mission-history" aria-label="Run history">
            <div className="mission-section-heading">
              <h3>Project history</h3>
              <span>{projectRuns.length} runs</span>
            </div>
            {projectRuns.length === 0 ? (
              <p className="mission-hint">
                Runs and briefs stay available after restarting CmdGUI.
              </p>
            ) : (
              projectRuns.map((run) => (
                <button
                  key={run.id}
                  className={`mission-history-row ${selected?.id === run.id ? 'selected' : ''}`}
                  onClick={() => {
                    if (!window.getSelection()?.toString()) setSelectedId(run.id);
                  }}
                >
                  <span className={`mission-status ${run.status}`}>{statusLabels[run.status]}</span>
                  <span>{run.prompt}</span>
                  <time>{new Date(run.startedAt).toLocaleString()}</time>
                </button>
              ))
            )}
          </section>
        </main>
      </div>
    </section>
  );
};

export default DualBrainStudio;
