export const cleanTerminalTitle = (
  rawTitle: string,
  currentTitle: string | undefined,
  isManualTitle: boolean | undefined
): string | null => {
  if (isManualTitle) return null;

  let cleanTitle = rawTitle;
  if (cleanTitle.startsWith('Administrator: ')) {
    cleanTitle = cleanTitle.replace('Administrator: ', '');
  }

  const genericTitles = [
    'Windows PowerShell',
    'powershell.exe',
    'pwsh.exe',
    'pwsh',
    'cmd.exe',
    'Command Prompt',
    'Terminal',
  ];

  // If the new title is generic, and we already have a specific title (that isn't generic), keep the old one.
  if (
    genericTitles.includes(cleanTitle) &&
    currentTitle &&
    !genericTitles.includes(currentTitle)
  ) {
    return null;
  }

  if (cleanTitle.includes('\\')) {
    cleanTitle = cleanTitle.split('\\').pop() || cleanTitle;
  }

  return cleanTitle !== currentTitle ? cleanTitle : null;
};
