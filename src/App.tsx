import React, { useState, useEffect, useCallback } from 'react';
import { Compass } from 'lucide-react';
import { ViewRoute, User, Book, ToastNotification, Plan, CoverConfig } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { BookService } from './services/bookService';
import { AIService, BookConcept, OutlineItem } from './services/aiService';

// Common Components
import { ToastContainer } from './components/common/Toast';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { LegalModal } from './components/legal/LegalModal';

// Landing Page Components
import { Navbar } from './components/landing/Navbar';
import { Hero } from './components/landing/Hero';
import { HowItWorks } from './components/landing/HowItWorks';
import { Features } from './components/landing/Features';
import { PricingSection } from './components/landing/PricingSection';
import { FAQSection } from './components/landing/FAQSection';
import { Footer } from './components/landing/Footer';

// Dashboard & Studio Components
import { Sidebar } from './components/dashboard/Sidebar';
import { Topbar } from './components/dashboard/Topbar';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { BookLibraryView } from './components/dashboard/BookLibraryView';
import { SettingsView } from './components/dashboard/SettingsView';
import { BillingView } from './components/dashboard/BillingView';

// Generation & Editing Flows
import { CreateBookView } from './components/create/CreateBookView';
import { GenerationProgressView } from './components/create/GenerationProgressView';
import { EditorView } from './components/editor/EditorView';
import { CoverStudioView } from './components/cover/CoverStudioView';
import { MockupView } from './components/cover/MockupView';
import { ExportView } from './components/export/ExportView';

