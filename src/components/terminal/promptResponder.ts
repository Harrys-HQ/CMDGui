import { detectYoloPrompt, stripAnsi } from '../../utils/yoloEngine';

interface Options {
  isEnabled: () => boolean;
  isActive: () => boolean;
  getPid: () => string | null;
  notify: (type: 'confirmation' | 'alert') => void;
}

// Each PTY subscription owns its prompt history and cancels its timer on disposal.
export function createPromptResponder(options: Options) {
  let recentOutput = '';
  let lastResponseTime = 0;
  let lastPrompt = '';
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const confirmations = [
    'password',
    'sudo',
    'confirm',
    '[y/n]',
    'proceed?',
    'are you sure',
    'requesting permission',
  ];

  return {
    handleOutput(data: string) {
      if (disposed) return;
      recentOutput = (recentOutput + data).slice(-4096);
      clearTimeout(timer);
      const match = detectYoloPrompt(recentOutput);
      if (match) {
        const duplicate =
          Date.now() - lastResponseTime < 1500 && lastPrompt === match.matchedPattern;
        if (options.isEnabled() && options.getPid() !== null && !duplicate) {
          if (match.isDestructive) options.notify('confirmation');
          else
            timer = setTimeout(() => {
              // Recheck the toggle and latest output after the CLI has gone quiet.
              const pid = options.getPid();
              const finalMatch = detectYoloPrompt(recentOutput);
              if (
                !disposed &&
                options.isEnabled() &&
                pid !== null &&
                finalMatch &&
                !finalMatch.isDestructive
              ) {
                lastResponseTime = Date.now();
                lastPrompt = finalMatch.matchedPattern;
                recentOutput = '';
                window.electron.writeTerminal(pid, finalMatch.responseKey);
              }
              timer = undefined;
            }, 500);
        } else if (!options.isEnabled() || match.isDestructive) options.notify('confirmation');
      }
      if (!options.isActive()) {
        const tail = stripAnsi(recentOutput).toLowerCase().slice(-500);
        const warning = [...confirmations, 'error:', 'failed', 'exception'].find((pattern) =>
          tail.includes(pattern)
        );
        if (warning) options.notify(confirmations.includes(warning) ? 'confirmation' : 'alert');
      }
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
