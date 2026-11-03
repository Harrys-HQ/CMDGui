import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tauriBridge } from '../tauriBridge';
import { CodexSession, SessionContext } from '../workflows';
import CopyTextButton from './CopyTextButton';

export interface SessionSelection {
  id: string;
  context: string;
  resume: boolean;
}

export default function CodexSessionPicker({
  cwd,
  disabled,
  selection,
  onChange,
  onError,
  implementation,
  onBusyChange,
}: {
  cwd?: string;
  disabled: boolean;
  selection: SessionSelection | null;
  onChange: (selection: SessionSelection | null) => void;
  onError: (error: string) => void;
  implementation: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [sessions, setSessions] = useState<CodexSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionContext | null>(null);
  const request = useRef(0);
  const invalidateRequests = useCallback(() => {
    request.current++;
  }, []);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    invalidateRequests();
    setSessions([]);
    setNextCursor(null);
    setLoaded(false);
    setSnapshot(null);
    setBusy(false);
    return invalidateRequests;
  }, [cwd, invalidateRequests]);

  const load = async (more = false) => {
    if (!cwd) return;
    const version = ++request.current;
    setBusy(true);
    try {
      const page = await tauriBridge.codexSessionsList(cwd, more ? nextCursor : null);
      if (version !== request.current) return;
      setSessions((prev) =>
        more
          ? [...prev, ...page.sessions.filter((s) => !prev.some((p) => p.id === s.id))]
          : page.sessions
      );
      setNextCursor(page.nextCursor);
      setLoaded(true);
    } catch (e) {
      if (version === request.current) onError(String(e));
    } finally {
      if (version === request.current) setBusy(false);
    }
  };

  const choose = async (id: string) => {
    if (!id || !cwd) {
      onChange(null);
      setSnapshot(null);
      return;
    }
    const version = ++request.current;
    setBusy(true);
    onChange(null);
    setSnapshot(null);
    try {
      const result = await tauriBridge.codexSessionContext(cwd, id);
      if (version !== request.current) return;
      setSnapshot(result);
      onChange({ id: result.session.id, context: result.context, resume: true });
    } catch (e) {
      if (version === request.current) onError(String(e));
    } finally {
      if (version === request.current) setBusy(false);
    }
  };

  return (
    <details className="mission-settings mission-session-picker">
      <summary>Continue a previous Codex session</summary>
      <p>
        Load local sessions for this project. Review the excerpt before sharing it with AGY.
        Browsing does not run inference.
      </p>
      <button
        type="button"
        className="mission-button"
        disabled={disabled || busy || !cwd}
        onClick={() => void load()}
      >
        {busy ? 'Loading…' : 'Load project sessions'}
      </button>
      {loaded && (
        <>
          <label className="mission-label" htmlFor="mission-session">
            Saved Codex session
          </label>
          <select
            id="mission-session"
            value={selection?.id || ''}
            disabled={disabled || busy}
            onChange={(e) => void choose(e.target.value)}
          >
            <option value="">Start a new session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id} disabled={s.status === 'active'}>
                {s.title} · {new Date(s.updatedAt * 1000).toLocaleDateString()}
                {s.status === 'active' ? ' (busy)' : ''}
              </option>
            ))}
          </select>
          {sessions.length === 0 && <p>No saved sessions found on this page for this project.</p>}
          {nextCursor && (
            <button
              type="button"
              className="mission-button"
              disabled={disabled || busy}
              onClick={() => void load(true)}
            >
              Load older sessions
            </button>
          )}
        </>
      )}
      {selection && (
        <>
          <label className="mission-label" htmlFor="mission-session-context">
            Context excerpt to share
          </label>
          <textarea
            id="mission-session-context"
            rows={6}
            value={selection.context}
            disabled={disabled}
            onChange={(e) => onChange({ ...selection, context: e.target.value })}
          />
          <p>
            {snapshot?.truncated ? 'Excerpt shortened to recent visible messages. ' : ''}Review and
            edit for relevance. Hidden reasoning and tool logs are excluded.
          </p>
          {implementation && (
            <label className="mission-check-option">
              <input
                type="checkbox"
                checked={selection.resume}
                disabled={disabled}
                onChange={(e) => onChange({ ...selection, resume: e.target.checked })}
              />
              Resume the original Codex thread for implementation
            </label>
          )}
          {implementation && (
            <p>
              {selection.resume
                ? 'Codex retains its original conversation history. Finish any active turn in that session before starting here.'
                : 'Codex starts a fresh thread using this excerpt, the new task, and AGY’s brief.'}
            </p>
          )}
          <CopyTextButton text={selection.context} label="Copy excerpt" onError={onError} />
          <button
            type="button"
            className="mission-button"
            disabled={disabled || busy}
            onClick={() => {
              onChange(null);
              setSnapshot(null);
            }}
          >
            Clear session
          </button>
        </>
      )}
    </details>
  );
}
