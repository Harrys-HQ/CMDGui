import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import Terminal from './Terminal';
import {
  Sparkles,
  Play,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ChevronDown,
  Layers,
  Terminal as TermIcon,
  Shield,
  Send,
  Check,
  Bot,
  Zap,
} from 'lucide-react';
import { globalPtyRegistry } from '../utils/terminalUtils';
import { tauriBridge } from '../tauriBridge';
import { TerminalTheme, TerminalRendererType } from '../types';
import { Keymap } from '../hooks/useKeybindings';

export type LeadBrain = 'gemini' | 'codex';
export type WorkflowStage = 'idle' | 'agy-running' | 'codex-running' | 'completed';

export interface WorkflowItem {
  id: string;
  userPrompt: string;
  leadBrain: LeadBrain;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
  stage: WorkflowStage;
  agySummary?: string;
  codexSummary?: string;
}

interface DualBrainStudioProps {
  cwd?: string;
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

const DualBrainStudio: React.FC<DualBrainStudioProps> = ({
  cwd,
  onClose,
  terminalTheme,
  customTheme,
  terminalFontSize = 13,
  terminalScrollback = 2000,
  keymap,
  isGPUAccelerationEnabled = true,
  terminalRendererType = 'webgl',
  isYoloModeEnabled = false,
}) => {
  const [leadBrain, setLeadBrain] = useState<LeadBrain>('gemini');
  const [prompt, setPrompt] = useState('');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowItem | null>(null);
  const [history, setHistory] = useState<WorkflowItem[]>([]);
  const [dispatchMode, setDispatchMode] = useState<'pipeline' | 'agy-only' | 'codex-only'>('pipeline');
  const [isLeadMenuOpen, setIsLeadMenuOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'both' | 'agy' | 'codex'>('both');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat stream
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeWorkflow, history]);

  // Dispatch a command into a specific terminal PTY
  const sendToTerminal = useCallback((paneId: string, cmd: string) => {
    const entry = globalPtyRegistry[paneId];
    if (entry && entry.pid) {
      tauriBridge.writeTerminal(entry.pid, `${cmd}\r`);
      return true;
    }
    return false;
  }, []);

  const handleStartWorkflow = (customText?: string) => {
    const textToRun = (customText || prompt).trim();
    if (!textToRun) return;

    const newWorkflow: WorkflowItem = {
      id: Date.now().toString(),
      userPrompt: textToRun,
      leadBrain,
      status: 'running',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stage: dispatchMode === 'codex-only' ? 'codex-running' : 'agy-running',
    };

    setActiveWorkflow(newWorkflow);
    setPrompt('');

    // Execute first stage
    if (dispatchMode === 'codex-only') {
      sendToTerminal('dual-studio-codex', `codex "${textToRun.replace(/"/g, '\\"')}"`);
    } else if (dispatchMode === 'agy-only') {
      sendToTerminal('dual-studio-agy', `agy "${textToRun.replace(/"/g, '\\"')}"`);
    } else {
      // Pipeline: agy first, then handoff
      sendToTerminal(
        'dual-studio-agy',
        `agy "Analyze repository architecture, schemas, and contracts relevant to: ${textToRun.replace(/"/g, '\\"')}, then produce an architectural implementation dossier"`
      );
    }
  };

