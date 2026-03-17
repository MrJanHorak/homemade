'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

const RichTextEditor = ({ value, onChange, placeholder = 'Enter text...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = value || '';

    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue || '<p></p>', false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className='rich-text-editor'>
      <div className='rich-text-editor__toolbar'>
        <div className='toolbar-row'>
          <button
            type='button'
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title='Bold'
            aria-label='Toggle bold'
          >
            <strong>B</strong>
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title='Italic'
            aria-label='Toggle italic'
          >
            <em>I</em>
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title='Strikethrough'
            aria-label='Toggle strikethrough'
          >
            <s>S</s>
          </button>

          <div className='toolbar-divider' />

          <button
            type='button'
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={
              editor.isActive('heading', { level: 2 }) ? 'is-active' : ''
            }
            title='Heading 2'
            aria-label='Toggle heading 2'
          >
            H2
          </button>
          <button
            type='button'
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={
              editor.isActive('heading', { level: 3 }) ? 'is-active' : ''
            }
            title='Heading 3'
            aria-label='Toggle heading 3'
          >
            H3
          </button>

          <div className='toolbar-divider' />

          <button
            type='button'
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title='Bullet list'
            aria-label='Toggle bullet list'
          >
            • List
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title='Numbered list'
            aria-label='Toggle numbered list'
          >
            1. List
          </button>
          <button
            type='button'
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title='Insert table'
            aria-label='Insert table'
          >
            Table
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.isActive('table')}
            title='Add column'
            aria-label='Add column'
          >
            + Col
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.isActive('table')}
            title='Add row'
            aria-label='Add row'
          >
            + Row
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.isActive('table')}
            title='Delete table'
            aria-label='Delete table'
          >
            Del table
          </button>

          <div className='toolbar-divider' />

          <button
            type='button'
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            title='Code block'
            aria-label='Toggle code block'
          >
            {'<>'}
          </button>

          <button
            type='button'
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
            title='Inline code'
            aria-label='Toggle inline code'
          >
            Code
          </button>

          <div className='toolbar-divider' />

          <button
            type='button'
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title='Blockquote'
            aria-label='Toggle blockquote'
          >
            ❝
          </button>

          <div className='toolbar-divider' />

          <button
            type='button'
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            title='Undo'
            aria-label='Undo'
          >
            ↶
          </button>
          <button
            type='button'
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            title='Redo'
            aria-label='Redo'
          >
            ↷
          </button>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className='rich-text-editor__content'
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
