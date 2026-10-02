/**
 * Editorial Rendering & Markdown Parser Engine for Book Pilot
 * 
 * Transforms raw markdown into professional book-typography HTML
 * and converts editorial HTML back to clean markdown.
 * 
 * Key capabilities:
 * 1. Semantic Headings (H1, H2, H3, H4) with book typography.
 * 2. Bold, Italic, Underline without exposing raw asterisks or syntax.
 * 3. Bulleted & Numbered lists with bespoke book indentation.
 * 4. Refined Blockquotes and Specialized Callout Cards (Conseil, Note, Exemple, Attention).
 * 5. Ornamental Editorial Dividers instead of bare lines.
 * 6. Responsive Book Tables.
 * 7. Automatic detection and transformation of ugly ASCII art/diagrams into structured visual cards.
 */

export interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'blockquote' | 'callout' | 'list' | 'divider' | 'table' | 'diagram';
  content: string;
  level?: number;
  variant?: 'note' | 'tip' | 'warning' | 'example';
}

/**
 * Checks if a block of text looks like ASCII art (e.g. slashes, boxes, asterisks pyramids)
 */
export function isAsciiArtBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  let asciiSymbolCount = 0;
  let totalChars = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Common ASCII art indicators: multiple slashes, backslashes, plus-dash boxes, pipe-dash
    if (/^[\/\\|\-_+*#=<>^~.\s]+$/.test(trimmed) && trimmed.length > 2) {
      asciiSymbolCount += trimmed.length;
    } else if (/[/\\|]{2,}/.test(trimmed) || /\+[-=]{2,}\+/.test(trimmed) || /\|.*\|/.test(trimmed)) {
      asciiSymbolCount += (trimmed.match(/[/\\|_\-+=*^]/g) || []).length;
    }
    totalChars += trimmed.length;
  }

  return totalChars > 0 && (asciiSymbolCount / totalChars > 0.4 || lines.some(l => /^\s*\/\\|\/____\\|\+---+\+/.test(l)));
}

/**
 * Transforms an ASCII art block into a clean conceptual editorial diagram
 */
