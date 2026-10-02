import { Book, ExportOptions, ExportFormat } from '../types';
import {
  BookExportEngine,
  formatExportFilename,
  getMimeTypeForFormat
} from './bookExportEngine';

export class ExportService {
  /**
   * Master dispatcher for book exporting.
   * Performs high-fidelity server compilation with client-side zero-loss fallback.
   * Prevents error payloads from ever being downloaded as corrupted files.
   */
  static async exportBook(book: Book, options: ExportOptions): Promise<void> {
    if (!book || !book.title) {
      throw new Error('Le livre doit comporter un titre valide pour être exporté.');
    }

    const format = options?.format || 'pdf';
    const targetFilename = formatExportFilename(book.title, format);
    const expectedMime = getMimeTypeForFormat(format);

    // 1. Attempt Server-Side compilation via POST /api/export-book
    let serverCompiledBlob: Blob | null = null;
    let serverFilename = targetFilename;

    try {
      const response = await fetch('/api/export-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ book, options })
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      // STRICT CHECK: Backend error or JSON response MUST NOT be saved as a document file!
      if (!response.ok || contentType.includes('application/json') || contentType.includes('text/html')) {
        let errorDetails = `Code HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errorDetails = errData.message || errData.error || errorDetails;
        } catch {
          // Response was not JSON
        }
        console.warn(`[ExportService] Server export returned ${response.status} (${errorDetails}). Switching to local engine fallback...`);
      } else {
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          serverFilename = decodeURIComponent(match[1]);
        }

        const rawBlob = await response.blob();
        if (rawBlob.size > 64) {
          // Re-wrap blob with exact target MIME type to ensure mobile & desktop apps recognize it
          serverCompiledBlob = new Blob([rawBlob], { type: expectedMime });
        }
      }
    } catch (netErr: any) {
      console.warn('[ExportService] Network call to /api/export-book failed, switching to local client engine:', netErr?.message || netErr);
    }

    // 2. If server returned a valid binary document blob, download it!
    if (serverCompiledBlob) {
      this.triggerBlobDownload(serverCompiledBlob, serverFilename);
      return;
    }

    // 3. Resilient Local Engine Fallback (Executes 100% in browser if server is unreachable)
    console.info(`[ExportService] Compiling genuine ${format.toUpperCase()} using local BookExportEngine...`);
    const buffer = await this.compileLocalBuffer(book, options);

    if (!buffer || buffer.length === 0) {
      throw new Error(`Échec de la compilation du fichier ${format.toUpperCase()}.`);
    }

    const localBlob = new Blob([buffer], { type: expectedMime });
    this.triggerBlobDownload(localBlob, targetFilename);
  }

  /**
   * Internal helper to compile formats locally if server is unavailable
   */
  private static async compileLocalBuffer(book: Book, options: ExportOptions): Promise<Uint8Array> {
    switch (options.format) {
      case 'pdf':
        return await BookExportEngine.generatePdf(book, options);
      case 'docx':
        return await BookExportEngine.generateDocx(book, options);
      case 'epub':
        return await BookExportEngine.generateEpub(book, options);
      case 'txt':
        return BookExportEngine.generateTxt(book);
      case 'markdown':
        return BookExportEngine.generateMarkdown(book);
      case 'html':
        return BookExportEngine.generateHtml(book);
      default:
        return await BookExportEngine.generatePdf(book, options);
    }
  }

  /**
   * Safe, standard browser blob download trigger.
   * Works on Chrome, Safari, Firefox, Edge, Android Chrome, and iOS.
   */
  private static triggerBlobDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    }, 1500);
  }

  // Backward compatible explicit helpers
  static async exportPDF(book: Book, options?: Partial<ExportOptions>): Promise<void> {
    return this.exportBook(book, {
      format: 'pdf',
      includeCover: true,
      includeTOC: true,
      includePageNumbers: true,
      fontFamily: 'serif',
      pageSize: '6x9',
      ...options
    });
  }

  static async exportDOCX(book: Book, options?: Partial<ExportOptions>): Promise<void> {
    return this.exportBook(book, {
      format: 'docx',
      includeCover: true,
      includeTOC: true,
      includePageNumbers: true,
      fontFamily: 'serif',
      pageSize: '6x9',
      ...options
    });
  }

  static async exportEPUB(book: Book, options?: Partial<ExportOptions>): Promise<void> {
    return this.exportBook(book, {
      format: 'epub',
      includeCover: true,
      includeTOC: true,
      includePageNumbers: true,
      fontFamily: 'serif',
      pageSize: '6x9',
      ...options
    });
  }

  static async exportTXT(book: Book): Promise<void> {
    return this.exportBook(book, {
      format: 'txt',
      includeCover: false,
      includeTOC: true,
      includePageNumbers: false,
      fontFamily: 'sans',
      pageSize: 'A4'
    });
  }

  static async exportMarkdown(book: Book): Promise<void> {
    return this.exportBook(book, {
      format: 'markdown',
      includeCover: false,
      includeTOC: true,
      includePageNumbers: false,
      fontFamily: 'mono',
      pageSize: 'A4'
    });
  }

  static async exportHTML(book: Book): Promise<void> {
    return this.exportBook(book, {
      format: 'html' as any,
      includeCover: true,
      includeTOC: true,
      includePageNumbers: true,
      fontFamily: 'serif',
      pageSize: 'A4'
    });
  }
}
