'use client';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { canonicalRichNode, type RichNode } from '@/lib/content';
export function RichEditor({
  doc,
  onChange,
}: {
  doc: RichNode;
  onChange: (doc: RichNode) => void;
}) {
  const emittedDocs = useRef(new WeakSet<RichNode>());
  const editor = useEditor({
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
    ],
    content: doc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-editor',
        'aria-label': 'Sadržaj teksta',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor }) => {
      const next = canonicalRichNode(editor.getJSON() as RichNode);
      emittedDocs.current.add(next);
      onChange(next);
    },
  });
  useEffect(() => {
    // A parent render may echo an earlier local edit after another transaction.
    // Replacing the document then would discard the newer edit and its selection.
    // Only externally loaded revisions should reset Tiptap's content.
    if (emittedDocs.current.has(doc)) return;
    if (
      editor &&
      JSON.stringify(canonicalRichNode(editor.getJSON() as RichNode)) !== JSON.stringify(doc)
    )
      editor.commands.setContent(doc, {
        emitUpdate: false,
        parseOptions: { preserveWhitespace: 'full' },
      });
  }, [doc, editor]);
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      heading: editor?.isActive('heading', { level: 2 }) ?? false,
      quote: editor?.isActive('blockquote') ?? false,
    }),
  });
  if (!editor) return <p role="status">Otvaranje prostora za pisanje…</p>;
  return (
    <div className="rich-editor">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Uređivanje teksta"
        onPointerDown={(event) => event.preventDefault()}
      >
        <button
          type="button"
          aria-pressed={active?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>Masno</strong>
        </button>
        <button
          type="button"
          aria-pressed={active?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>Kurziv</em>
        </button>
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
            if (href && /^https?:\/\//i.test(href)) editor.chain().focus().setLink({ href }).run();
            else if (href === '') editor.chain().focus().unsetLink().run();
          }}
        >
          Link
        </button>
        <button
          type="button"
          aria-label="Poništi posljednju izmjenu"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
