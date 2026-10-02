import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip
} from 'docx';
import JSZip from 'jszip';
import { Book, ExportOptions, ExportFormat } from '../types';

/**
 * Normalizes text to be encodable with WinAnsi standard PDF fonts.
 * Preserves Latin-1 accented characters (é, è, ê, à, etc.) while mapping
 * typographic quotes, dashes, and non-breaking spaces safely.
 */
function sanitizeForPdfWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2022\u25AA\u25CF]/g, '*')
    .replace(/[^\x00-\xFF]/g, (char) => {
      // Decompose accented characters if any were outside 0xFF
      const norm = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm.length > 0 && norm.charCodeAt(0) <= 255 ? norm : '';
    });
}

/**
 * Parse hex color to pdf-lib RGB tuple
 */
function hexToPdfRgb(hex: string, fallback: RGB = rgb(0.1, 0.1, 0.15)): RGB {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(r, g, b);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return fallback;
}

/**
 * Word wrap helper for pdf-lib text blocks
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

/**
 * Safely decode base64 strings to Uint8Array in both Node and Browser
 */
function decodeBase64ToUint8(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Clean markdown formatting down to readable plain text
 */
function cleanMarkdownForText(md: string): string {
  if (!md) return '';
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');
}

export class BookExportEngine {
  /**
   * Generates a genuine, 100% compliant PDF 1.7 binary document
   */
  static async generatePdf(book: Book, options?: ExportOptions): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Embed standard fonts (Helvetica for UI/titles, Times-Roman for body)
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Document Dimensions - standard A5 (420 x 595 pt) or 6x9 (432 x 648 pt)
    const is6x9 = options?.pageSize === '6x9';
    const pageWidth = is6x9 ? 432 : 420;
    const pageHeight = is6x9 ? 648 : 595;
    const margin = 48; // ~17mm margins
    const contentWidth = pageWidth - margin * 2;

    // Set Document Metadata
    pdfDoc.setTitle(sanitizeForPdfWinAnsi(book.title || 'Livre sans titre'));
    pdfDoc.setAuthor(sanitizeForPdfWinAnsi(book.author || 'Auteur'));
    pdfDoc.setSubject(sanitizeForPdfWinAnsi(book.subtitle || book.genre || 'E-book'));
    pdfDoc.setCreator('Book Pilot Studio');
    pdfDoc.setProducer('Book Pilot PDF Engine v2.0');

    // 1. COVER PAGE
    if (options?.includeCover !== false) {
      const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);

      // Determine cover colors
      const bgPrimary = hexToPdfRgb(book.cover?.primaryColor, rgb(0.06, 0.07, 0.1));
      const textCol = hexToPdfRgb(book.cover?.textColor, rgb(1, 1, 1));
      const accentCol = hexToPdfRgb(book.cover?.accentColor || book.cover?.secondaryColor, rgb(0.5, 0.3, 0.9));

      // Draw background
      coverPage.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: bgPrimary
      });

      // Draw decorative inner frame
      coverPage.drawRectangle({
        x: 20,
        y: 20,
        width: pageWidth - 40,
        height: pageHeight - 40,
        borderColor: accentCol,
        borderWidth: 1,
        color: undefined
      });

      // Try embedding cover image if it's base64 PNG or JPG
      let imageEmbedded = false;
      if (book.cover?.imageUrl && typeof book.cover.imageUrl === 'string') {
        try {
          const url = book.cover.imageUrl;
          if (url.startsWith('data:image/png;base64,')) {
            const base64Data = url.replace(/^data:image\/png;base64,/, '');
            const imgBytes = decodeBase64ToUint8(base64Data);
            const pngImage = await pdfDoc.embedPng(imgBytes);
            const imgDims = pngImage.scaleToFit(contentWidth - 20, pageHeight * 0.45);
            coverPage.drawImage(pngImage, {
              x: (pageWidth - imgDims.width) / 2,
              y: pageHeight * 0.32,
              width: imgDims.width,
              height: imgDims.height
            });
            imageEmbedded = true;
          } else if (url.startsWith('data:image/jpeg;base64,') || url.startsWith('data:image/jpg;base64,')) {
            const base64Data = url.replace(/^data:image\/jpe?g;base64,/, '');
            const imgBytes = decodeBase64ToUint8(base64Data);
            const jpgImage = await pdfDoc.embedJpg(imgBytes);
            const imgDims = jpgImage.scaleToFit(contentWidth - 20, pageHeight * 0.45);
            coverPage.drawImage(jpgImage, {
              x: (pageWidth - imgDims.width) / 2,
              y: pageHeight * 0.32,
              width: imgDims.width,
              height: imgDims.height
            });
            imageEmbedded = true;
          }
        } catch {
          // If image embedding fails, fallback smoothly to typographic cover
        }
      }

      // Render Title on Cover
      const coverTitle = sanitizeForPdfWinAnsi(book.title || 'Livre sans titre');
      const titleFontSize = 24;
      const titleLines = wrapText(coverTitle, contentWidth - 40, helveticaBold, titleFontSize);

      let titleY = imageEmbedded ? pageHeight * 0.85 : pageHeight * 0.65;
      for (const line of titleLines) {
        const lineWidth = helveticaBold.widthOfTextAtSize(line, titleFontSize);
        coverPage.drawText(line, {
          x: (pageWidth - lineWidth) / 2,
          y: titleY,
          size: titleFontSize,
          font: helveticaBold,
          color: textCol
        });
        titleY -= titleFontSize * 1.25;
      }

      // Render Subtitle
      if (book.subtitle) {
        const coverSub = sanitizeForPdfWinAnsi(book.subtitle);
        const subLines = wrapText(coverSub, contentWidth - 40, timesRomanItalic, 12);
        let subY = titleY - 8;
        for (const line of subLines) {
          const subWidth = timesRomanItalic.widthOfTextAtSize(line, 12);
          coverPage.drawText(line, {
            x: (pageWidth - subWidth) / 2,
            y: subY,
            size: 12,
            font: timesRomanItalic,
            color: rgb(0.85, 0.85, 0.9)
          });
          subY -= 15;
        }
      }

      // Render Author at bottom
      const authorText = sanitizeForPdfWinAnsi(book.author ? `PAR ${book.author.toUpperCase()}` : 'BOOK PILOT');
      const authorWidth = helvetica.widthOfTextAtSize(authorText, 11);
      coverPage.drawText(authorText, {
        x: (pageWidth - authorWidth) / 2,
        y: 60,
        size: 11,
        font: helvetica,
        color: textCol
      });

      // Small publisher imprint
      const imprint = 'EDITIONS BOOK PILOT';
      const impWidth = helvetica.widthOfTextAtSize(imprint, 8);
      coverPage.drawText(imprint, {
        x: (pageWidth - impWidth) / 2,
        y: 42,
        size: 8,
        font: helvetica,
        color: rgb(0.7, 0.7, 0.8)
      });
    }

    // 2. TABLE OF CONTENTS
    if (options?.includeTOC !== false && book.chapters.length > 0) {
      const tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let tocY = pageHeight - margin - 20;

      const tocHeading = 'TABLE DES MATIERES';
      tocPage.drawText(tocHeading, {
        x: margin,
        y: tocY,
        size: 18,
        font: helveticaBold,
        color: rgb(0.15, 0.15, 0.25)
      });
      tocY -= 30;

      // Thin divider
      tocPage.drawLine({
        start: { x: margin, y: tocY + 10 },
        end: { x: pageWidth - margin, y: tocY + 10 },
        thickness: 0.8,
        color: rgb(0.8, 0.8, 0.85)
      });

      book.chapters.forEach((ch, idx) => {
        if (tocY < margin + 40) return; // avoid overflow
        const rawTitle = ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '').trim();
        const chLabel = `Chapitre ${idx + 1} : ${sanitizeForPdfWinAnsi(rawTitle)}`;
        const labelLines = wrapText(chLabel, contentWidth - 40, timesRoman, 11);

        tocPage.drawText(labelLines[0], {
          x: margin,
          y: tocY,
          size: 11,
          font: timesRoman,
          color: rgb(0.2, 0.2, 0.2)
        });

        // Dotted leader indicator
        const dotText = ' . . . . . . . . . .';
        tocPage.drawText(dotText, {
          x: pageWidth - margin - 60,
          y: tocY,
          size: 10,
          font: timesRoman,
          color: rgb(0.6, 0.6, 0.6)
        });

        tocY -= 22;
      });
    }

    // 3. CHAPTER PAGES WITH WORD-WRAPPING & PAGINATION
    let currentPageNumber = pdfDoc.getPageCount() + 1;

    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let curY = pageHeight - margin - 25;

      // Running Header (Book title & chapter title)
      const headerText = sanitizeForPdfWinAnsi(`${book.title} -- Chapitre ${cIdx + 1}`);
      page.drawText(headerText.slice(0, 50), {
        x: margin,
        y: pageHeight - margin + 12,
        size: 8,
        font: helvetica,
        color: rgb(0.55, 0.55, 0.6)
      });
      page.drawLine({
        start: { x: margin, y: pageHeight - margin + 6 },
        end: { x: pageWidth - margin, y: pageHeight - margin + 6 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.9)
      });

      // Chapter Title
      const rawTitle = ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '').trim();
      const chHeader = sanitizeForPdfWinAnsi(`Chapitre ${cIdx + 1}`);
      page.drawText(chHeader, {
        x: margin,
        y: curY,
        size: 12,
        font: helveticaBold,
        color: rgb(0.45, 0.25, 0.75)
      });
      curY -= 18;

      const titleLines = wrapText(sanitizeForPdfWinAnsi(rawTitle), contentWidth, timesRomanBold, 18);
      for (const tLine of titleLines) {
        page.drawText(tLine, {
          x: margin,
          y: curY,
          size: 18,
          font: timesRomanBold,
          color: rgb(0.1, 0.1, 0.15)
        });
        curY -= 22;
      }
      curY -= 15;

      // Parse Chapter Markdown paragraphs
      const rawLines = (ch.content || '').split(/\r?\n/);
      let paragraphBuffer: string[] = [];

      const flushParagraph = () => {
        if (paragraphBuffer.length === 0) return;
        const fullPara = paragraphBuffer.join(' ').trim();
        paragraphBuffer = [];
        if (!fullPara) return;

        const isHeading = fullPara.startsWith('#');
        const isQuote = fullPara.startsWith('>');
        const isBullet = fullPara.startsWith('- ') || fullPara.startsWith('* ');

        const cleanText = sanitizeForPdfWinAnsi(cleanMarkdownForText(fullPara));
        const fontSize = isHeading ? 13 : 10.5;
        const font = isHeading ? helveticaBold : isQuote ? timesRomanItalic : timesRoman;
        const lineHeight = fontSize * 1.45;
        const indent = isQuote ? 18 : isBullet ? 12 : 0;
        const targetWidth = contentWidth - indent;

        const wrapped = wrapText(cleanText, targetWidth, font, fontSize);

        // Check if paragraph fits on current page
        const neededHeight = wrapped.length * lineHeight + 12;
        if (curY - neededHeight < margin + 20) {
          // Draw page number before creating new page
          if (options?.includePageNumbers !== false) {
            const pageStr = `${currentPageNumber}`;
            const numWidth = helvetica.widthOfTextAtSize(pageStr, 9);
            page.drawText(pageStr, {
              x: (pageWidth - numWidth) / 2,
              y: margin - 15,
              size: 9,
              font: helvetica,
              color: rgb(0.5, 0.5, 0.5)
            });
          }
          currentPageNumber++;

          // Create new page
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          curY = pageHeight - margin - 20;

          // Running header on continuation pages
          page.drawText(headerText.slice(0, 50), {
            x: margin,
            y: pageHeight - margin + 12,
            size: 8,
            font: helvetica,
            color: rgb(0.55, 0.55, 0.6)
          });
          page.drawLine({
            start: { x: margin, y: pageHeight - margin + 6 },
            end: { x: pageWidth - margin, y: pageHeight - margin + 6 },
            thickness: 0.5,
            color: rgb(0.85, 0.85, 0.9)
          });
        }

        // Draw left bar if quote
        if (isQuote) {
          page.drawLine({
            start: { x: margin + 4, y: curY + 2 },
            end: { x: margin + 4, y: curY - wrapped.length * lineHeight + 8 },
            thickness: 2,
            color: rgb(0.6, 0.4, 0.85)
          });
        }

        // Draw paragraph lines
        for (const line of wrapped) {
          page.drawText(line, {
            x: margin + indent,
            y: curY,
            size: fontSize,
            font,
            color: isHeading ? rgb(0.15, 0.15, 0.2) : isQuote ? rgb(0.3, 0.3, 0.35) : rgb(0.12, 0.12, 0.15)
          });
          curY -= lineHeight;
        }

        curY -= isHeading ? 8 : 10;
      };

      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          flushParagraph();
        } else if (trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          flushParagraph();
          paragraphBuffer.push(trimmed);
          flushParagraph();
        } else {
          paragraphBuffer.push(trimmed);
        }
      }
      flushParagraph();

      // Draw bottom page number on final page of chapter
      if (options?.includePageNumbers !== false) {
        const pageStr = `${currentPageNumber}`;
        const numWidth = helvetica.widthOfTextAtSize(pageStr, 9);
        page.drawText(pageStr, {
          x: (pageWidth - numWidth) / 2,
          y: margin - 15,
          size: 9,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5)
        });
      }
      currentPageNumber++;
    }

    return await pdfDoc.save();
  }

  /**
   * Generates a genuine OpenXML Microsoft Word (.docx) document
   */
  static async generateDocx(book: Book, options?: ExportOptions): Promise<Uint8Array> {
    const docChildren: any[] = [];

    // Title Page / Cover Section
    if (options?.includeCover !== false) {
      docChildren.push(
        new Paragraph({
          text: '',
          spacing: { before: 1200 }
        }),
        new Paragraph({
          text: book.title || 'Livre sans titre',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );

      if (book.subtitle) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: book.subtitle,
                italics: true,
                size: 26,
                color: '555555'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          })
        );
      }

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Par ${book.author || 'Auteur inconnu'}`,
              bold: true,
              size: 24,
              color: '222222'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Genre: ${book.genre || 'Général'} | Langue: ${book.language || 'Français'}`,
              size: 18,
              color: '777777'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Conçu et exporté avec Book Pilot',
              size: 16,
              italics: true,
              color: '999999'
            })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new PageBreak()]
        })
      );
    }

    // Table of contents section
    if (options?.includeTOC !== false && book.chapters.length > 0) {
      docChildren.push(
        new Paragraph({
          text: 'Table des matières',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 300 }
        })
      );

      book.chapters.forEach((ch, idx) => {
        const cleanT = ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '').trim();
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Chapitre ${idx + 1} : `,
                bold: true
              }),
              new TextRun({
                text: cleanT
              })
            ],
            spacing: { after: 120 }
          })
        );
      });

      docChildren.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      );
    }

    // Chapters
    book.chapters.forEach((ch, idx) => {
      const cleanT = ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '').trim();

      // Chapter Heading
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Chapitre ${idx + 1}`,
              size: 20,
              color: '6366F1',
              bold: true
            })
          ],
          spacing: { before: 240, after: 100 }
        }),
        new Paragraph({
          text: cleanT,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 }
        })
      );

      // Chapter paragraphs
      const paragraphs = (ch.content || '').split(/\r?\n\r?\n/);
      paragraphs.forEach((rawP) => {
        const p = rawP.trim();
        if (!p) return;

        if (p.startsWith('### ')) {
          docChildren.push(
            new Paragraph({
              text: cleanMarkdownForText(p.replace(/^### /, '')),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 120 }
            })
          );
        } else if (p.startsWith('## ')) {
          docChildren.push(
            new Paragraph({
              text: cleanMarkdownForText(p.replace(/^## /, '')),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 140 }
            })
          );
        } else if (p.startsWith('> ')) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cleanMarkdownForText(p.replace(/^> /, '')),
                  italics: true,
                  color: '444444'
                })
              ],
              indent: { left: convertInchesToTwip(0.4) },
              spacing: { before: 120, after: 120 }
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cleanMarkdownForText(p),
                  size: 22
                })
              ],
              spacing: { line: 360, after: 160 } // 1.5 line spacing
            })
          );
        }
      });

      // Page break after chapter (unless last)
      if (idx < book.chapters.length - 1) {
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()]
          })
        );
      }
    });

    const doc = new Document({
      title: book.title,
      creator: book.author || 'Book Pilot',
      description: book.description || book.subtitle,
      sections: [
        {
          properties: {
            page: {
              pageNumbers: {
                start: 1,
                formatType: NumberFormat.DECIMAL
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: book.title,
                      size: 16,
                      color: '888888'
                    })
                  ],
                  alignment: AlignmentType.RIGHT
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT]
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          },
          children: docChildren
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Generates a genuine EPUB 3 / EPUB 2 compatible ZIP archive
   */
  static async generateEpub(book: Book, options?: ExportOptions): Promise<Uint8Array> {
    const zip = new JSZip();

    // 1. mimetype: MUST be FIRST file, MUST NOT be compressed!
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // CSS styling
    const css = `
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 5%;
}
h1.book-title {
  font-size: 2.2em;
  text-align: center;
  margin-top: 20%;
  color: #111;
}
p.subtitle {
  text-align: center;
  font-style: italic;
  color: #555;
  font-size: 1.2em;
}
p.author {
  text-align: center;
  font-weight: bold;
  margin-top: 2em;
  font-size: 1.1em;
}
.cover-box {
  text-align: center;
  padding: 40px 20px;
  background: #f8fafc;
  border-radius: 8px;
}
h2 {
  font-size: 1.6em;
  color: #1e1b4b;
  margin-top: 1.8em;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 6px;
}
h3 {
  font-size: 1.2em;
  color: #334155;
}
blockquote {
  border-left: 3px solid #8b5cf6;
  padding-left: 1em;
  margin-left: 0;
  color: #4b5563;
  font-style: italic;
}
p {
  margin-bottom: 1.1em;
  text-align: justify;
}
ul, ol {
  padding-left: 1.5em;
  margin-bottom: 1em;
}
li {
  margin-bottom: 0.4em;
}
`;
    zip.file('OEBPS/styles.css', css);

    // Build Chapter XHTMLs and collect manifest items
    const manifestItems: string[] = [
      '<item id="style" href="styles.css" media-type="text/css"/>',
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    ];
    const spineItems: string[] = [];
    const navPoints: string[] = [];
    let playOrder = 1;

    // Cover page XHTML
    if (options?.includeCover !== false) {
      const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr">
<head>
  <title>${escapeXml(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="cover-box">
    <h1 class="book-title">${escapeXml(book.title)}</h1>
    ${book.subtitle ? `<p class="subtitle">${escapeXml(book.subtitle)}</p>` : ''}
    <p class="author">Par ${escapeXml(book.author || 'Auteur')}</p>
    <p style="margin-top: 4em; font-size: 0.8em; color: #888;">Éditions Book Pilot</p>
  </div>
</body>
</html>`;
      zip.file('OEBPS/cover.xhtml', coverHtml);
      manifestItems.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
      spineItems.push('<itemref idref="cover"/>');
      navPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Couverture</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`);
      playOrder++;
    }

    // Chapters XHTML
    book.chapters.forEach((ch, idx) => {
      const id = `ch_${idx + 1}`;
      const filename = `chapter_${idx + 1}.xhtml`;
      const cleanTitle = ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '').trim();

      const chContentHtml = markdownToCleanXhtml(ch.content || '');
      const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr">
<head>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="chapter">
    <p style="color: #6366f1; font-weight: bold; margin-bottom: 0;">Chapitre ${idx + 1}</p>
    <h2>${escapeXml(cleanTitle)}</h2>
    ${chContentHtml}
  </section>
</body>
</html>`;

      zip.file(`OEBPS/${filename}`, chapterHtml);
      manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${id}"/>`);
      navPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${filename}"/>
    </navPoint>`);
      playOrder++;
    });

    // EPUB 3 Navigation Document (nav.xhtml)
    const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr">
<head>
  <title>Table des matières</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table des matières</h1>
    <ol>
      ${book.chapters
        .map(
          (ch, i) =>
            `<li><a href="chapter_${i + 1}.xhtml">${escapeXml(ch.title)}</a></li>`
        )
        .join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
    zip.file('OEBPS/nav.xhtml', navHtml);

    // EPUB 2 NCX Table of Contents (toc.ncx)
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${book.id || 'bookpilot-export'}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>${navPoints.join('')}
  </navMap>
</ncx>`;
    zip.file('OEBPS/toc.ncx', ncx);

    // Package OPF (content.opf)
    const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:bookpilot:${book.id || Date.now()}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author || 'Auteur')}</dc:creator>
    <dc:language>${book.language || 'fr'}</dc:language>
    <dc:publisher>Book Pilot</dc:publisher>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    zip.file('OEBPS/content.opf', opf);

    // Generate output Uint8Array
    return await zip.generateAsync({
      type: 'uint8array',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
  }

  /**
   * Generates a clean UTF-8 text file with BOM for universal editor compatibility
   */
  static generateTxt(book: Book): Uint8Array {
    let text = `${(book.title || 'LIVRE SANS TITRE').toUpperCase()}\n`;
    if (book.subtitle) text += `${book.subtitle}\n`;
    text += `Auteur : ${book.author || 'Auteur inconnu'}\n`;
    text += `Genre : ${book.genre || 'Général'} | Langue : ${book.language || 'Français'}\n`;
    text += `Généré par Book Pilot Studio (https://bookpilot.ai)\n\n`;
    text += `====================================================\n\n`;

    if (book.chapters.length > 0) {
      text += `TABLE DES MATIÈRES\n`;
      book.chapters.forEach((ch, idx) => {
        text += `  ${idx + 1}. ${ch.title}\n`;
      });
      text += `\n====================================================\n\n`;
    }

    book.chapters.forEach((ch, idx) => {
      text += `\n\n[ CHAPITRE ${idx + 1} : ${ch.title.toUpperCase()} ]\n`;
      text += `----------------------------------------------------\n\n`;
      text += cleanMarkdownForText(ch.content || '');
      text += `\n\n`;
    });

    // Prepend UTF-8 BOM (\uFEFF) so Windows Notepad, macOS TextEdit, and mobile readers detect UTF-8
    const encoder = new TextEncoder();
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const bodyBytes = encoder.encode(text);
    const result = new Uint8Array(bom.length + bodyBytes.length);
    result.set(bom, 0);
    result.set(bodyBytes, bom.length);
    return result;
  }

  /**
   * Generates clean Markdown with YAML Frontmatter
   */
  static generateMarkdown(book: Book): Uint8Array {
    let md = `---
title: "${book.title.replace(/"/g, '\\"')}"
subtitle: "${(book.subtitle || '').replace(/"/g, '\\"')}"
author: "${(book.author || '').replace(/"/g, '\\"')}"
genre: "${(book.genre || '').replace(/"/g, '\\"')}"
language: "${(book.language || '').replace(/"/g, '\\"')}"
created: "${book.createdAt || new Date().toISOString()}"
generator: "Book Pilot - AI Ebook Studio"
---

# ${book.title}
*${book.subtitle || ''}*

**Auteur :** ${book.author || 'Inconnu'}  
**Genre :** ${book.genre || 'Général'}  

---

## Table des matières
`;

    book.chapters.forEach((ch, idx) => {
      md += `${idx + 1}. [${ch.title}](#chapitre-${idx + 1})\n`;
    });

    md += `\n---\n\n`;

    book.chapters.forEach((ch, idx) => {
      md += `\n\n<a id="chapitre-${idx + 1}"></a>\n`;
      md += `## Chapitre ${idx + 1} : ${ch.title}\n\n`;
      md += `${ch.content || ''}\n\n`;
      md += `---\n`;
    });

    return new TextEncoder().encode(md);
  }

  /**
   * Generates a self-contained responsive HTML5 E-book
   */
  static generateHtml(book: Book): Uint8Array {
    const html = `<!DOCTYPE html>
<html lang="${book.language || 'fr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(book.title)}</title>
  <meta name="author" content="${escapeXml(book.author || '')}">
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --accent: #6366f1;
      --border: #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --text: #f8fafc;
        --accent: #818cf8;
        --border: #334155;
      }
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      max-width: 760px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    header.book-cover {
      text-align: center;
      padding: 60px 20px 80px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 60px;
    }
    h1.book-title {
      font-size: 2.8em;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      color: var(--text);
    }
    p.book-subtitle {
      font-size: 1.3em;
      color: #64748b;
      font-style: italic;
      margin-bottom: 30px;
    }
    p.book-author {
      font-size: 1.1em;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    nav.toc {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid var(--border);
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 60px;
    }
    nav.toc h2 {
      margin-top: 0;
      font-size: 1.4em;
    }
    nav.toc ol {
      padding-left: 20px;
      margin-bottom: 0;
    }
    nav.toc li {
      margin-bottom: 8px;
    }
    nav.toc a {
      color: var(--accent);
      text-decoration: none;
    }
    nav.toc a:hover {
      text-decoration: underline;
    }
    article.chapter {
      margin-bottom: 80px;
      page-break-before: always;
    }
    article.chapter h2 {
      font-size: 2em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-top: 0;
    }
    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 16px;
      margin-left: 0;
      color: #64748b;
      font-style: italic;
    }
    p {
      margin-bottom: 1.2em;
      text-align: justify;
    }
    footer.imprint {
      text-align: center;
      color: #94a3b8;
      font-size: 0.9em;
      margin-top: 80px;
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <header class="book-cover">
    <h1 class="book-title">${escapeXml(book.title)}</h1>
    ${book.subtitle ? `<p class="book-subtitle">${escapeXml(book.subtitle)}</p>` : ''}
    <p class="book-author">Par ${escapeXml(book.author || 'Auteur')}</p>
    <div style="font-size: 0.85em; color: #64748b; margin-top: 16px;">
      Genre : ${escapeXml(book.genre || '')} | Langue : ${escapeXml(book.language || '')}
    </div>
  </header>

  <nav class="toc">
    <h2>Table des matières</h2>
    <ol>
      ${book.chapters
        .map(
          (ch, i) =>
            `<li><a href="#chapitre-${i + 1}">Chapitre ${i + 1} : ${escapeXml(
              ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, '')
            )}</a></li>`
        )
        .join('\n      ')}
    </ol>
  </nav>

  <main>
    ${book.chapters
      .map(
        (ch, i) => `
    <article class="chapter" id="chapitre-${i + 1}">
      <div style="color: var(--accent); font-weight: 700; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
        Chapitre ${i + 1}
      </div>
      <h2>${escapeXml(ch.title.replace(/^Chapitre\s+\d+\s*:\s*/i, ''))}</h2>
      ${markdownToCleanXhtml(ch.content || '')}
    </article>`
      )
      .join('\n')}
  </main>

  <footer class="imprint">
    <p>Généré et compilé avec élégance par <strong>Book Pilot</strong></p>
  </footer>
</body>
</html>`;

    return new TextEncoder().encode(html);
  }
}

/**
 * Escape XML/HTML special characters
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts markdown chapter content to clean, valid XHTML 1.1 / XHTML 5
 */
function markdownToCleanXhtml(markdown: string): string {
  if (!markdown) return '<p></p>';

  const paragraphs = markdown.split(/\r?\n\r?\n/);
  const result: string[] = [];

  for (const rawP of paragraphs) {
    const p = rawP.trim();
    if (!p) continue;

    if (p.startsWith('### ')) {
      result.push(`<h3>${escapeXml(p.replace(/^###\s+/, ''))}</h3>`);
    } else if (p.startsWith('## ')) {
      result.push(`<h3>${escapeXml(p.replace(/^##\s+/, ''))}</h3>`);
    } else if (p.startsWith('# ')) {
      result.push(`<h3>${escapeXml(p.replace(/^#\s+/, ''))}</h3>`);
    } else if (p.startsWith('> ')) {
      result.push(`<blockquote><p>${escapeXml(p.replace(/^>\s+/, ''))}</p></blockquote>`);
    } else if (p.startsWith('- ') || p.startsWith('* ')) {
      const items = p.split(/\r?\n/).map((li) => li.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
      result.push(`<ul>${items.map((it) => `<li>${escapeXml(it)}</li>`).join('')}</ul>`);
    } else if (/^\d+\.\s+/.test(p)) {
      const items = p.split(/\r?\n/).map((li) => li.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
      result.push(`<ol>${items.map((it) => `<li>${escapeXml(it)}</li>`).join('')}</ol>`);
    } else {
      // Normal paragraph - handle bold and italics safely
      let text = escapeXml(p);
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
      result.push(`<p>${text}</p>`);
    }
  }

  return result.join('\n');
}

/**
 * Generates clean, secure filenames for downloads
 */
export function formatExportFilename(title: string, format: ExportFormat | string): string {
  const cleanTitle = (title || 'Mon-Livre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics for filesystem safety
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'Book-Pilot';

  const ext = format === 'markdown' ? '.md' : format.startsWith('.') ? format : `.${format}`;
  return `${cleanTitle}${ext}`;
}

/**
 * Maps export formats to standard MIME types
 */
export function getMimeTypeForFormat(format: ExportFormat | string): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'epub':
      return 'application/epub+zip';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'markdown':
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'html':
      return 'text/html; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
