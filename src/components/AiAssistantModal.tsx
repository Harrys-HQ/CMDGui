import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Terminal, ArrowRight, Copy, Check } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
}

const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onRunCommand,
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);

    // Mock AI Command Generation logic tailored to shell tasks
    setTimeout(() => {
      const query = prompt.toLowerCase();
      let cmd = 'git status';
      let exp = 'Shows the working tree status.';

      if (query.includes('find') || query.includes('search')) {
        cmd = 'Get-ChildItem -Recurse -Filter *.log | Select-Object -First 10';
        exp = 'Searches recursively for log files in the current folder.';
      } else if (query.includes('port') || query.includes('kill')) {
        cmd = 'Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process';
        exp = 'Finds and terminates process running on port 3000.';
      } else if (query.includes('build') || query.includes('compile')) {
        cmd = 'npm run build';
        exp = 'Triggers project build process.';
      } else if (query.includes('branch') || query.includes('checkout')) {
        cmd = 'git checkout -b feature/new-ai-tool';
        exp = 'Creates and switches to a new Git feature branch.';
      } else {
        cmd = `echo "Executing AI intent: ${prompt.replace(/"/g, '')}"`;
        exp = 'Generates command based on natural language input.';
      }

      setGeneratedCommand(cmd);
      setExplanation(exp);
      setIsGenerating(false);
    }, 600);
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
          width: '650px',
          height: 'auto',
          maxHeight: '520px',
          background: 'var(--bg-modal)',
          backdropFilter: 'blur(16px)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 1px 1px var(--accent-primary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title" style={{ fontSize: '16px' }}>AI Natural Language Command Generator</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {['Kill port 3000', 'Search log files', 'Checkout new git branch', 'Run dev build'].map((chip) => (
              <span
                key={chip}
                onClick={() => setPrompt(chip)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--fg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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
                ✨ {chip}
              </span>
            ))}
          </div>
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what terminal task or command you want to run..."
                style={{
                  flex: 1,
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--fg-active)',
                  padding: '12px 16px',
                  fontSize: '14px',
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
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'} <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {generatedCommand && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                background: 'var(--bg-sidebar)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--fg-secondary)', fontWeight: 700, marginBottom: '8px' }}>
                Generated Shell Command
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  background: 'var(--bg-root)',
                  padding: '12px',
                  borderRadius: '6px',
                  color: '#ce9178',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflowX: 'auto',
                }}
              >
                <code>{generatedCommand}</code>
                <button
                  onClick={handleCopy}
                  title="Copy command"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--fg-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: '8px',
                  }}
                >
                  {copied ? <Check size={16} color="#4caf50" /> : <Copy size={16} />}
                </button>
              </div>

              {explanation && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--fg-secondary)' }}>
                  💡 {explanation}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="primary-btn"
                  onClick={() => {
                    onRunCommand(generatedCommand);
                    onClose();
                  }}
                  style={{
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Terminal size={14} /> Run Command in Terminal
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
