'use client';
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
  type EditorOptions,
} from '@tiptap/react';
import type { EditorProps } from '@tiptap/pm/view';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { canonicalRichNode, type Body, type RichNode } from '@/lib/content';
import { docVerse, verseDoc } from '@/lib/verse-edit';
import { proseOptions, verseClipboard, verseOptions } from '@/lib/editor-tiptap';
type Poem = Extract<Body, { kind: 'poem' }>;
const same = (doc: RichNode) => doc;
function useSyncedEditor<V extends object>(
  value: V,
  onChange: (value: V) => void,
  read: (doc: RichNode) => V,
  write: (value: V) => RichNode,
  options: Partial<EditorOptions>,
) {
  const emitted = useRef(new WeakSet<V>());
  // Tiptap reapplies options whose identity changed, pushing ProseMirror's state back into the
  // DOM, so stable options keep parent renders away from a selection in progress. Content is
  // read once; later values arrive through the effect below.
  const [content] = useState(() => write(value));
  const editor = useEditor({
    ...options,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const next = read(canonicalRichNode(editor.getJSON() as RichNode));
      emitted.current.add(next);
      onChange(next);
    },
  });
  useEffect(() => {
    // A parent render may echo an earlier local edit after another transaction.
    // Replacing the document then would discard the newer edit and its selection.
    // Only externally loaded revisions should reset Tiptap's content.
    if (!editor || emitted.current.has(value)) return;
    const doc = write(value);
    if (JSON.stringify(canonicalRichNode(editor.getJSON() as RichNode)) !== JSON.stringify(doc))
      editor.commands.setContent(doc, {
        emitUpdate: false,
        parseOptions: { preserveWhitespace: 'full' },
      });
  }, [value, editor, write]);
  return editor;
}
function Toolbar({
  editor,
  label,
  children,
}: {
  editor: Editor | null;
  label: string;
  children: ReactNode;
}) {
  if (!editor) return <p role="status">Otvaranje prostora za pisanje…</p>;
  return (
    <div className="rich-editor">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label={label}
        onPointerDown={(event) => event.preventDefault()}
      >
        {children}
        <button
          type="button"
          aria-label="Poništi posljednju izmjenu"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Vrati poništenu izmjenu"
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
function Emphasis({ editor, bold, italic }: { editor: Editor; bold: boolean; italic: boolean }) {
  return (
    <>
      <button
        type="button"
        aria-pressed={bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>Masno</strong>
      </button>
      <button
        type="button"
        aria-pressed={italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>Kurziv</em>
      </button>
    </>
  );
}
const attributes = (label: string, placeholder: string, className: string) => ({
  role: 'textbox',
  'aria-multiline': 'true',
  'aria-label': label,
  'aria-placeholder': placeholder,
  class: className,
  spellcheck: 'false',
});
const proseProps: EditorProps = {
  attributes: attributes(
    'Sadržaj teksta',
    'Ovdje napišite ili nalijepite tekst…',
    'prose prose-editor',
  ),
};
export function RichEditor({
  doc,
  onChange,
}: {
  doc: RichNode;
  onChange: (doc: RichNode) => void;
}) {
  const editor = useSyncedEditor(doc, onChange, same, same, {
    ...proseOptions,
    editorProps: proseProps,
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      heading: editor?.isActive('heading', { level: 2 }) ?? false,
      quote: editor?.isActive('blockquote') ?? false,
    }),
  });
  return (
    <Toolbar editor={editor} label="Uređivanje teksta">
      {editor && (
        <>
          <Emphasis editor={editor} bold={active?.bold ?? false} italic={active?.italic ?? false} />
          <button
            type="button"
            aria-pressed={active?.heading}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            Podnaslov
          </button>
          <button
            type="button"
            aria-pressed={active?.quote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Citat
          </button>
          <button
            type="button"
            onClick={() => {
              const href = window.prompt('Adresa linka (https://…)');
              if (href && /^https?:\/\//i.test(href))
                editor.chain().focus().setLink({ href }).run();
              else if (href === '') editor.chain().focus().unsetLink().run();
            }}
          >
            Link
          </button>
        </>
      )}
    </Toolbar>
  );
}
// Poems keep exact lines, spaces and bold/italic ranges; a new text is written here too
// until its rubric decides whether it stays verse.
export function VerseEditor({
  body,
  poem,
  onChange,
}: {
  body: Poem;
  poem: boolean;
  onChange: (body: Poem) => void;
}) {
  const editorProps = useMemo<EditorProps>(
    () => ({
      ...verseClipboard,
      attributes: {
        ...attributes(
          poem ? 'Sadržaj pjesme' : 'Sadržaj',
          poem ? 'Ovdje napišite ili nalijepite pjesmu…' : 'Ovdje napišite ili nalijepite tekst…',
          'verse-editor',
        ),
        autocorrect: 'off',
        autocapitalize: 'off',
        style: `text-align: ${body.align}`,
      },
    }),
    [poem, body.align],
  );
  const editor = useSyncedEditor(
    body,
    onChange,
    (doc) => ({ ...body, ...docVerse(doc) }),
    verseDoc,
    { ...verseOptions, editorProps },
  );
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
    }),
  });
  return (
    <Toolbar editor={editor} label={poem ? 'Uređivanje pjesme' : 'Uređivanje teksta'}>
      {editor && (
        <Emphasis editor={editor} bold={active?.bold ?? false} italic={active?.italic ?? false} />
      )}
    </Toolbar>
  );
}
