import React from 'react';
import { AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Helper to parse inline markdown (bold, italic, inline code)
  const renderInline = (text: string): React.ReactNode => {
    // Split by code, bold, italic
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Replace bold `**text**` and code `` `code` `` and italic `*text*`
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const raw = match[0];
      if (raw.startsWith('`') && raw.endsWith('`')) {
        parts.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-xs font-semibold border border-slate-200"
          >
            {raw.slice(1, -1)}
          </code>,
        );
      } else if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-slate-900">
            {raw.slice(2, -2)}
          </strong>,
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push(
          <em key={`italic-${keyIdx++}`} className="italic text-slate-700">
            {raw.slice(1, -1)}
          </em>,
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : remaining;
  };

  // Helper to generate anchor slug matching TOC generator
  const getHeadingAnchor = (raw: string): string => {
    const cleanTitle = raw.replace(/\*\*|__/g, '').trim();
    return cleanTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  // Split lines into structured blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Check for callouts / blockquotes
    if (line.startsWith('>')) {
      const blockquoteLines: string[] = [];
      let calloutType: 'FORMULA' | 'WARNING' | 'TIP' | null = null;

      while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
        let clean = lines[i].startsWith('>') ? lines[i].substring(1).trim() : lines[i];
        if (clean.includes('[!FORMULA]')) {
          calloutType = 'FORMULA';
          clean = clean.replace('[!FORMULA]', '').trim();
        } else if (clean.includes('[!WARNING]')) {
          calloutType = 'WARNING';
          clean = clean.replace('[!WARNING]', '').trim();
        } else if (clean.includes('[!TIP]')) {
          calloutType = 'TIP';
          clean = clean.replace('[!TIP]', '').trim();
        }
        if (clean) blockquoteLines.push(clean);
        i++;
      }

      if (calloutType === 'FORMULA') {
        elements.push(
          <div
            key={`formula-${i}`}
            className="my-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-black tracking-wider uppercase text-blue-700">
                Công thức ngữ pháp trọng tâm
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans">
              {blockquoteLines.map((bLine, bIdx) => (
                <div key={bIdx}>{renderInline(bLine)}</div>
              ))}
            </div>
          </div>,
        );
      } else if (calloutType === 'WARNING') {
        elements.push(
          <div
            key={`warning-${i}`}
            className="my-5 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50/80 to-red-50/50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-sm">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-xs font-black tracking-wider uppercase text-rose-700">
                Cảnh báo bẫy đề thi TOEIC (Exam Trap)
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans">
              {blockquoteLines.map((bLine, bIdx) => (
                <div key={bIdx}>{renderInline(bLine)}</div>
              ))}
            </div>
          </div>,
        );
      } else if (calloutType === 'TIP') {
        elements.push(
          <div
            key={`tip-${i}`}
            className="my-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Lightbulb className="h-4 w-4" />
              </span>
              <span className="text-xs font-black tracking-wider uppercase text-amber-800">
                Mẹo làm bài nhanh (Exam Tips & Shortcuts)
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans">
              {blockquoteLines.map((bLine, bIdx) => (
                <div key={bIdx}>{renderInline(bLine)}</div>
              ))}
            </div>
          </div>,
        );
      } else {
        // Regular blockquote
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="my-4 border-l-4 border-slate-300 bg-slate-50 p-4 rounded-r-xl italic text-slate-700 text-sm"
          >
            {blockquoteLines.map((bLine, bIdx) => (
              <p key={bIdx}>{renderInline(bLine)}</p>
            ))}
          </blockquote>,
        );
      }
      continue;
    }

    // 2. Check for Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((col) => col.trim());
        const bodyRows = tableLines.slice(2).map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((col) => col.trim()),
        );

        elements.push(
          <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-900 font-bold">
                  {headerRow.map((head, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 border-r last:border-r-0 border-slate-200">
                      {renderInline(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50 hover:bg-slate-50' : 'hover:bg-slate-50'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-slate-200 text-slate-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // 3. Headings (#, ##, ###)
    if (line.startsWith('# ')) {
      const headingText = line.substring(2).trim();
      const anchorId = getHeadingAnchor(headingText);
      elements.push(
        <h1
          id={anchorId}
          key={`h1-${i}`}
          className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-8 mb-4 border-b border-slate-200 pb-3 scroll-mt-20"
        >
          {renderInline(headingText)}
        </h1>,
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      const headingText = line.substring(3).trim();
      const anchorId = getHeadingAnchor(headingText);
      elements.push(
        <h2
          id={anchorId}
          key={`h2-${i}`}
          className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight mt-6 mb-3 scroll-mt-20"
        >
          {renderInline(headingText)}
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      const headingText = line.substring(4).trim();
      const anchorId = getHeadingAnchor(headingText);
      elements.push(
        <h3
          id={anchorId}
          key={`h3-${i}`}
          className="text-lg font-bold text-slate-800 mt-5 mb-2 scroll-mt-20"
        >
          {renderInline(headingText)}
        </h3>,
      );
      i++;
      continue;
    }

    // 4. Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-6 border-slate-200" />);
      i++;
      continue;
    }

    // 5. Bullet List items (- or *)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const itemText = line.trim().substring(2);
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm text-slate-700 leading-relaxed my-1">
          {renderInline(itemText)}
        </li>,
      );
      i++;
      continue;
    }

    // 6. Numbered list item (e.g. 1. )
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 text-sm text-slate-700 my-1.5 ml-2">
          <span className="font-bold text-blue-600 shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>,
      );
      i++;
      continue;
    }

    // 7. Standard Paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-700 my-2.5">
          {renderInline(line)}
        </p>,
      );
    }

    i++;
  }

  return <div className="grammar-markdown-content font-sans">{elements}</div>;
};
