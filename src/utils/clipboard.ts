/** Prefer the native clipboard in CmdGUI, with browser support for previews. */
export async function copyText(text: string): Promise<void> {
  if (window.electron?.writeClipboard) {
    await window.electron.writeClipboard(text);
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Clipboard is unavailable. Select the text and use your system Copy command.');
}