export function formatAsciiArtToVisualCard(lines: string[]): string {
  // Extract any meaningful words/labels from within the ASCII art
  const extractedWords: string[] = [];
  lines.forEach(line => {
    const cleaned = line.replace(/[/\\|_\-+=*^~`[\]{}()<>#]+/g, ' ').trim();
    if (cleaned && cleaned.length > 1) {
      extractedWords.push(cleaned);
    }
  });

  const labelContent = extractedWords.length > 0 
    ? extractedWords.map((w, idx) => `<div class="editorial-diagram-step"><span class="step-num">${idx + 1}</span><span>${escapeHtml(w)}</span></div>`).join('')
    : `<div class="editorial-diagram-step"><span class="step-num">✦</span><span>Structure conceptuelle du modèle</span></div>`;

  return `
    <div class="editorial-diagram-card" data-diagram="true" contenteditable="false">
      <div class="editorial-diagram-header">
        <span class="editorial-diagram-badge">Schéma Conceptuel</span>
        <span class="editorial-diagram-caption">Représentation synthétique</span>
      </div>
      <div class="editorial-diagram-body">
        ${labelContent}
      </div>
    </div>
  `;
}

/**
 * Escapes raw HTML to prevent injection
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats inline Markdown styling (bold, italic, code, underline) into clean HTML
 */
export function formatInlineMarkdown(text: string): string {
  let res = text;

  // 1. Bold + Italic: ***text*** or ___text___
  res = res.replace(/(\*\*\*|___)(.*?)\1/g, '<strong class="font-bold text-white"><em class="italic text-slate-100">$2</em></strong>');

  // 2. Bold: **text** or __text__
  res = res.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-bold text-white tracking-wide">$2</strong>');

  // 3. Italic: *text* or _text_ (ensure not confused with URLs or standalone symbols)
  res = res.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1<em class="italic text-slate-200/95 font-serif">$2</em>$3');
  res = res.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, '$1<em class="italic text-slate-200/95 font-serif">$2</em>$3');

  // 4. Strikethrough: ~~text~~
  res = res.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');

  // 5. Underline: <u>text</u>
  res = res.replace(/<u>(.*?)<\/u>/gi, '<u class="underline decoration-purple-400 decoration-1 underline-offset-4">$1</u>');

  // 6. Inline code: `text`
  res = res.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/25 text-purple-300 font-mono text-[0.88em]">$1</code>');

  return res;
}

/**
 * Converts raw Markdown text into semantic, editorial HTML ready for the book editor
 */
export function markdownToEditorialHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<p class="book-paragraph book-empty-line"><br></p>';
  }

  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      output.push('<p class="book-paragraph book-empty-line"><br></p>');
      i++;
      continue;
    }

    // Check for ASCII art block
    if (i < lines.length - 1) {
      const candidateLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim() && (lines[j].includes('/') || lines[j].includes('\\') || lines[j].includes('|') || lines[j].includes('+') || lines[j].includes('*') || lines[j].includes('-'))) {
        candidateLines.push(lines[j]);
        j++;
      }

      if (candidateLines.length >= 3 && isAsciiArtBlock(candidateLines)) {
        output.push(formatAsciiArtToVisualCard(candidateLines));
        i = j;
        continue;
      }
    }

    // Horizontal Divider / Separator (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      output.push(`
        <div class="editorial-divider" contenteditable="false">
          <span class="editorial-divider-line"></span>
          <span class="editorial-divider-symbol">✦ ✦ ✦</span>
          <span class="editorial-divider-line"></span>
        </div>
      `);
      i++;
      continue;
    }

    // Headings (H1, H2, H3, H4)
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      output.push(`<h1 class="book-heading book-h1">${formatInlineMarkdown(h1Match[1])}</h1>`);
      i++;
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      output.push(`<h2 class="book-heading book-h2">${formatInlineMarkdown(h2Match[1])}</h2>`);
      i++;
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      output.push(`<h3 class="book-heading book-h3">${formatInlineMarkdown(h3Match[1])}</h3>`);
      i++;
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      output.push(`<h4 class="book-heading book-h4">${formatInlineMarkdown(h4Match[1])}</h4>`);
      i++;
      continue;
    }

    // Blockquote or Callout Box (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const rawQuote = quoteLines.join('\n');

      // Check if it's a Callout (Note, Conseil, Warning, Important, Exemple)
      const calloutMatch = rawQuote.match(/^(?:\[!(NOTE|TIP|WARNING|IMPORTANT|EXAMPLE)\]|\*\*(Note|Conseil|Important|Attention|Exemple|Définition)\*\*:?)\s*([\s\S]*)$/i);
      if (calloutMatch) {
        const typeKey = (calloutMatch[1] || calloutMatch[2] || '').toLowerCase();
        let badge = 'NOTE ÉDITORIALE';
        let badgeClass = 'callout-note';
        let iconSymbol = '💡';

        if (/tip|conseil/i.test(typeKey)) {
          badge = 'CONSEIL PRATIQUE';
          badgeClass = 'callout-tip';
          iconSymbol = '✨';
        } else if (/warning|attention|important/i.test(typeKey)) {
          badge = 'POINT DE VIGILANCE';
          badgeClass = 'callout-warning';
          iconSymbol = '⚠️';
        } else if (/example|exemple/i.test(typeKey)) {
          badge = 'CAS PRATIQUE & EXEMPLE';
          badgeClass = 'callout-example';
          iconSymbol = '📖';
        }

        const bodyContent = formatInlineMarkdown(calloutMatch[3] || '');
        output.push(`
          <div class="editorial-callout ${badgeClass}">
            <div class="callout-header">
              <span class="callout-icon">${iconSymbol}</span>
              <span class="callout-badge">${badge}</span>
            </div>
            <div class="callout-body">${bodyContent}</div>
          </div>
        `);
      } else {
        // Standard Literary Blockquote
        output.push(`
          <blockquote class="book-blockquote">
            <span class="book-blockquote-decor">“</span>
            <div class="book-blockquote-content">${formatInlineMarkdown(rawQuote)}</div>
          </blockquote>
        `);
      }
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && /\|[\s-:]+\|/.test(lines[i + 1].trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCols = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const rowLines = tableLines.slice(2); // Skip separator row

        let tableHtml = '<div class="editorial-table-wrapper"><table class="editorial-table"><thead><tr>';
        headerCols.forEach(col => {
          tableHtml += `<th>${formatInlineMarkdown(col)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        rowLines.forEach(row => {
          const cols = row.split('|').slice(1, -1).map(c => c.trim());
          tableHtml += '<tr>';
          cols.forEach(c => {
            tableHtml += `<td>${formatInlineMarkdown(c)}</td>`;
          });
          tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div>';
        output.push(tableHtml);
        continue;
      }
    }

    // Bulleted List (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      output.push('<ul class="book-list book-unordered-list">');
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '');
        output.push(`<li class="book-list-item">${formatInlineMarkdown(itemText)}</li>`);
        i++;
      }
      output.push('</ul>');
      continue;
    }

    // Numbered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      output.push('<ol class="book-list book-ordered-list">');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        output.push(`<li class="book-list-item">${formatInlineMarkdown(itemText)}</li>`);
        i++;
      }
      output.push('</ol>');
      continue;
    }

    // Regular Paragraph
    output.push(`<p class="book-paragraph">${formatInlineMarkdown(trimmed)}</p>`);
    i++;
  }

  return output.join('\n');
}

