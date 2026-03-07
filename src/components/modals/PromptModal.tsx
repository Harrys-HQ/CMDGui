import React, { useState, useEffect, useRef } from 'react';
import '../../modal.css';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  initialValue = '',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div
        className="modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
            }}
          />
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '6px 12px',
                background: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
