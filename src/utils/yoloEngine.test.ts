import { describe, it, expect } from 'vitest';
import { detectYoloPrompt, stripAnsi } from './yoloEngine';

describe('yoloEngine', () => {
  it('correctly strips ANSI escape codes', () => {
    const raw = '\x1B[32mSuccess!\x1B[0m \x1B[1;33mWarning\x1B[0m';
    expect(stripAnsi(raw)).toBe('Success! Warning');
  });

  it('detects standard [y/n] prompt and responds with "y\\r"', () => {
    const output = 'Do you want to continue? [y/n]: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('y\r');
    expect(match?.isDestructive).toBe(false);
  });

  it('detects AI auto-approve prompt and responds with Shift+Tab "\\x1b[Z"', () => {
    const output = 'Tool call: EditFile src/index.ts\nShift+Tab to auto-approve';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\x1b[Z');
  });

  it('detects interactive arrow menu and responds with Enter "\\r"', () => {
    const output = '? Pick an option (use arrow keys)\n❯ 1. Yes, apply changes\n  2. No, cancel';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects press enter to continue and responds with "\\r"', () => {
    const output = 'Update finished. Press enter to continue...';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects explicit numbered choices without cursor and responds with "1\\r"', () => {
    const output = 'Available actions:\n1. Yes, proceed\n2. No, abort\nEnter choice: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('1\r');
  });

  it('DOES NOT send "1\\r" for normal build output containing version numbers like 1.0.0 followed by [y/n]', () => {
    // The previous bug: "1." in version number 1.0.0 or duration 1.2s caused responseKey to become "1\r"
    const output = `
      Installing react@18.2.0 and vite@5.1.0...
      Completed in 1.4s.
      Do you want to proceed? [y/n]: 
    `;
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('y\r'); // NOT '1\r'!
  });

  it('DOES NOT trigger on normal build output or test runner output containing "1."', () => {
    const output = `
      > cmd-gui@2.4.2 test
      > vitest
      ✓ test 1. basic check passed
      ✓ test 2. advanced check passed
      Duration: 1.5s
    `;
    const match = detectYoloPrompt(output);
    expect(match).toBeNull();
  });

  it('flags destructive commands as isDestructive = true', () => {
    const output = 'rm -rf /tmp/data\nAre you sure you want to continue? [y/n]';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.isDestructive).toBe(true);
  });

  it('ignores old confirmation prompts that have already passed in historical output', () => {
    const output = `
      Do you want to continue? [y/n]
      Downloading packages...
      Extracting node_modules/package-a
      Extracting node_modules/package-b
      Extracting node_modules/package-c
      Installation complete. 42 packages added in 3.2s.
      Ready for development.
    `;
    const match = detectYoloPrompt(output);
    expect(match).toBeNull();
  });

  it('detects Claude Code tool approval prompt and selects default with "\\r"', () => {
    const output = 'Claude wants to edit src/App.tsx\n❯ 1. Yes, apply file edit\n  2. No, reject';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects Antigravity CLI run command confirmation and responds with "\\r"', () => {
    const output = 'Allow execution of: cargo test\n❯ 1. Run command\n  2. Cancel';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects Claude Code allow once / always prompt and responds with "y\\r"', () => {
    const output = 'Allow Claude to read package.json? [y/n/always]: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('y\r');
  });

  it('detects AGY interactive cursor "❯ 1. Yes, accept this change" and responds with "\\r"', () => {
    const output = 'Review changes in src/App.tsx:\n❯ 1. Yes, accept this change\n  2. No, reject';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects AGY numbered prompt "1. Yes, accept this change" and responds with "1\\r"', () => {
    const output = 'Apply file edit to src/App.tsx?\n1. Yes, accept this change\n2. No, reject\nEnter choice [1-2]: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('1\r');
  });

  it('detects AGY "1. Yes, always allow for this session" and responds with "1\\r"', () => {
    const output = 'Allow command execution?\n1. Yes, always allow for this session\n2. No\nEnter choice: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('1\r');
  });

  it('detects AGY "1. Apply this change" and responds with "1\\r"', () => {
    const output = 'File modified:\n1. Apply this change\n2. Discard\nChoice: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('1\r');
  });

  it('detects Claude Code standard 3-option choice and responds with "\\r"', () => {
    const output = 'Claude wants to run: npm run build\n❯ 1. Yes\n  2. Yes, don\'t ask again this session\n  3. No';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects Claude Code numbered permission prompt and responds with "1\\r"', () => {
    const output = 'Claude needs your permission to execute: git status\n1. Yes\n2. No\nSelect an option: ';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('1\r');
  });

  it('detects Claude Code workspace trust prompt and responds with "\\r"', () => {
    const output = 'Do you trust the files in this directory?\n❯ 1. Yes, proceed\n  2. No, exit';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });

  it('detects Claude Code "Accept and continue" choice and responds with "\\r"', () => {
    const output = 'Review changes:\n❯ 1. Accept and continue\n  2. Reject';
    const match = detectYoloPrompt(output);
    expect(match).not.toBeNull();
    expect(match?.responseKey).toBe('\r');
  });
});