/**
 * Converts styled editorial HTML back into clean, portable Markdown
 */
export function editorialHtmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  // Use DOMParser when in browser environment
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return nodeToMarkdown(doc.body).trim();
  }

  // Fallback regex converter
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<blockquote[^>]*>[\s\S]*?<div[^>]*content[^>]*>(.*?)<\/div>[\s\S]*?<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<div class="editorial-divider"[\s\S]*?<\/div>/gi, '---\n\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<p class="book-paragraph book-empty-line"[\s\S]*?<\/p>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<[^>]+>/g, '');
  return md.trim();
}

/**
 * Recursive DOM to Markdown converter
 */
function nodeToMarkdown(node: Node): string {
  let text = '';

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Don't export decorative elements
      if (el.classList.contains('editorial-divider-symbol') || el.classList.contains('editorial-divider-line') || el.classList.contains('book-blockquote-decor')) {
        return;
      }

      // Check for diagram card
      if (el.classList.contains('editorial-diagram-card') || el.getAttribute('data-diagram') === 'true') {
        const steps = Array.from(el.querySelectorAll('.editorial-diagram-step')).map((s, idx) => {
          const stepText = (s as HTMLElement).innerText.replace(/^\S+\s*/, '').trim();
          return `* Étape ${idx + 1} : ${stepText}`;
        });
        text += `\n> **Schéma Conceptuel :**\n${steps.join('\n')}\n\n`;
        return;
      }

      // Check for callout box
      if (el.classList.contains('editorial-callout')) {
        const badge = el.querySelector('.callout-badge')?.textContent || 'Note';
        const body = el.querySelector('.callout-body')?.textContent || '';
        text += `\n> **${badge} :** ${body.trim()}\n\n`;
        return;
      }

      // Check for divider
      if (el.classList.contains('editorial-divider')) {
        text += '\n\n---\n\n';
        return;
      }

      // Tag-specific conversions
      switch (tagName) {
        case 'h1':
          text += `\n\n# ${nodeToMarkdown(el).trim()}\n\n`;
          break;
        case 'h2':
          text += `\n\n## ${nodeToMarkdown(el).trim()}\n\n`;
          break;
        case 'h3':
          text += `\n\n### ${nodeToMarkdown(el).trim()}\n\n`;
          break;
        case 'h4':
          text += `\n\n#### ${nodeToMarkdown(el).trim()}\n\n`;
          break;
        case 'p':
          const pText = nodeToMarkdown(el).trim();
          if (pText) {
            text += `${pText}\n\n`;
          } else {
            text += '\n';
          }
          break;
        case 'blockquote':
          const bContent = el.querySelector('.book-blockquote-content');
          const quoteText = nodeToMarkdown(bContent || el).trim();
          text += `\n> ${quoteText}\n\n`;
          break;
        case 'ul':
          text += '\n';
          el.querySelectorAll(':scope > li').forEach(li => {
            text += `- ${nodeToMarkdown(li).trim()}\n`;
          });
          text += '\n';
          break;
        case 'ol':
          text += '\n';
          el.querySelectorAll(':scope > li').forEach((li, idx) => {
            text += `${idx + 1}. ${nodeToMarkdown(li).trim()}\n`;
          });
          text += '\n';
          break;
        case 'strong':
        case 'b':
          text += `**${nodeToMarkdown(el)}**`;
          break;
        case 'em':
        case 'i':
          text += `*${nodeToMarkdown(el)}*`;
          break;
        case 'u':
          text += `<u>${nodeToMarkdown(el)}</u>`;
          break;
        case 'del':
        case 's':
          text += `~~${nodeToMarkdown(el)}~~`;
          break;
        case 'code':
          text += `\`${nodeToMarkdown(el)}\``;
          break;
        case 'br':
          text += '\n';
          break;
        case 'hr':
          text += '\n\n---\n\n';
          break;
        default:
          text += nodeToMarkdown(el);
          break;
      }
    }
  });

  return text;
}
