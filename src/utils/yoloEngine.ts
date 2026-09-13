/**
 * YOLO Mode Auto-Approval & Guardrail Engine
 * Detects interactive CLI confirmation prompts and selects appropriate automated responses.
 */

export interface YoloPromptMatch {
  isConfirmation: boolean;
  isDestructive: boolean;
  responseKey: string;
  matchedPattern: string;
}

// Strip ANSI escape sequences (CSI, OSC, control sequences)
export const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?(?:\x07|\x1B\\))/g, '');
};

const DESTRUCTIVE_REGEXES: RegExp[] = [
  // File system & OS destruction
  /\bdrop\s+database\b/i,
  /\brm\s+-[a-z]*r[a-z]*f\b/i,
  /\bformat\s+[a-z]:/i,
  /\bdelete\s+all\b/i,
  /\btruncate\s+table\b/i,
  /\bsudo\s+rm\b/i,
  /\bdel\s+\/[sfa-z\s]*\b/i,
  /\brd\s+\/[sqa-z\s]*\b/i,
  /\bremove-item\s+.*-recurse\b/i,
  // Git destructive actions
  /\b(git\s+)?reset\s+--hard\b/i,
  /\b(git\s+)?push\s+.*(--force|-f)\b/i,
  /\b(git\s+)?clean\s+-[a-z]*f\b/i,
  /\b(git\s+)?branch\s+-[dD]\b/i,
  // Package Manager destructive / publish actions
  /\b(npm|yarn|pnpm|cargo)\s+publish\b/i,
  /\b(pip\s+uninstall|npm\s+un|yarn\s+remove)\b/i,
  // Cloud & Infrastructure
  /\bterraform\s+destroy\b/i,
  /\bdocker\s+system\s+prune\b/i,
  /\bdocker\s+rm\s+-[a-z]*f\b/i,
  /\bdocker\s+rmi\s+-[a-z]*f\b/i,
  /\bkubectl\s+delete\b/i,
  /\baws\s+s3\s+rm\s+.*--recursive\b/i,
  // DB Operations
  /\b(drop\s+table|schema\s+drop|migrate:reset|db:drop|db:reset)\b/i,
];

const CONFIRMATION_PATTERNS = [
  '[y/n]',
  '(y/n)',
  '[y/n/a]',
  '[y/n/d]',
  '[y/n/q]',
  '[y/n/always]',
  '(y/n/always)',
  'proceed?',
  'confirm?',
  'are you sure',
  'continue?',
  'do you want to continue',
  'do you want to proceed',
  'override?',
  'overwrite?',
  'requesting permission',
  'accept this file edit',
  'accept this edit',
  'accept this change',
  'apply this change',
  'apply these changes',
  'allow this tool',
  'allow this command',
  'allow this change',
  'allow claude',
  'allow tool',
  'allow execution',
  'allow once',
  'allow [a]lways',
  'allow always',
  'always allow',
  'allow for this session',
  'always allow for this session',
  'always allow for this project',
  'approve tool',
  'approve edit',
  'approve command',
  'approve this',
  'approve changes',
  'run this command?',
  'execute this command?',
  'apply file edit',
  'apply this change',
  'apply this edit',
  'apply changes',
  'accept all changes',
  'accept this prompt',
  'accept suggestion',
  'claude wants to run',
  'claude wants to edit',
  'claude wants to create',
  'claude wants to read',
  'claude wants to write',
  'claude wants to execute',
  'claude needs your permission',
  'allow claude to run',
  'allow claude to edit',
  'allow claude to create',
  'allow claude to read',
  'allow claude to write',
  'allow claude to execute',
  'allow claude to',
  'do you trust the files',
  'trust the files in this directory',
  'accept and continue',
  'allow and continue',
  'yes, don\'t ask again',
  'yes, accept this change',
  'yes, accept this file edit',
  'yes, accept this edit',
  'yes, accept these changes',
  'yes, allow this command',
  'yes, allow this tool',
  'yes, allow always',
  'yes, run command',
  'yes, apply changes',
  'yes, apply this edit',
  'yes, apply this change',
  'yes, always allow',
  'yes, accept',
  'shift+tab to auto-approve',
  'shift+tab to approve',
  'press enter to continue',
  'press any key to continue',
  '(use arrow keys)',
  '(press <enter> to select)',
];

