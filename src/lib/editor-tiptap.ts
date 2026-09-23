import { Extension, type EditorOptions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Slice, type Schema } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import type { EditorProps } from '@tiptap/pm/view';
import type { RichNode } from './content';
import { docVerse, pastedVerse, verseDoc, type Verse } from './verse-edit';

// An empty editor shows its aria-placeholder through this class.
const EmptyHint = Extension.create({
  name: 'emptyHint',
  addProseMirrorPlugins: () => [
    new Plugin({
      props: {
        attributes: ({ doc }): Record<string, string> =>
          doc.childCount === 1 && !doc.firstChild?.content.size ? { class: 'is-empty' } : {},
      },
    }),
  ],
});

export const proseOptions: Partial<EditorOptions> = {
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      horizontalRule: false,
      underline: false,
      link: {
        openOnClick: false,
        protocols: ['http', 'https'],
        HTMLAttributes: { rel: 'noopener noreferrer' },
      },
    }),
    EmptyHint,
  ],
};

// Verse is lines of text with bold and italic; there is nowhere to keep headings, quotes,
// lists or links. Input and paste rules stay off because they would eat a typed ** or _.
export const verseOptions: Partial<EditorOptions> = {
  extensions: [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      hardBreak: false,
      heading: false,
      horizontalRule: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      underline: false,
    }),
    Extension.create({
      name: 'verseLines',
      // A soft break could not be told apart from a new line, so Shift+Enter makes one too.
      addKeyboardShortcuts() {
        return { 'Shift-Enter': () => this.editor.commands.splitBlock() };
      },
    }),
    EmptyHint,
  ],
  enableInputRules: false,
  enablePasteRules: false,
};

export const verseSlice = (schema: Schema, verse: Verse) =>
  new Slice(schema.nodeFromJSON(verseDoc(verse)).content, 1, 1);

export const verseClipboard: EditorProps = {
  // ProseMirror's own plain-text paste merges blank lines; verse keeps every line.
  clipboardTextParser: (plain, $context) => {
    const { text } = pastedVerse(plain);
    const emphasis = text
      ? $context.marks().map((mark) => ({
          from: 0,
          to: text.length,
          style: mark.type.name as Verse['emphasis'][number]['style'],
        }))
      : [];
    return verseSlice($context.doc.type.schema, { text, emphasis });
  },
  clipboardTextSerializer: (slice) => slice.content.textBetween(0, slice.content.size, '\n'),
  // The plain-text copy decides lines and spaces; the formatted copy only lends bold and italic.
  handlePaste: (view, event, slice) => {
    const plain = event.clipboardData?.getData('text/plain');
    if (!plain) return false;
    const runs: RichNode[] = [];
    slice.content.descendants((node) => {
      if (node.isText) runs.push(node.toJSON());
    });
    const formatted = docVerse({ type: 'doc', content: [{ type: 'paragraph', content: runs }] });
    view.dispatch(
      view.state.tr
        .replaceSelection(verseSlice(view.state.schema, pastedVerse(plain, formatted)))
        .scrollIntoView()
        .setMeta('paste', true)
        .setMeta('uiEvent', 'paste'),
    );
    return true;
  },
};
