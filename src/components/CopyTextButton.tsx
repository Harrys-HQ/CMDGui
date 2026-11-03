import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../utils/clipboard';

export default function CopyTextButton({
  text,
  label = 'Copy',
  onError,
  selectionRoot,
}: {
  text: string;
  label?: string;
  onError: (error: string) => void;
  selectionRoot?: React.RefObject<HTMLElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    const selection = window.getSelection();
    const selected =
      selection &&
      selection.rangeCount > 0 &&
      selectionRoot?.current?.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.toString()
        : '';
    try {
      await copyText(selected || text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      onError(String(e));
    }
  };
  return (
    <button
      type="button"
      className="mission-button"
      disabled={!text}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => void copy()}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}
