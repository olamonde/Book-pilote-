import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Sparkles,
  BookOpen,
  Code,
  Eye,
  Type,
  Sun,
  Moon,
  Mic,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { markdownToEditorialHtml, editorialHtmlToMarkdown } from '../../utils/editorialParser';
import { VoiceInputButton } from '../common/VoiceInputButton';
import { useTranslation } from '../../i18n';

interface EditorialEditorProps {
  content: string;
  chapterTitle?: string;
  onChange: (newContent: string) => void;
  onOpenCopilotWithSelection?: (selectedText: string, instruction?: string) => void;
}

export const EditorialEditor: React.FC<EditorialEditorProps> = ({
  content,
  chapterTitle = '',
  onChange,
  onOpenCopilotWithSelection
}) => {
  const { t } = useTranslation();
  const [editorMode, setEditorMode] = useState<'editorial' | 'markdown'>('editorial');
  const [fontTheme, setFontTheme] = useState<'serif' | 'sans'>('serif');
  const [colorTheme, setColorTheme] = useState<'obsidian' | 'sepia'>('obsidian');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  // Text selection state for contextual floating toolbar
  const [selectedText, setSelectedText] = useState('');
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const editableRef = useRef<HTMLDivElement>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Sync external content changes into the editable container (unless triggered by internal typing)
  useEffect(() => {
    if (editorMode === 'editorial' && editableRef.current) {
      if (!isInternalUpdateRef.current) {
        editableRef.current.innerHTML = markdownToEditorialHtml(content);
      }
      isInternalUpdateRef.current = false;
    }
  }, [content, editorMode]);

  // Handle contentEditable changes and convert to Markdown
  const handleEditableInput = useCallback(() => {
    if (!editableRef.current) return;
    isInternalUpdateRef.current = true;
    const html = editableRef.current.innerHTML;
    const md = editorialHtmlToMarkdown(html);
    onChange(md);
  }, [onChange]);

  // Handle text selection for floating toolbar
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText('');
      setFloatingToolbarPos(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 2) {
      setSelectedText(text);
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatingToolbarPos({
          top: Math.max(10, rect.top - 55),
          left: Math.max(20, rect.left + rect.width / 2 - 130)
        });
      } catch {
        setFloatingToolbarPos(null);
      }
    } else {
      setSelectedText('');
      setFloatingToolbarPos(null);
    }
  };

  // Helper for applying rich formatting commands
  const applyExecCommand = (command: string, value: string | undefined = undefined) => {
    if (editorMode === 'markdown') {
      applyMarkdownFormatting(command);
      return;
    }

    document.execCommand(command, false, value);
    handleEditableInput();
  };

  // Custom block element insertions
  const insertEditorialBlock = (type: 'callout-tip' | 'callout-note' | 'callout-warning' | 'divider') => {
    if (!editableRef.current) return;

    if (editorMode === 'markdown') {
      if (type === 'divider') {
        const sep = '\n\n---\n\n';
        onChange(content + sep);
      } else if (type === 'callout-tip') {
        const block = `\n\n> **${t('editor.calloutTipPrefix', 'Conseil :')}** ${t('editor.calloutTipDefault', 'Partagez ici une recommandation concrète pour le lecteur.')}\n\n`;
        onChange(content + block);
      } else if (type === 'callout-note') {
        const block = `\n\n> **${t('editor.calloutNotePrefix', 'Note :')}** ${t('editor.calloutNoteDefault', 'Information clé à retenir.')}\n\n`;
        onChange(content + block);
      } else if (type === 'callout-warning') {
        const block = `\n\n> **${t('editor.calloutWarningPrefix', 'Attention :')}** ${t('editor.calloutWarningDefault', 'Erreur fréquente à éviter.')}\n\n`;
        onChange(content + block);
      }
      return;
    }

    let insertHtml = '';
    if (type === 'divider') {
      insertHtml = `
        <div class="editorial-divider" contenteditable="false">
          <span class="editorial-divider-line"></span>
          <span class="editorial-divider-symbol">✦ ✦ ✦</span>
          <span class="editorial-divider-line"></span>
        </div>
        <p class="book-paragraph"><br></p>
      `;
    } else if (type === 'callout-tip') {
      insertHtml = `
        <div class="editorial-callout callout-tip">
          <div class="callout-header">
            <span class="callout-icon">✨</span>
            <span class="callout-badge">${t('editor.calloutTipBadge', 'CONSEIL PRATIQUE')}</span>
          </div>
          <div class="callout-body">${t('editor.calloutTipDefault', 'Partagez ici une recommandation concrète pour le lecteur.')}</div>
        </div>
        <p class="book-paragraph"><br></p>
      `;
    } else if (type === 'callout-note') {
      insertHtml = `
        <div class="editorial-callout callout-note">
          <div class="callout-header">
            <span class="callout-icon">💡</span>
            <span class="callout-badge">${t('editor.calloutNoteBadge', 'NOTE ÉDITORIALE')}</span>
          </div>
          <div class="callout-body">${t('editor.calloutNoteBody', 'Information clé à retenir sur ce point de méthode.')}</div>
        </div>
        <p class="book-paragraph"><br></p>
      `;
    } else if (type === 'callout-warning') {
      insertHtml = `
        <div class="editorial-callout callout-warning">
          <div class="callout-header">
            <span class="callout-icon">⚠️</span>
            <span class="callout-badge">${t('editor.calloutWarningBadge', 'POINT DE VIGILANCE')}</span>
          </div>
          <div class="callout-body">${t('editor.calloutWarningBody', 'Écueil fréquent à anticiper lors de la mise en œuvre.')}</div>
        </div>
        <p class="book-paragraph"><br></p>
      `;
    }

    document.execCommand('insertHTML', false, insertHtml);
    handleEditableInput();
  };

  // Helper for Markdown raw editing mode
  const applyMarkdownFormatting = (tag: string) => {
    const textarea = rawTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const selected = text.substring(start, end);

    let prefix = '';
    let suffix = '';

    if (tag === 'bold') {
      prefix = '**';
      suffix = '**';
    } else if (tag === 'italic') {
      prefix = '*';
      suffix = '*';
    } else if (tag === 'underline') {
      prefix = '<u>';
      suffix = '</u>';
    } else if (tag === 'h1') {
      prefix = '\n# ';
    } else if (tag === 'h2') {
      prefix = '\n## ';
    } else if (tag === 'h3') {
      prefix = '\n### ';
    } else if (tag === 'list') {
      prefix = '\n- ';
    } else if (tag === 'ordered') {
      prefix = '\n1. ';
    } else if (tag === 'quote') {
      prefix = '\n> ';
    }

    const replacement = prefix + (selected || 'texte') + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  const fontSizeClass = {
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  }[fontSize];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b0d13] overflow-hidden">
      {/* Top Editorial Ribbon & Toolbar */}
      <div className="px-3 sm:px-6 py-2 border-b border-white/5 bg-[#090a0f] flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Text Formatting Controls */}
        <div className="flex items-center flex-wrap gap-1 text-slate-300">
          <button
            type="button"
            onClick={() => applyExecCommand('bold')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.bold', 'Gras (Ctrl+B)')}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('italic')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.italic', 'Italique (Ctrl+I)')}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('underline')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.underline', 'Souligné (Ctrl+U)')}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => applyExecCommand('formatBlock', '<h1>')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-xs font-serif font-bold"
            title={t('editor.toolbar.h1', 'Grand Titre (H1)')}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('formatBlock', '<h2>')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-xs font-serif font-bold"
            title={t('editor.toolbar.h2', 'Titre de Section (H2)')}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('formatBlock', '<h3>')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-xs font-serif font-bold"
            title={t('editor.toolbar.h3', 'Sous-titre (H3)')}
          >
            H3
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => applyExecCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.bulletList', 'Liste à puces')}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('insertOrderedList')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.orderedList', 'Liste numérotée')}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyExecCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
            title={t('editor.toolbar.quote', 'Citation littéraire')}
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Quick Insert Callout / Divider menu */}
          <button
            type="button"
            onClick={() => insertEditorialBlock('callout-tip')}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium transition flex items-center gap-1"
            title={t('editor.toolbar.insertTip', 'Insérer un encadré Conseil')}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">{t('editor.toolbar.tipLabel', 'Conseil')}</span>
          </button>
          <button
            type="button"
            onClick={() => insertEditorialBlock('callout-note')}
            className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-medium transition flex items-center gap-1"
            title={t('editor.toolbar.insertNote', 'Insérer un encadré Note')}
          >
            <Lightbulb className="w-3 h-3 text-purple-400" />
            <span className="hidden md:inline">{t('editor.toolbar.noteLabel', 'Note')}</span>
          </button>
          <button
            type="button"
            onClick={() => insertEditorialBlock('divider')}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-xs"
            title={t('editor.toolbar.dividerTooltip', 'Séparateur ornemental (✦ ✦ ✦)')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Dictation Button, Mode Switch & Book Styling Options */}
        <div className="flex items-center gap-2">
          {/* Voice Dictation direct button */}
          <VoiceInputButton
            currentValue={content}
            onValueChange={onChange}
            targetFieldLabel={t('editor.toolbar.voiceChapterDictation', 'dictée dans le chapitre')}
            buttonSize="sm"
            tooltipPosition="bottom"
            className="border-purple-500/40 bg-purple-600/15 text-purple-300 hover:bg-purple-600/25"
          />

          {/* Font Serif / Sans Switcher */}
          <button
            type="button"
            onClick={() => setFontTheme(fontTheme === 'serif' ? 'sans' : 'serif')}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition flex items-center gap-1 border border-white/10"
            title={t('editor.toolbar.currentFont', { font: fontTheme === 'serif' ? t('editor.toolbar.serifName', 'Serif littéraire') : t('editor.toolbar.sansName', 'Sans-serif moderne') })}
          >
            <Type className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">{fontTheme === 'serif' ? 'Serif' : 'Sans'}</span>
          </button>

          {/* Paper Theme Switcher (Obsidian Dark vs Sepia Cream) */}
          <button
            type="button"
            onClick={() => setColorTheme(colorTheme === 'obsidian' ? 'sepia' : 'obsidian')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/10"
            title={colorTheme === 'obsidian' ? t('editor.toolbar.paperSepia', 'Mode Papier Crème (Sepia)') : t('editor.toolbar.paperDark', 'Mode Nuit Obsidienne')}
          >
            {colorTheme === 'obsidian' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-purple-300" />}
          </button>

          {/* Editor Mode: Editorial Book View vs Markdown Source */}
          <div className="flex items-center bg-slate-950 border border-white/10 rounded-lg p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setEditorMode('editorial')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                editorMode === 'editorial'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('editor.toolbar.editorialRenderTooltip', 'Rendu éditorial professionnel (sans balises brutes)')}
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">{t('editor.toolbar.visualMode', 'Éditorial')}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('markdown')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                editorMode === 'markdown'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('editor.toolbar.rawMarkdownTooltip', 'Code source Markdown')}
            >
              <Code className="w-3 h-3" />
              <span className="hidden sm:inline">{t('editor.toolbar.markdownMode', 'Source')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Manuscript Writing Pad */}
      <div
        className={`flex-1 overflow-y-auto px-4 sm:px-12 py-8 transition-colors duration-200 ${
          colorTheme === 'sepia' ? 'theme-sepia bg-[#f7f3eb]' : 'theme-obsidian bg-[#0b0d13]'
        }`}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
      >
        <div className={`max-w-3xl mx-auto w-full editorial-canvas ${fontTheme === 'serif' ? 'font-serif-book' : 'font-sans'} ${fontSizeClass}`}>
          {/* Chapter Title Badge (Editorial Book Style) */}
          {chapterTitle && (
            <div className="mb-6 pb-4 border-b border-white/10">
              <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold block mb-1">
                {t('editor.toolbar.editorialManuscriptBadge', 'MANUSCRIT ÉDITORIAL')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif-book">
                {chapterTitle}
              </h1>
            </div>
          )}

          {editorMode === 'editorial' ? (
            /* Rich Interactive Editorial Manuscript (ContentEditable) */
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditableInput}
              className="outline-hidden min-h-[550px] focus:ring-0 leading-relaxed cursor-text select-text"
              placeholder={t('editor.toolbar.editorPlaceholder', 'Commencez à rédiger votre chapitre ici...')}
            />
          ) : (
            /* Raw Markdown Mode (Accessible if needed) */
            <textarea
              ref={rawTextareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('editor.toolbar.markdownPlaceholder', 'Tapez votre contenu en Markdown...')}
              className="w-full h-full min-h-[550px] bg-transparent text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-hidden border-0"
            />
          )}
        </div>
      </div>

      {/* Floating Selection Toolbar with Quick AI & Voice Directives */}
      {floatingToolbarPos && selectedText && (
        <div
          className="fixed z-50 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/95 border border-purple-500/40 shadow-2xl backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${floatingToolbarPos.top}px`, left: `${floatingToolbarPos.left}px` }}
        >
          <button
            onClick={() => applyExecCommand('bold')}
            className="p-1 rounded hover:bg-white/10 text-white font-bold"
            title={t('editor.toolbar.boldLabel', 'Gras')}
          >
            B
          </button>
          <button
            onClick={() => applyExecCommand('italic')}
            className="p-1 rounded hover:bg-white/10 text-white italic font-serif"
            title={t('editor.toolbar.italicLabel', 'Italique')}
          >
            I
          </button>
          <div className="h-3 w-px bg-white/15 mx-0.5" />

          {/* One-click quick actions for selected text */}
          <button
            onClick={() => {
              if (onOpenCopilotWithSelection) {
                onOpenCopilotWithSelection(selectedText, t('editor.toolbar.shortenPrompt', 'Raccourcis ce passage tout en conservant les idées clés.'));
              }
            }}
            className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-medium flex items-center gap-1"
            title={t('editor.toolbar.shortenPassage', 'Raccourcir ce passage')}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{t('editor.toolbar.shortenLabel', 'Raccourcir')}</span>
          </button>

          <button
            onClick={() => {
              if (onOpenCopilotWithSelection) {
                onOpenCopilotWithSelection(selectedText, t('editor.toolbar.professionalPrompt', 'Rends ce passage plus professionnel, percutant et élégant.'));
              }
            }}
            className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-medium flex items-center gap-1"
            title={t('editor.toolbar.professionalPassage', 'Rendre plus professionnel')}
          >
            <span>{t('editor.toolbar.professionalLabel', 'Professionnel')}</span>
          </button>

          <button
            onClick={() => {
              if (onOpenCopilotWithSelection) {
                onOpenCopilotWithSelection(selectedText, t('editor.toolbar.addExamplePrompt', 'Ajoute une illustration ou un exemple concret à cette idée.'));
              }
            }}
            className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-medium flex items-center gap-1"
            title={t('editor.toolbar.addExamplePassage', 'Ajouter un exemple')}
          >
            <span>{t('editor.toolbar.exampleLabel', '+ Exemple')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
