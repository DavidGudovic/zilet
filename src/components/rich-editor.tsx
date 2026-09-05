'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { canonicalRichNode, type RichNode } from '@/lib/content';
export function RichEditor({
  doc,
  onChange,
}: {
  doc: RichNode;
  onChange: (doc: RichNode) => void;
}) {
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
    onUpdate: ({ editor }) => onChange(canonicalRichNode(editor.getJSON() as RichNode)),
  });
  useEffect(() => {
    if (
      editor &&
      JSON.stringify(canonicalRichNode(editor.getJSON() as RichNode)) !== JSON.stringify(doc)
    )
      editor.commands.setContent(doc, {
        emitUpdate: false,
        parseOptions: { preserveWhitespace: 'full' },
      });
  }, [doc, editor]);
  if (!editor) return <p role="status">Otvaranje prostora za pisanje…</p>;
  return (
    <div className="rich-editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Uređivanje teksta">
        <button
          type="button"
          aria-pressed={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>Masno</strong>
        </button>
        <button
          type="button"
          aria-pressed={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>Kurziv</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Podnaslov
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
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