export default function App() {
  // Navigation Route
  const [currentRoute, setCurrentRoute] = useState<ViewRoute>('landing');

  // Active User & Authentication (verified via server session /api/auth/me)
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'signup' | 'forgot';
    promptContext?: string;
  }>({
    isOpen: false,
    mode: 'login',
    promptContext: undefined
  });
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'cookies' | 'refund' | null>(null);

  // Books State (authoritatively loaded from server PostgreSQL / Neon)
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);

  // Load books from PostgreSQL / Neon with single-pass legacy migration if needed
  const loadUserBooks = useCallback(async (userId: string) => {
    try {
      setBooksLoading(true);
      let serverBooks = await BookService.getBooks();
      // Safely migrate any legacy localStorage books once
      serverBooks = await BookService.migrateLegacyLocalStorageBooks(serverBooks, userId);
      setBooks(serverBooks);
      setCurrentBook((prev) => {
        if (prev && serverBooks.some((b) => b.id === prev.id)) {
          return serverBooks.find((b) => b.id === prev.id) || prev;
        }
        return serverBooks.length > 0 ? serverBooks[0] : null;
      });
    } catch (err: any) {
      console.error('[Books] Erreur lors du chargement des livres:', err);
      addToast(err?.message || 'Impossible de charger vos livres depuis le serveur.', 'error');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // Initial Server Session Verification on App Startup
  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser);
            StorageService.setCurrentUser(currentUser);
            await loadUserBooks(currentUser.id);
          } else {
            setUser(null);
            StorageService.setCurrentUser(null);
            setBooks([]);
            setCurrentBook(null);
          }
        }
      } catch (err) {
        console.warn('Failed to verify session on startup:', err);
        if (isMounted) {
          setUser(null);
          setBooks([]);
          setCurrentBook(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [loadUserBooks]);

  // Generation Flow State
  const [initialPromptFromHero, setInitialPromptFromHero] = useState<string>('');
  const [activeGenerationData, setActiveGenerationData] = useState<{
    idea: string;
    concept: BookConcept;
    outline: OutlineItem[];
    options: any;
  } | null>(null);

  // Mobile sidebar drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bookFilter, setBookFilter] = useState<'all' | 'drafts' | 'completed'>('all');

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Route Guard: Protected routes require authentication
  const navigate = (route: ViewRoute) => {
    const protectedRoutes: ViewRoute[] = [
      'dashboard',
      'create',
      'editor',
      'cover',
      'mockups',
      'export',
      'settings',
      'billing',
      'books'
    ];

    if (protectedRoutes.includes(route) && !user) {
      setAuthModal({ isOpen: true, mode: 'login' });
      addToast('Please sign in to access your Book Pilot Studio.', 'info', 'Authentication Required');
      return;
    }

    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth Handlers
  const refreshUserSession = useCallback(async () => {
    try {
      const refreshed = await AuthService.getCurrentUser();
      if (refreshed) {
        setUser(refreshed);
        StorageService.setCurrentUser(refreshed);
      }
    } catch (err) {
      console.warn('[Session] Impossible d\'actualiser la session:', err);
    }
  }, []);

  const handleAuthSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    StorageService.setCurrentUser(authenticatedUser);
    await loadUserBooks(authenticatedUser.id);
    addToast(`Bienvenue, ${authenticatedUser.name} !`, 'success', 'Connecté');

    if (!authenticatedUser.hasCompletedOnboarding) {
      setOnboardingOpen(true);
    } else if (initialPromptFromHero) {
      navigate('create');
      addToast('Reprise de la génération de votre livre...', 'info');
    } else {
      navigate('dashboard');
    }
  };

  const handleOnboardingComplete = async (_selectedPlan: Plan) => {
    setOnboardingOpen(false);
    if (user) {
      try {
        const updated = await AuthService.updateProfile({ hasCompletedOnboarding: true });
        if (updated) {
          setUser(updated);
          StorageService.setCurrentUser(updated);
        }
      } catch (err) {
        console.warn('Erreur lors de la finalisation de l\'onboarding:', err);
      }

      if (initialPromptFromHero) {
        navigate('create');
        addToast('Votre livre est prêt à être généré avec votre idée !', 'success');
      } else {
        navigate('dashboard');
        addToast('Bienvenue sur Book Pilot !', 'success');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    StorageService.setCurrentUser(null);
    setUser(null);
    setBooks([]);
    setCurrentBook(null);
    navigate('landing');
    addToast('Vous avez été déconnecté en toute sécurité.', 'info');
  };

  // Hero Quick Start -> Generator
  const handleStartFromHero = (promptText: string) => {
    setInitialPromptFromHero(promptText);
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'signup', promptContext: promptText });
      return;
    }
    navigate('create');
  };

  // Generation Handlers
  const handleConfirmGeneration = (
    idea: string,
    concept: BookConcept,
    outline: OutlineItem[],
    options: any
  ) => {
    setActiveGenerationData({ idea, concept, outline, options });
    // Keep in 'create' view while GenerationProgressView runs
  };

  const handleGenerationCompleted = async (newBook: Book) => {
    try {
      const savedBook = await BookService.createBook(newBook);
      setBooks((prev) => [savedBook, ...prev.filter((b) => b.id !== savedBook.id)]);
      setCurrentBook(savedBook);
      addToast(`"${savedBook.title}" a été relié et sauvegardé dans votre bibliothèque !`, 'success');
    } catch (err: any) {
      console.error('[Books] Erreur lors de la sauvegarde du livre:', err);
      addToast(err?.message || 'Erreur lors de la sauvegarde du livre sur le serveur.', 'error');
    } finally {
      refreshUserSession();
    }
  };

  // Editor and Book CRUD (Server-First via PostgreSQL / Neon)
  const handleSaveBook = async (updatedBook: Book) => {
    try {
      const saved = await BookService.updateBook(updatedBook.id, updatedBook);
      setBooks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      setCurrentBook(saved);
      addToast('Modifications enregistrées sur le serveur.', 'success');
    } catch (err: any) {
      console.error('[Books] Erreur lors de la sauvegarde du livre:', err);
      addToast(err?.message || 'Impossible d\'enregistrer le livre sur le serveur. Veuillez vérifier votre connexion.', 'error');
    }
  };

  const handleTrackAiUsage = () => {
    refreshUserSession();
  };

  const handleRefundAiUsage = () => {
    refreshUserSession();
  };

  const handleDuplicateBook = async (bookId: string) => {
    try {
      const duplicated = await BookService.duplicateBook(bookId);
      setBooks((prev) => [duplicated, ...prev]);
      addToast(`Dupliqué "${duplicated.title}".`, 'success');
    } catch (err: any) {
      console.error('[Books] Erreur lors de la duplication du livre:', err);
      addToast(err?.message || 'Impossible de dupliquer le livre sur le serveur.', 'error');
    }
  };

  const handleRenameBook = async (bookId: string) => {
    const target = books.find((b) => b.id === bookId);
    if (!target) return;

    const newTitle = prompt('Entrez le nouveau titre du livre :', target.title);
    if (newTitle && newTitle.trim()) {
      try {
        const updated = await BookService.renameBook(bookId, newTitle.trim(), target.cover);
        setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        if (currentBook?.id === bookId) {
          setCurrentBook(updated);
        }
        addToast('Livre renommé avec succès.', 'success');
      } catch (err: any) {
        console.error('[Books] Erreur lors du renommage du livre:', err);
        addToast(err?.message || 'Impossible de renommer le livre.', 'error');
      }
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer définitivement ce projet de livre ?')) {
      try {
        await BookService.deleteBook(bookId);
        setBooks((prev) => {
          const updated = prev.filter((b) => b.id !== bookId);
          if (currentBook?.id === bookId) {
            setCurrentBook(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
        addToast('Projet supprimé de votre bibliothèque.', 'info');
      } catch (err: any) {
        console.error('[Books] Erreur lors de la suppression du livre:', err);
        addToast(err?.message || 'Impossible de supprimer le livre sur le serveur.', 'error');
      }
    }
  };

  // Plan Upgrade (Server-Authoritative - Payment integration pending)
  const handleUpgradePlan = (_newPlan: Plan, _cycle: 'monthly' | 'yearly') => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'signup' });
      return;
    }
    addToast('Le module de souscription et paiement en ligne sera disponible prochainement.', 'info');
  };

  // Determine whether current route is in studio mode (with sidebar & topbar)
  const isStudioRoute = [
    'dashboard',
    'books',
    'settings',
    'billing'
  ].includes(currentRoute);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center animate-pulse">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span>Book Pilot Studio...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F9FAFB] selection:bg-[#7C3AED] selection:text-white font-sans antialiased">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        promptContext={authModal.promptContext}
        onClose={() => setAuthModal({ ...authModal, isOpen: false, promptContext: undefined })}
        onSuccess={handleAuthSuccess}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onComplete={handleOnboardingComplete}
        savedPrompt={initialPromptFromHero}
      />

      {/* Legal Policies Modal */}
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />

      {/* --- PUBLIC / LANDING VIEW --- */}
      {currentRoute === 'landing' && (
        <div className="flex flex-col min-h-screen">
          <Navbar
            currentRoute={currentRoute}
            onNavigate={navigate}
            isAuthenticated={!!user}
            onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode, promptContext: undefined })}
            onLogout={handleLogout}
          />

          <main className="flex-1">
            <Hero onStartGeneration={handleStartFromHero} />
            <HowItWorks />
            <Features />
            <PricingSection
              currentUser={user || undefined}
              onSelectPlan={(plan, cycle) => handleUpgradePlan(plan, cycle)}
            />
            <FAQSection />
          </main>

          <Footer onNavigate={navigate} onOpenLegal={(type) => setLegalModalType(type)} />
        </div>
      )}

      {/* --- PUBLIC PRICING STANDALONE VIEW --- */}
      {currentRoute === 'pricing' && (
        <div className="flex flex-col min-h-screen">
          <Navbar
            currentRoute={currentRoute}
            onNavigate={navigate}
            isAuthenticated={!!user}
            onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode, promptContext: undefined })}
            onLogout={handleLogout}
          />
          <main className="flex-1 pt-8 pb-16">
            <PricingSection
              currentUser={user || undefined}
              onSelectPlan={(plan, cycle) => {
                handleUpgradePlan(plan, cycle);
                navigate('dashboard');
              }}
            />
          </main>
          <Footer onNavigate={navigate} onOpenLegal={(type) => setLegalModalType(type)} />
        </div>
      )}

      {/* --- STUDIO LAYOUT (Dashboard, Books, Settings, Billing) --- */}
      {isStudioRoute && user && (
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={navigate}
            user={user}
            onLogout={handleLogout}
            isOpenMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            bookFilter={bookFilter}
            onSelectBookFilter={(f) => setBookFilter(f)}
          />

          {/* Main Content Area (Offset by sidebar on desktop) */}
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
            <Topbar
              user={user}
              onOpenMobileMenu={() => setMobileSidebarOpen(true)}
              onNavigate={navigate}
              onQuickCreate={() => {
                setActiveGenerationData(null);
                navigate('create');
              }}
              onLogout={handleLogout}
            />

            <main className="flex-1 pb-16">
              {currentRoute === 'dashboard' && (
                <DashboardHome
                  user={user}
                  books={books}
                  onCreateNewBook={() => {
                    setActiveGenerationData(null);
                    navigate('create');
                  }}
                  onOpenBook={(book) => {
                    setCurrentBook(book);
                    navigate('editor');
                  }}
                  onEditBook={(book) => {
                    setCurrentBook(book);
                    navigate('editor');
                  }}
                  onDuplicateBook={handleDuplicateBook}
                  onRenameBook={handleRenameBook}
                  onExportBook={(book) => {
                    setCurrentBook(book);
                    navigate('export');
                  }}
                  onDeleteBook={handleDeleteBook}
                />
              )}

              {currentRoute === 'books' && (
                <BookLibraryView
                  books={books}
                  initialFilter={bookFilter}
                  onCreateNewBook={() => {
                    setActiveGenerationData(null);
                    navigate('create');
                  }}
                  onOpenBook={(book) => {
                    setCurrentBook(book);
                    navigate('editor');
                  }}
                  onEditBook={(book) => {
                    setCurrentBook(book);
                    navigate('editor');
                  }}
                  onDuplicateBook={handleDuplicateBook}
                  onRenameBook={handleRenameBook}
                  onExportBook={(book) => {
                    setCurrentBook(book);
                    navigate('export');
                  }}
                  onDeleteBook={handleDeleteBook}
                />
              )}

              {currentRoute === 'settings' && (
                <SettingsView
                  user={user}
                  onUpdateUser={async (updated) => {
                    setUser(updated);
                    StorageService.setCurrentUser(updated);
                    try {
                      const serverUser = await AuthService.updateProfile({
                        name: updated.name,
                        defaultContentLanguage: updated.defaultContentLanguage,
                        interfaceLanguage: updated.interfaceLanguage
                      });
                      if (serverUser) {
                        setUser(serverUser);
                        StorageService.setCurrentUser(serverUser);
                      }
                      addToast('Profil synchronisé avec succès.', 'success');
                    } catch (err: any) {
                      console.error('[Settings] Erreur de mise à jour du profil:', err);
                      addToast('Impossible de synchroniser le profil avec le serveur.', 'error');
                    }
                  }}
                  onShowToast={addToast}
                />
              )}

              {currentRoute === 'billing' && (
                <BillingView
                  user={user}
                  onUpgradePlan={handleUpgradePlan}
                  onShowToast={addToast}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* --- STANDALONE FULL-SCREEN STUDIO FLOWS --- */}

      {/* CREATE BOOK FLOW */}
      {currentRoute === 'create' && (
        <div className="min-h-screen bg-[#08090d] flex flex-col">
          {/* Header Bar */}
          <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#090a0f]">
            <button
              onClick={() => {
                setActiveGenerationData(null);
                navigate('dashboard');
              }}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              ← Back to Studio
            </button>
            <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
              AI Book Generator
            </span>
            <div className="w-16" />
          </div>

          <main className="flex-1 flex items-center justify-center p-4">
            {!activeGenerationData ? (
              <CreateBookView
                initialPrompt={initialPromptFromHero}
                onConfirmGeneration={handleConfirmGeneration}
                onCancel={() => navigate('dashboard')}
              />
            ) : (
              <GenerationProgressView
                idea={activeGenerationData.idea}
                concept={activeGenerationData.concept}
                outline={activeGenerationData.outline}
                options={activeGenerationData.options}
                onComplete={handleGenerationCompleted}
                onOpenEditor={(b) => {
                  setCurrentBook(b);
                  navigate('editor');
                }}
                onExport={(b) => {
                  setCurrentBook(b);
                  navigate('export');
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* EDITOR VIEW */}
      {currentRoute === 'editor' && currentBook && (
        <EditorView
          book={currentBook}
          onSaveBook={handleSaveBook}
          onNavigateToCover={() => navigate('cover')}
          onNavigateToExport={() => navigate('export')}
          onBackToDashboard={() => navigate('dashboard')}
          onTrackAiUsage={handleTrackAiUsage}
        />
      )}

      {/* COVER STUDIO VIEW */}
      {currentRoute === 'cover' && currentBook && (
        <div className="min-h-screen bg-[#08090d]">
          <CoverStudioView
            book={currentBook}
            user={user}
            onSaveCover={(updatedCover) => {
              const updatedBook: Book = {
                ...currentBook,
                cover: updatedCover,
                updatedAt: new Date().toISOString()
              };
              handleSaveBook(updatedBook);
              addToast('New cover artwork applied to your book!', 'success');
              navigate('editor');
            }}
            onViewMockup={() => navigate('mockups')}
            onBackToEditor={() => navigate('editor')}
            onTrackAiUsage={handleTrackAiUsage}
            onRefundAiUsage={handleRefundAiUsage}
          />
        </div>
      )}

      {/* 3D MOCKUPS VIEW */}
      {currentRoute === 'mockups' && currentBook && (
        <div className="min-h-screen bg-[#08090d]">
          <MockupView
            book={currentBook}
            onBackToEditor={() => navigate('editor')}
            onShowToast={addToast}
          />
        </div>
      )}

      {/* EXPORT VIEW */}
      {currentRoute === 'export' && currentBook && (
        <div className="min-h-screen bg-[#08090d]">
          <ExportView
            book={currentBook}
            onBackToEditor={() => navigate('editor')}
            onShowToast={addToast}
          />
        </div>
      )}
    </div>
  );
}
