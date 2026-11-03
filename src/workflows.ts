export type WorkflowMode = 'pipeline' | 'codex-only' | 'agy-only';
export type WorkflowStatus =
  | 'running'
  | 'verified'
  | 'planned'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'needs-review';

export interface WorkflowOptions {
  cwd: string;
  prompt: string;
  mode: WorkflowMode;
  checks: string[];
  timeoutMinutes: number;
  agyModel: string;
  codexModel: string;
  codexEffort: string;
  taskType: string;
  routingReason: string;
  sessionId?: string | null;
  sessionContext?: string;
  resumeSession?: boolean;
}

export const taskProfiles = {
  scoped: {
    label: 'Small, well-defined change',
    mode: 'codex-only',
    agyModel: 'gemini-3.8-flash-low',
    codexModel: 'gpt-6-luna',
    codexEffort: 'medium',
    reason:
      'One implementation agent; skip planning when the files and desired behavior are clear.',
  },
  complex: {
    label: 'Complex bug or refactor',
    mode: 'codex-only',
    agyModel: 'gemini-3.8-flash-medium',
    codexModel: 'gpt-6.1-sol',
    codexEffort: 'high',
    reason:
      'Use deeper coding reasoning for interacting state, lifecycle issues, or a difficult refactor.',
  },
  discovery: {
    label: 'Feature needing repository discovery',
    mode: 'pipeline',
    agyModel: 'gemini-3.8-flash-medium',
    codexModel: 'gpt-6.1-sol',
    codexEffort: 'medium',
    reason:
      'AGY produces a compact evidence-based brief; Codex implements without repeating the repository survey.',
  },
  analysis: {
    label: 'Investigation / implementation plan only',
    mode: 'agy-only',
    agyModel: 'gemini-3.8-flash-low',
    codexModel: 'gpt-6.1-sol',
    codexEffort: 'medium',
    reason: 'Return a read-only brief; skip implementation and checks.',
  },
} satisfies Record<
  string,
  {
    label: string;
    mode: WorkflowMode;
    agyModel: string;
    codexModel: string;
    codexEffort: string;
    reason: string;
  }
>;

export type TaskType = keyof typeof taskProfiles;

export function resolveRoute(taskType: TaskType, override: 'auto' | WorkflowMode) {
  const profile = taskProfiles[taskType];
  const manualReasons = {
    pipeline:
      'AGY investigates, then Codex implements from the saved brief and the coordinator runs checks.',
    'codex-only': 'Codex investigates and implements directly, then the coordinator runs checks.',
    'agy-only': 'AGY produces a read-only brief. Implementation and checks are skipped.',
  };
  return {
    mode: override === 'auto' ? profile.mode : override,
    reason: override === 'auto' ? profile.reason : manualReasons[override],
  };
}

export interface WorkflowRun {
  id: string;
  options: WorkflowOptions;
  status: WorkflowStatus;
  stage: string;
  startedAt: number;
  finishedAt: number | null;
  message: string;
  brief: string | null;
  summary: string | null;
  output: string;
  usage: {
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
  } | null;
  checks: { command: string; exitCode: number | null; passed: boolean }[];
  artifactDir: string;
  codexSessionId?: string | null;
}

export interface CodexSession {
  id: string;
  title: string;
  cwd: string;
  updatedAt: number;
  status: string;
}

export interface SessionContext {
  session: CodexSession;
  context: string;
  truncated: boolean;
}