  const handleHandoffToCodex = () => {
    if (!activeWorkflow) return;
    setActiveWorkflow((prev) => (prev ? { ...prev, stage: 'codex-running', agySummary: 'Gemini architecture ingestion complete.' } : null));

    const promptText = activeWorkflow.userPrompt.replace(/"/g, '\\"');
    sendToTerminal(
      'dual-studio-codex',
      `codex "Implement the following feature based on current repository context and verify tests: ${promptText}"`
    );
  };

  const handleCompleteWorkflow = () => {
    if (!activeWorkflow) return;
    const completed: WorkflowItem = {
      ...activeWorkflow,
      status: 'completed',
      stage: 'completed',
      codexSummary: 'Codex implementation & verification finished successfully.',
    };
    setHistory((prev) => [completed, ...prev]);
    setActiveWorkflow(null);
  };

  const handleRestartPanes = () => {
    sendToTerminal('dual-studio-agy', 'clear');
    sendToTerminal('dual-studio-codex', 'clear');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Studio Header Bar */}
      <div
        style={{
          height: '42px',
          background: 'var(--bg-surface-l1)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--fg-active)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <Zap size={14} style={{ color: 'var(--neon-amber)' }} />
            Dual-Brain Mission Control
          </div>

          {/* Lead Brain Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsLeadMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'var(--bg-surface-l2)',
                border: '1px solid var(--border-color)',
                color: 'var(--fg-primary)',
                cursor: 'pointer',
              }}
            >
              <span>Lead:</span>
              <span style={{ color: leadBrain === 'gemini' ? '#60a5fa' : '#34d399' }}>
                {leadBrain === 'gemini' ? '♊ Gemini (agy)' : '🟢 GPT 6.1 (codex)'}
              </span>
              <ChevronDown size={12} />
            </button>

            {isLeadMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'var(--bg-surface-l2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  minWidth: '180px',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => {
                    setLeadBrain('gemini');
                    setIsLeadMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: leadBrain === 'gemini' ? 'var(--fg-active)' : 'var(--fg-secondary)',
                    background: leadBrain === 'gemini' ? 'var(--bg-surface-active)' : 'transparent',
                  }}
                >
                  <span>♊ Gemini 3.8 Flash (agy)</span>
                  {leadBrain === 'gemini' && <Check size={12} />}
                </div>
                <div
                  onClick={() => {
                    setLeadBrain('codex');
                    setIsLeadMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: leadBrain === 'codex' ? 'var(--fg-active)' : 'var(--fg-secondary)',
                    background: leadBrain === 'codex' ? 'var(--bg-surface-active)' : 'transparent',
                  }}
                >
                  <span>🟢 GPT 6.1 Sol (codex)</span>
                  {leadBrain === 'codex' && <Check size={12} />}
                </div>
              </div>
            )}
          </div>

          {/* Active CWD badge */}
          {cwd && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Folder: <code style={{ color: 'var(--fg-secondary)' }}>{cwd.split(/[\\/]/).pop()}</code>
            </span>
          )}
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-surface-l2)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
            {(['both', 'agy', 'codex'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveRightTab(view)}
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: activeRightTab === view ? 600 : 400,
                  borderRadius: '4px',
                  border: 'none',
                  background: activeRightTab === view ? 'var(--accent-primary)' : 'transparent',
                  color: activeRightTab === view ? '#fff' : 'var(--fg-secondary)',
                  cursor: 'pointer',
                }}
              >
                {view === 'both' ? 'Split View' : view === 'agy' ? 'Gemini Only' : 'Codex Only'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRestartPanes}
            title="Clear terminal screens"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--fg-secondary)',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <RefreshCw size={12} /> Clear
          </button>