const AFFIRMATIVE_ACTIONS = [
  'yes',
  'accept',
  'allow',
  'proceed',
  'continue',
  'approve',
  'always',
  'run',
  'apply',
  'execute',
  'keep',
  'overwrite',
  'trust',
].join('|');

/**
 * Checks if the terminal output contains an active confirmation prompt at its trailing end,
 * and determines the safe automated response key.
 */
export const detectYoloPrompt = (rawBuffer: string): YoloPromptMatch | null => {
  if (!rawBuffer) return null;

  const cleanFull = stripAnsi(rawBuffer);
  const cleanLower = cleanFull.toLowerCase();

  // Inspect the trailing tail of the buffer (last ~500 chars) where active prompts reside
  const tail = cleanLower.slice(-500);

  // Check destructive command patterns against recent full buffer
  const isDestructive = DESTRUCTIVE_REGEXES.some((regex) => regex.test(cleanLower));

  // 1. Check standard confirmation keywords in the tail
  let matchedPattern = CONFIRMATION_PATTERNS.find((p) => tail.includes(p)) || '';

  // 2. Check interactive menu cursor patterns (e.g. ❯ 1. Yes, > 1. Accept, ❯ 1. Yes, accept this change)
  const interactiveMenuRegex = new RegExp(
    `(?:❯|›|>)\\s*(?:1[.)]\\s*)?(?:${AFFIRMATIVE_ACTIONS})\\b`,
    'i'
  );
  const isInteractiveMenuMatch = interactiveMenuRegex.test(tail);
  if (!matchedPattern && isInteractiveMenuMatch) {
    matchedPattern = 'interactive_menu_cursor';
  }

  // 3. Check explicit numbered option prompts (e.g. 1. Yes, accept this change, [1] Accept, 1. Apply)
  const numberedOptionRegex = new RegExp(
    `(?:^|\\n|\\r)\\s*(?:\\[1\\]|1[.)])\\s*(?:${AFFIRMATIVE_ACTIONS})\\b`,
    'i'
  );
  const isNumberedOptionMatch = numberedOptionRegex.test(tail);
  if (!matchedPattern && isNumberedOptionMatch) {
    matchedPattern = 'numbered_option_1';
  }

  if (!matchedPattern) {
    return null;
  }

  // Ensure the prompt is actually active at the tail (not followed by completed output)
  const patternIndex = tail.lastIndexOf(
    matchedPattern.startsWith('interactive_') || matchedPattern.startsWith('numbered_')
      ? (tail.match(interactiveMenuRegex) || tail.match(numberedOptionRegex))?.[0] || ''
      : matchedPattern
  );

  if (patternIndex !== -1) {
    const trailingAfterPrompt = tail.slice(patternIndex);
    // If there are more than 160 characters or 2 newlines after the matched pattern, it is an old prompt already completed
    const newlineCount = (trailingAfterPrompt.match(/\n/g) || []).length;
    if (trailingAfterPrompt.length > 160 && newlineCount >= 2) {
      return null;
    }
  }

  // Determine response key:
  let responseKey = 'y\r';

  if (tail.includes('shift+tab')) {
    // AI tool auto-approve sequence
    responseKey = '\x1b[Z';
  } else if (
    isInteractiveMenuMatch ||
    tail.includes('(use arrow keys)') ||
    tail.includes('(press <enter> to select)') ||
    tail.includes('press enter to continue') ||
    tail.includes('press any key to continue')
  ) {
    // Interactive cursor menus or press-enter prompts: press Enter to select active item
    responseKey = '\r';
  } else if (
    isNumberedOptionMatch ||
    /(?:enter\s+(?:choice|selection|number)|select\s+(?:an?\s+)?option)\s*(?:\[\s*\d+\s*-\s*\d+\s*\])?\s*[:?]\s*$/i.test(tail.trim())
  ) {
    // Strictly formatted numbered option choice (e.g. 1. Yes / 2. No)
    responseKey = '1\r';
  } else {
    // Default Y/N confirmation
    responseKey = 'y\r';
  }

  return {
    isConfirmation: true,
    isDestructive,
    responseKey,
    matchedPattern,
  };
};
