import React, { useState } from 'react';
import {
  Download,
  ArrowLeft,
  FileText,
  BookOpen,
  CheckCircle2,
  Settings,
  Sparkles,
  FileCode,
  FileSpreadsheet,
  Eye,
  Layers,
  RefreshCw,
  Globe
} from 'lucide-react';
import { Book, ExportFormat, ExportOptions } from '../../types';
import { ExportService } from '../../services/exportService';
import { CoverRenderer } from '../cover/CoverRenderer';
import { useTranslation } from '../../i18n';

interface ExportViewProps {
  book: Book;
  onBackToEditor: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  book,
  onBackToEditor,
  onShowToast
}) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Export Customization Options
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCover: true,
    includeTOC: true,
    includePageNumbers: true,
    fontFamily: 'serif',
    pageSize: '6x9'
  });

  const formats: {
    id: ExportFormat;
    name: string;
    ext: string;
    desc: string;
    icon: any;
    accent: string;
  }[] = [
    {
      id: 'pdf',
      name: t('exportView.formats.pdf.name'),
      ext: '.pdf',
      desc: t('exportView.formats.pdf.desc'),
      icon: FileText,
      accent: 'text-rose-400'
    },
    {
      id: 'epub',
      name: t('exportView.formats.epub.name'),
      ext: '.epub',
      desc: t('exportView.formats.epub.desc'),
      icon: BookOpen,
      accent: 'text-purple-400'
    },
    {
      id: 'docx',
      name: t('exportView.formats.docx.name'),
      ext: '.docx',
      desc: t('exportView.formats.docx.desc'),
      icon: FileSpreadsheet,
      accent: 'text-sky-400'
    },
    {
      id: 'markdown',
      name: t('exportView.formats.markdown.name'),
      ext: '.md',
      desc: t('exportView.formats.markdown.desc'),
      icon: FileCode,
      accent: 'text-emerald-400'
    },
    {
      id: 'txt',
      name: t('exportView.formats.txt.name'),
      ext: '.txt',
      desc: t('exportView.formats.txt.desc'),
      icon: FileText,
      accent: 'text-slate-400'
    },
    {
      id: 'html',
      name: t('exportView.formats.html.name'),
      ext: '.html',
      desc: t('exportView.formats.html.desc'),
      icon: Globe,
      accent: 'text-amber-400'
    }
  ];

  const handleTriggerExport = async () => {
    setIsExporting(true);
    setExportProgress(25);

    const activeOpts: ExportOptions = {
      ...options,
      format: selectedFormat
    };

    try {
      setExportProgress(50);
      await ExportService.exportBook(book, activeOpts);
      setExportProgress(100);
      onShowToast(t('exportView.options.downloadSuccess', { format: selectedFormat.toUpperCase() }), 'success');
    } catch (err: any) {
      console.error('[ExportView] Export error:', err);
      onShowToast(err?.message || t('exportView.options.downloadError', { format: selectedFormat.toUpperCase() }), 'warning');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 600);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title={t('exportView.backToEditor')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              {t('exportView.title')}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {t('exportView.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="main-export-download-btn"
            onClick={handleTriggerExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xl shadow-purple-600/30 transition flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isExporting
                ? t('exportView.options.compiling', { format: selectedFormat.toUpperCase(), progress: exportProgress })
                : t('exportView.options.downloadFormat', { format: selectedFormat.toUpperCase() })}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Formats + Configurations + Live Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: FORMAT SELECTION (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
              {t('exportView.options.chooseFormat')}
            </span>

            <div className="space-y-2.5">
              {formats.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                const Icon = fmt.icon;

                return (
                  <button
                    key={fmt.id}
                    id={`format-select-${fmt.id}`}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-500/40'
                        : 'bg-slate-900/40 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl bg-slate-950 border border-white/10 ${fmt.accent}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{fmt.name}</h4>
                        <span className="text-[11px] font-mono text-slate-500 uppercase">
                          {fmt.ext}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{fmt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options & Metadata Controls */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              {t('exportView.options.title')}
            </span>

            <div className="space-y-3 text-xs">
              {/* Cover toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('exportView.options.includeCover')}</span>
                <input
                  type="checkbox"
                  checked={options.includeCover}
                  onChange={(e) => setOptions({ ...options, includeCover: e.target.checked })}
                  className="rounded bg-slate-950 border-white/20 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Table of contents toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('exportView.options.includeTOC')}</span>
                <input
                  type="checkbox"
                  checked={options.includeTOC}
                  onChange={(e) => setOptions({ ...options, includeTOC: e.target.checked })}
                  className="rounded bg-slate-950 border-white/20 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Page numbers toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">{t('exportView.options.includePageNumbers')}</span>
                <input
                  type="checkbox"
                  checked={options.includePageNumbers}
                  onChange={(e) => setOptions({ ...options, includePageNumbers: e.target.checked })}
                  className="rounded bg-slate-950 border-white/20 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
              {/* Font Choice */}
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">{t('exportView.options.fontFamily')}</label>
                <select
                  value={options.fontFamily}
                  onChange={(e) => setOptions({ ...options, fontFamily: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500"
                >
                  <option value="serif">{t('exportView.options.serif')}</option>
                  <option value="sans">{t('exportView.options.sans')}</option>
                  <option value="mono">{t('exportView.options.mono')}</option>
                </select>
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">{t('exportView.options.pageSize')}</label>
                <select
                  value={options.pageSize}
                  onChange={(e) => setOptions({ ...options, pageSize: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500"
                >
                  <option value="6x9">{t('exportView.options.size6x9')}</option>
                  <option value="A4">{t('exportView.options.sizeA4')}</option>
                  <option value="letter">{t('exportView.options.sizeLetter')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REALTIME MANUSCRIPT PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900/50 border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              {t('exportView.options.inspectorTitle')}
            </span>
            <span className="text-[11px] font-mono text-purple-400">
              {book.chapters.length} {t('common.chapters')} • {book.wordCount} {t('common.words')}
            </span>
          </div>

          {/* Simulated Printed Paper Container */}
          <div className="p-6 sm:p-10 rounded-2xl bg-[#0e1017] border border-white/5 shadow-inner max-h-[560px] overflow-y-auto space-y-8 font-serif">
            {/* Front Cover Preview */}
            {options.includeCover && (
              <div className="flex flex-col items-center justify-center py-6 border-b border-white/10">
                <CoverRenderer cover={book.cover} size="md" />
                <p className="text-[10px] font-mono text-slate-500 mt-3">
                  {t('exportView.options.frontispiece')}
                </p>
              </div>
            )}

            {/* Title & Metadata Page */}
            <div className="text-center py-8 border-b border-white/10 space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-wide">{book.title}</h2>
              <p className="text-sm text-purple-300 italic">{book.subtitle}</p>
              <p className="text-xs text-slate-400 mt-4 font-sans uppercase tracking-widest">
                {t('common.by')} {book.author}
              </p>
            </div>

            {/* Table of Contents */}
            {options.includeTOC && (
              <div className="py-4 border-b border-white/10 space-y-3 font-sans">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  {t('exportView.options.includeTOC')}
                </h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {book.chapters.map((ch, i) => (
                    <div key={ch.id} className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="truncate pr-2">{ch.title}</span>
                      <span className="font-mono text-slate-500">p. {i * 4 + 3}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* First Chapter Excerpt */}
            {book.chapters[0] && (
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-bold text-white">{book.chapters[0].title}</h3>
                <div className="text-xs text-slate-300 leading-relaxed space-y-3 whitespace-pre-line font-sans">
                  {book.chapters[0].content.slice(0, 800)}...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
