import type { RichNode } from '@/lib/content';
import { safeHref } from '@/lib/content';

export function RichText({ node }: { node: RichNode }) {
  if (node.type === 'text') {
    let el: React.ReactNode = node.text;
    for (const [i, m] of (node.marks || []).entries()) {
      if (m.type === 'bold') el = <strong key={i}>{el}</strong>;
      if (m.type === 'italic') el = <em key={i}>{el}</em>;
      if (m.type === 'link' && safeHref(m.attrs?.href || ''))
        el = (
          <a key={i} href={safeHref(m.attrs!.href)} rel="noopener noreferrer">
            {el}
          </a>
        );
    }
    return <>{el}</>;
  }
  const children = node.content?.map((n, i) => <RichText key={i} node={n} />);
  switch (node.type) {
    case 'paragraph':
      return <p>{children || <br />}</p>;
    case 'heading':
      return node.attrs?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
    case 'blockquote':
      return <blockquote>{children}</blockquote>;
    case 'hardBreak':
      return <br />;
    case 'bulletList':
      return <ul>{children}</ul>;
    case 'orderedList':
      return <ol start={node.attrs?.start || 1}>{children}</ol>;
    case 'listItem':
      return <li>{children}</li>;
    default:
      return <>{children}</>;
  }
}