          <button
            onClick={onClose}
            title="Return to standard tabs"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--fg-secondary)',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <X size={13} /> Exit Studio
          </button>
        </div>
      </div>

      {/* Main 3-Pane Body */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Group orientation="horizontal" style={{ width: '100%', height: '100%' }}>
          {/* ================= LEFT PANE: ORCHESTRATOR ================= */}
          <Panel defaultSize={38} minSize={25} maxSize={55} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface-l1)' }}>
            {/* Orchestrator Top Summary */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface-l2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-active)' }}>
                  Autonomous Orchestrator
                </span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: activeWorkflow ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeWorkflow ? 'var(--neon-run)' : 'var(--text-muted)',
                  border: `1px solid ${activeWorkflow ? 'var(--neon-run)' : 'var(--border-color)'}`,
                }}
              >
                {activeWorkflow ? `● Step: ${activeWorkflow.stage.replace('-running', '')}` : '○ Ready'}
              </span>
            </div>

            {/* Workflow Stream / Activity Ledger */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* If no tasks active and history empty */}
              {!activeWorkflow && history.length === 0 && (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={20} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                  <div>
                    <strong style={{ color: 'var(--fg-secondary)', display: 'block', marginBottom: '4px' }}>
                      Dual-Brain Pipeline Ready
                    </strong>
                    Type a task below or pick a preset chip to let Gemini ingest & Codex implement.
                  </div>
                </div>
              )}

              {/* Active Workflow Card */}
              {activeWorkflow && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-l2)',
                    border: '1px solid var(--accent-primary)',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', color: 'var(--accent-hover)', fontWeight: 600 }}>
                      ACTIVE WORKFLOW
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {activeWorkflow.timestamp}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-active)' }}>
                    "{activeWorkflow.userPrompt}"
                  </div>

                  {/* Flow Stages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {/* Stage 1: Gemini */}
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: activeWorkflow.stage === 'agy-running' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-l3)',
                        border: `1px solid ${activeWorkflow.stage === 'agy-running' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                        <span>♊ Phase 1: Gemini 3.8 Flash Context</span>
                      </div>
                      <span style={{ fontSize: '10px', color: activeWorkflow.stage === 'agy-running' ? 'var(--accent-hover)' : 'var(--neon-run)', fontWeight: 600 }}>
                        {activeWorkflow.stage === 'agy-running' ? 'Working in top pane...' : '✓ Done'}
                      </span>
                    </div>

                    {/* Stage 2: Codex */}
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: activeWorkflow.stage === 'codex-running' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-l3)',
                        border: `1px solid ${activeWorkflow.stage === 'codex-running' ? 'var(--neon-run)' : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                        <span>🟢 Phase 2: GPT 6.1 Sol Implementation</span>
                      </div>
                      <span style={{ fontSize: '10px', color: activeWorkflow.stage === 'codex-running' ? 'var(--neon-run)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {activeWorkflow.stage === 'codex-running' ? 'Coding in bottom pane...' : 'Waiting'}
                      </span>
                    </div>
                  </div>

                  {/* Workflow Action Controls */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {activeWorkflow.stage === 'agy-running' && (
                      <button
                        onClick={handleHandoffToCodex}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, var(--neon-run), #059669)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        Hand Off to Codex <ArrowRight size={13} />
                      </button>
                    )}

                    <button
                      onClick={handleCompleteWorkflow}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: 'var(--bg-surface-l3)',
                        color: 'var(--fg-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={12} /> Mark Complete
                    </button>
                  </div>
                </div>
              )}

              {/* History Items */}
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-l2)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--neon-run)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={11} /> COMPLETED WORKFLOW
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--fg-primary)' }}>{item.userPrompt}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Dual-Brain execution completed across Gemini 3.8 Flash & GPT 6.1 Sol.
                  </div>
                </div>
              ))}

              <div ref={chatBottomRef} />
            </div>

            {/* Prompt Dispatcher & Action Chips */}
            <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface-l2)' }}>
              {/* Fast Action Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                {[
                  { label: '🚀 Full Refactor Loop', prompt: 'Refactor feature architecture and verify with unit tests' },
                  { label: '🛡️ Security & Bug Audit', prompt: 'Audit repository for security vulnerabilities and race conditions' },
                  { label: '📝 Auto-Docs & API Dossier', prompt: 'Map full repository data models and output clean developer documentation' },
                  { label: '⚡ Interactive Codex', prompt: 'codex' },
                  { label: '♊ Interactive Antigravity', prompt: 'agy' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      if (chip.prompt === 'codex') {
                        sendToTerminal('dual-studio-codex', 'codex');
                      } else if (chip.prompt === 'agy') {
                        sendToTerminal('dual-studio-agy', 'agy');
                      } else {
                        handleStartWorkflow(chip.prompt);
                      }
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      background: 'var(--bg-surface-l3)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--fg-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleStartWorkflow();
                    }
                  }}
                  placeholder="Enter task... (Gemini will ingest context, Codex will implement)"
                  rows={2}
                  style={{
                    flex: 1,
                    resize: 'none',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--fg-active)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => handleStartWorkflow()}
                  disabled={!prompt.trim()}
                  style={{
                    height: '48px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    background: prompt.trim()
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))'
                      : 'var(--bg-surface-l3)',
                    color: prompt.trim() ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} /> Send
                </button>
              </div>

              {/* Mode toggles */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="dispatchMode"
                    checked={dispatchMode === 'pipeline'}
                    onChange={() => setDispatchMode('pipeline')}
                  />
                  Auto-Pipeline (agy ➔ codex)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="dispatchMode"
                    checked={dispatchMode === 'agy-only'}
                    onChange={() => setDispatchMode('agy-only')}
                  />
                  Antigravity Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="dispatchMode"
                    checked={dispatchMode === 'codex-only'}
                    onChange={() => setDispatchMode('codex-only')}
                  />
                  Codex Only
                </label>
              </div>
            </div>
          </Panel>

          <Separator className="pane-resizer-vertical" />

          {/* ================= RIGHT PANE: DUAL LIVE TERMINALS ================= */}
          <Panel defaultSize={62} minSize={45} style={{ height: '100%', background: 'var(--bg-canvas)' }}>
            <Group orientation="vertical" style={{ width: '100%', height: '100%' }}>
              {/* TOP RIGHT: ANTIGRAVITY (GEMINI) */}
              {(activeRightTab === 'both' || activeRightTab === 'agy') && (
                <Panel defaultSize={50} minSize={20} style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div
                    style={{
                      height: '28px',
                      background: 'var(--bg-surface-l2)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#60a5fa' }}>
                      <TermIcon size={12} /> ♊ Antigravity CLI (Gemini 3.8 Flash Context Engine)
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Live Terminal (agy)</span>
                  </div>

                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <Terminal
                      paneId="dual-studio-agy"
                      cwd={cwd}
                      initialCommand="agy"
                      isActive={true}
                      theme={terminalTheme}
                      customTheme={customTheme}
                      fontSize={terminalFontSize}
                      scrollback={terminalScrollback}
                      keymap={keymap}
                      isGPUAccelerationEnabled={isGPUAccelerationEnabled}
                      terminalRendererType={terminalRendererType}
                      isYoloModeEnabled={isYoloModeEnabled}
                      showPaneControls={false}
                    />
                  </div>
                </Panel>
              )}

              {activeRightTab === 'both' && <Separator className="pane-resizer-horizontal" />}

              {/* BOTTOM RIGHT: OPENAI CODEX (GPT 6.1 SOL) */}
              {(activeRightTab === 'both' || activeRightTab === 'codex') && (
                <Panel defaultSize={50} minSize={20} style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div
                    style={{
                      height: '28px',
                      background: 'var(--bg-surface-l2)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#34d399' }}>
                      <TermIcon size={12} /> 🟢 OpenAI Codex CLI (GPT 6.1 Sol Reasoning Engine)
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Live Terminal (codex)</span>
                  </div>

                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <Terminal
                      paneId="dual-studio-codex"
                      cwd={cwd}
                      initialCommand="codex"
                      isActive={true}
                      theme={terminalTheme}
                      customTheme={customTheme}
                      fontSize={terminalFontSize}
                      scrollback={terminalScrollback}
                      keymap={keymap}
                      isGPUAccelerationEnabled={isGPUAccelerationEnabled}
                      terminalRendererType={terminalRendererType}
                      isYoloModeEnabled={isYoloModeEnabled}
                      showPaneControls={false}
                    />
                  </div>
                </Panel>
              )}
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
};

export default DualBrainStudio;
