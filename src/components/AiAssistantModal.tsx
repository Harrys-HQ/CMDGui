import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Copy, Check, Play, PlusCircle } from 'lucide-react';

export type AiToolMode = 'agy' | 'claude' | 'gemini' | 'aider' | 'shell';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string, inNewTab?: boolean) => void;
}

interface PresetChip {
  label: string;
  prompt: string;
  command?: string;
  explanation?: string;
}

const PRESETS_BY_MODE: Record<AiToolMode, PresetChip[]> = {
  agy: [
    {
      label: '🚀 /boost (Fast Deep Coding)',
      prompt: '/boost Refactor codebase and verify all tests pass',
      command: 'agy /boost "Refactor codebase and verify all tests pass"',
      explanation: 'Launches Antigravity with boosted strategic planning and multi-perspective verification.',
    },
    {
      label: '🎯 /goal (Autonomous Goal)',
      prompt: '/goal Audit project and fix all build warnings',
      command: 'agy /goal "Audit project and fix all build warnings"',
      explanation: 'Runs long-running autonomous workflow until the objective is fully achieved.',
    },
    {
      label: '🧠 /grill-me (Design Alignment)',
      prompt: '/grill-me Review architecture and resolve technical decisions',
      command: 'agy /grill-me "Review architecture and resolve technical decisions"',
      explanation: 'Starts an interactive interview to align on design decisions before execution.',
    },
    {
      label: '📋 /plan (Step Planning)',
      prompt: '/plan Break down next feature into verified steps',
      command: 'agy /plan "Break down next feature into verified steps"',
      explanation: 'Creates a structured step-by-step implementation plan.',
    },
    {
      label: '👥 /teamwork (Agent Swarm)',
      prompt: '/teamwork Coordinate parallel tasks across subagents',
      command: 'agy /teamwork "Coordinate parallel tasks across subagents"',
      explanation: 'Orchestrates multiple autonomous agent workers in parallel.',
    },
  ],
  claude: [
    {
      label: '🔍 Review Git Diff',
      prompt: 'Review the current git diff for bugs and styling inconsistencies',
      command: 'claude "Review the current git diff for bugs and styling inconsistencies"',
      explanation: 'Instructs Claude Code to inspect uncommitted changes and provide feedback.',
    },
    {
      label: '🛠️ Fix Type Errors',
      prompt: 'Run tsc and fix all TypeScript compilation errors',
      command: 'claude "Run tsc and fix all TypeScript compilation errors"',
      explanation: 'Directs Claude to run TypeScript checks and repair errors in place.',
    },
    {
      label: '🧪 Add Unit Tests',
      prompt: 'Generate unit tests with Vitest for components lacking coverage',
      command: 'claude "Generate unit tests with Vitest for components lacking coverage"',
      explanation: 'Scaffolds comprehensive test suites for untested modules.',
    },
    {
      label: '⚡ Performance Audit',
      prompt: 'Identify bottlenecks and optimize rendering performance',
      command: 'claude "Identify bottlenecks and optimize rendering performance"',
      explanation: 'Analyzes React rendering cycles and memory usage.',
    },
  ],
  gemini: [
    {
      label: '📖 Explain Codebase',
      prompt: 'Explain repo architecture, folder layout, and key entry points',
      command: 'gemini "Explain repo architecture, folder layout, and key entry points"',
      explanation: 'Generates a high-level walkthrough of the current project structure.',
    },
    {
      label: '🛡️ Security Audit',
      prompt: 'Audit project dependencies and API endpoints for vulnerabilities',
      command: 'gemini "Audit project dependencies and API endpoints for vulnerabilities"',
      explanation: 'Checks package dependencies and code patterns for security risks.',
    },
    {
      label: '📝 Generate Docs',
      prompt: 'Create markdown documentation for recent feature additions',
      command: 'gemini "Create markdown documentation for recent feature additions"',
      explanation: 'Drafts developer documentation and usage examples.',
    },
    {
      label: '🧹 Refactor Dirty Files',
      prompt: 'Clean up uncommitted modified files and ensure code style adherence',
      command: 'gemini "Clean up uncommitted modified files and ensure code style adherence"',
      explanation: 'Polishes touched files according to project guidelines.',
    },
  ],
  aider: [
    {
      label: '🏗️ Architect Mode',
      prompt: 'Refactor state architecture cleanly across components',
      command: 'aider --architect --message "Refactor state architecture cleanly across components"',
      explanation: 'Uses reasoning model for architecture before editing files.',
    },
    {
      label: '🧪 Auto-Test & Repair',
      prompt: 'Run tests and fix failures',
      command: 'aider --test "npm test" --message "Fix failing unit tests"',
      explanation: 'Iteratively runs test suite and applies fixes until all tests pass.',
    },
    {
      label: '💾 Auto-Commit Chat',
      prompt: 'Complete task and commit with clean message',
      command: 'aider --auto-commits --message "Implement clean task handler"',
      explanation: 'Automatically creates git commits after each successful edit.',
    },
  ],
  shell: [
    {
      label: '🛑 Kill Port 3000',
      prompt: 'Kill process on port 3000',
      command: 'Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process',
      explanation: 'Finds and terminates the process occupying local port 3000.',
    },
    {
      label: '📦 Find Files >50MB',
      prompt: 'Find large files over 50MB',
      command: 'Get-ChildItem -Recurse -File | Where-Object Length -gt 50MB | Sort-Object Length -Descending | Select-Object -First 10',
      explanation: 'Recursively locates the top 10 largest files exceeding 50MB.',
    },
    {
      label: '🔍 Search Log Files',
      prompt: 'Search log files',
      command: 'Get-ChildItem -Recurse -Filter *.log | Select-Object -First 10',
      explanation: 'Searches recursively for log files in the current folder.',
    },
    {
      label: '🌿 Git Sync & Prune',
      prompt: 'Fetch and prune remote git branches',
      command: 'git fetch --prune && git status',
      explanation: 'Fetches latest commits and cleans up deleted remote tracking branches.',
    },
    {
      label: '🧹 Clean node_modules',
      prompt: 'Clean reinstall node modules',
      command: 'npx rimraf node_modules package-lock.json && npm install',
      explanation: 'Performs a completely fresh install of dependencies.',
    },
    {
      label: '🐳 Docker Prune',
      prompt: 'Prune unused docker resources',
      command: 'docker system prune -af --volumes',
      explanation: 'Frees disk space by removing all unused Docker containers and images.',
    },
  ],
};

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onRunCommand,
}) => {
  const [mode, setMode] = useState<AiToolMode>('agy');
  const [prompt, setPrompt] = useState('');
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (chip: PresetChip) => {
    setPrompt(chip.prompt);
    if (chip.command) {
      setGeneratedCommand(chip.command);
      setExplanation(chip.explanation || '');
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const query = prompt.trim();
    if (!query) return;

    setIsGenerating(true);

    setTimeout(() => {
      let cmd = '';
      let exp = '';
      const cleanPrompt = query.replace(/"/g, '\\"');

      if (mode === 'agy') {
        if (query.startsWith('/')) {
          cmd = `agy ${query}`;
          exp = 'Runs Antigravity slash command workflow.';
        } else {
          cmd = `agy "${cleanPrompt}"`;
          exp = 'Executes Antigravity agentic coding workflow.';
        }
      } else if (mode === 'claude') {
        cmd = `claude "${cleanPrompt}"`;
        exp = 'Invokes Claude Code interactive AI coding session.';
      } else if (mode === 'gemini') {
        cmd = `gemini "${cleanPrompt}"`;
        exp = 'Runs Gemini CLI with context from current repository.';
      } else if (mode === 'aider') {
        cmd = `aider --message "${cleanPrompt}"`;
        exp = 'Runs Aider AI pair programmer with the specified instruction.';
      } else {
        // Intelligent shell parsing for common operations
        const lower = query.toLowerCase();
        const portMatch = lower.match(/(?:port|kill|listen(?:ing)?)\s*[:=]?\s*(\d{2,5})/i) || lower.match(/(\d{4,5})/);
        
        if (portMatch && (lower.includes('kill') || lower.includes('stop') || lower.includes('close') || lower.includes('port'))) {
          const portNum = portMatch[1];
          cmd = `Get-Process -Id (Get-NetTCPConnection -LocalPort ${portNum}).OwningProcess | Stop-Process`;
          exp = `Finds and terminates process running on port ${portNum}.`;
        } else if (lower.includes('find') && (lower.includes('large') || lower.includes('size') || lower.includes('mb') || lower.includes('gb'))) {
          cmd = 'Get-ChildItem -Recurse -File | Where-Object Length -gt 50MB | Sort-Object Length -Descending | Select-Object -First 10';
          exp = 'Finds top 10 files larger than 50MB sorted by size.';
        } else if (lower.includes('find') || lower.includes('search')) {
          const extMatch = lower.match(/\*?\.([a-z0-9]+)/i);
          const ext = extMatch ? `*.${extMatch[1]}` : '*.log';
          cmd = `Get-ChildItem -Recurse -Filter ${ext} | Select-Object -First 15`;
          exp = `Searches recursively for ${ext} files in current workspace.`;
        } else if (lower.includes('build') || lower.includes('compile')) {
          cmd = 'npm run build';
          exp = 'Executes project build pipeline.';
        } else if (lower.includes('test') || lower.includes('spec')) {
          cmd = 'npm test -- --run';
          exp = 'Runs unit test suite once.';
        } else if (lower.includes('branch') || lower.includes('checkout')) {
          const branchName = query.split(/\s+/).pop()?.replace(/[^a-zA-Z0-9_\-/]/g, '') || 'feature/ai-enhancement';
          cmd = `git checkout -b ${branchName}`;
          exp = `Creates and checks out new branch '${branchName}'.`;
        } else if (lower.includes('git') && (lower.includes('undo') || lower.includes('revert'))) {
          cmd = 'git reset --soft HEAD~1';
          exp = 'Undoes the most recent commit while keeping your staged file changes.';
        } else if (lower.includes('docker') && lower.includes('prune')) {
          cmd = 'docker system prune -af --volumes';
          exp = 'Removes all unused Docker containers, networks, and images.';
        } else {
          cmd = query;
          exp = 'Shell command ready for execution.';
        }
      }

      setGeneratedCommand(cmd);
      setExplanation(exp);
      setIsGenerating(false);
    }, 250);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '720px',
          maxWidth: '94vw',
          maxHeight: '88vh',
          background: 'var(--bg-modal)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65), 0 0 1px 1px var(--accent-primary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px', margin: 0 }}>
                AI CLI & Workflow Command Center
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>
                Generate agentic prompts, slash commands, and smart terminal tasks
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} style={{ fontSize: '20px', background: 'transparent', border: 'none', color: 'var(--fg-secondary)', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Tool Selector Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'agy', label: '🤖 Antigravity (agy)' },
                { id: 'claude', label: '🧠 Claude Code' },
                { id: 'gemini', label: '♊ Gemini CLI' },
                { id: 'aider', label: '🦙 Aider' },
                { id: 'shell', label: '💻 Shell / PS' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setMode(t.id);
                  setGeneratedCommand('');
                  setExplanation('');
                }}
                style={{
                  fontSize: '12px',
                  fontWeight: mode === t.id ? 600 : 400,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: mode === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: mode === t.id ? 'var(--accent-glow)' : 'var(--bg-root)',
                  color: mode === t.id ? 'var(--fg-active)' : 'var(--fg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Preset Chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {PRESETS_BY_MODE[mode].map((chip) => (
              <span
                key={chip.label}
                onClick={() => handleSelectPreset(chip)}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: '14px',
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--fg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--fg-active)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--fg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'agy'
                    ? 'Enter Antigravity task or slash command (/boost, /goal, /plan)...'
                    : mode === 'claude'
                    ? 'Describe what you want Claude Code to do...'
                    : mode === 'gemini'
                    ? 'Enter query for Gemini CLI...'
                    : mode === 'aider'
                    ? 'Describe pair programming task for Aider...'
                    : 'Describe what terminal command or shell task you want...'
                }
                style={{
                  flex: 1,
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--fg-active)',
                  padding: '12px 16px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="primary-btn"
                style={{
                  borderRadius: '8px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  fontWeight: 600,
                  cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
                  opacity: isGenerating || !prompt.trim() ? 0.6 : 1,
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'} <ArrowRight size={15} />
              </button>
            </div>
          </form>

          {/* Generated Result */}
          {generatedCommand && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                background: 'var(--bg-sidebar)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: 'var(--fg-secondary)',
                  fontWeight: 700,
                  marginBottom: '8px',
                  letterSpacing: '0.5px',
                }}
              >
                Executable Command
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  background: 'var(--bg-root)',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  color: '#9cdcfe',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflowX: 'auto',
                }}
              >
                <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{generatedCommand}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy command"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--fg-secondary)',
                    cursor: 'pointer',
                    padding: '6px',
                    marginLeft: '12px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {copied ? <Check size={16} color="#4caf50" /> : <Copy size={16} />}
                </button>
              </div>

              {explanation && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                  💡 {explanation}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="welcome-btn"
                  onClick={() => {
                    onRunCommand(generatedCommand, true);
                    onClose();
                  }}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--fg-active)',
                  }}
                >
                  <PlusCircle size={14} /> Run in New Tab
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    onRunCommand(generatedCommand, false);
                    onClose();
                  }}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Play size={14} /> Run in Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAssistantModal;
