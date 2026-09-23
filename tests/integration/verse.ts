import type { Locator } from '@playwright/test';
// The verse editor holds one paragraph per line. Fill it the way a paste from another app
// arrives, and read the lines back from its paragraphs rather than from the layout.
export async function pasteVerse(editor: Locator, text: string) {
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, text);
}
export const verseText = (editor: Locator) =>
  editor.evaluate((element) => Array.from(element.children, (line) => line.textContent).join('\n'));
