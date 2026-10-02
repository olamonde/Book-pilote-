import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { ViewRoute, User, Book, ToastNotification, Plan, CoverConfig } from './types';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
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
import { Showcase } from './components/landing/Showcase';
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

  // Books State (strictly scoped to authenticated user)
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

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
            const userBooks = StorageService.getBooks(currentUser.id);
            setBooks(userBooks);
            setCurrentBook(userBooks.length > 0 ? userBooks[0] : null);
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
  }, []);

  // Keep books strictly synchronized with current logged-in user
  useEffect(() => {
    if (user?.id) {
      const userBooks = StorageService.getBooks(user.id);
      setBooks(userBooks);
      setCurrentBook((prev) => {
        if (prev && userBooks.some((b) => b.id === prev.id)) return prev;
        return userBooks.length > 0 ? userBooks[0] : null;
      });
    } else {
      setBooks([]);
      setCurrentBook(null);
    }
  }, [user?.id]);

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
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    StorageService.setCurrentUser(authenticatedUser);
    const userBooks = StorageService.getBooks(authenticatedUser.id);
    setBooks(userBooks);
    setCurrentBook(userBooks.length > 0 ? userBooks[0] : null);
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

  const handleOnboardingComplete = async (selectedPlan: Plan) => {
    setOnboardingOpen(false);
    if (user) {
      const limits: Record<Plan, number> = {
        free: 5,
        creator: 50,
        pro: 200
      };
      const updatedUser: User = {
        ...user,
        plan: selectedPlan,
        aiGenerationsLimit: limits[selectedPlan] || 5,
        hasCompletedOnboarding: true
      };
      setUser(updatedUser);
      StorageService.setCurrentUser(updatedUser);
      AuthService.updateProfile({ hasCompletedOnboarding: true }).catch(() => {});

      if (initialPromptFromHero) {
        navigate('create');
        addToast('Votre livre est prêt à être généré avec votre idée !', 'success');
      } else {
        navigate('dashboard');
        addToast(`Plan ${selectedPlan.toUpperCase()} activé. Bienvenue sur Book Pilot !`, 'success');
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

  const handleGenerationCompleted = (newBook: Book) => {
    const ownerId = user?.id || StorageService.getCurrentUser()?.id || newBook.userId;
    const bookWithOwner: Book = {
      ...newBook,
      userId: ownerId
    };
    // Save new book to library scoped to current user
    const updatedBooks = StorageService.saveBook(bookWithOwner, ownerId);
    setBooks(updatedBooks);
    setCurrentBook(bookWithOwner);

    // Sync latest user AI quota and state from server
    if (user) {
      AuthService.getCurrentUser().then((refreshed) => {
        if (refreshed) {
          setUser(refreshed);
          StorageService.setCurrentUser(refreshed);
        }
      }).catch(() => {});
    }

    addToast(`"${newBook.title}" a été relié et sauvegardé dans votre bibliothèque !`, 'success');
  };

  // Editor and Book CRUD
  const handleSaveBook = (updatedBook: Book) => {
    const ownerId = user?.id || updatedBook.userId;
    const updatedBooks = StorageService.saveBook(updatedBook, ownerId);
    setBooks(updatedBooks);
    setCurrentBook(updatedBook);

    // Prepare future cloud backup sync silently
    fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(updatedBook)
    }).catch(() => {});
  };

  const handleTrackAiUsage = () => {
    if (user) {
      AuthService.getCurrentUser().then((refreshed) => {
        if (refreshed) {
          setUser(refreshed);
          StorageService.setCurrentUser(refreshed);
        }
      }).catch(() => {});
    }
  };

  const handleRefundAiUsage = () => {
    if (user) {
      AuthService.getCurrentUser().then((refreshed) => {
        if (refreshed) {
          setUser(refreshed);
          StorageService.setCurrentUser(refreshed);
        }
      }).catch(() => {});
    }
  };

  const handleDuplicateBook = (bookId: string) => {
    const target = books.find((b) => b.id === bookId);
    if (!target) return;

    const ownerId = user?.id || target.userId;
    const duplicated: Book = {
      ...target,
      id: `book-${Date.now()}`,
      userId: ownerId,
      title: `${target.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = StorageService.saveBook(duplicated, ownerId);
    setBooks(updated);
    addToast(`Dupliqué "${target.title}".`, 'success');
  };

  const handleRenameBook = (bookId: string) => {
    const target = books.find((b) => b.id === bookId);
    if (!target) return;

    const newTitle = prompt('Entrez le nouveau titre du livre :', target.title);
    if (newTitle && newTitle.trim()) {
      const ownerId = user?.id || target.userId;
      const updatedBook: Book = {
        ...target,
        title: newTitle.trim(),
        cover: {
          ...target.cover,
          title: newTitle.trim()
        },
        updatedAt: new Date().toISOString()
      };
      const updatedList = StorageService.saveBook(updatedBook, ownerId);
      setBooks(updatedList);
      if (currentBook?.id === bookId) setCurrentBook(updatedBook);
      addToast('Livre renommé avec succès.', 'success');
    }
  };

  const handleDeleteBook = (bookId: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer définitivement ce projet de livre ?')) {
      const updated = StorageService.deleteBook(bookId, user?.id);
      setBooks(updated);
      if (currentBook?.id === bookId) {
        setCurrentBook(updated.length > 0 ? updated[0] : null);
      }
      addToast('Projet supprimé de votre bibliothèque.', 'info');
    }
  };

  // Plan Upgrade
  const handleUpgradePlan = (newPlan: Plan, cycle: 'monthly' | 'yearly') => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'signup' });
      return;
    }

    const limits: Record<Plan, number> = {
      free: 5,
      creator: 50,
      pro: 200
    };

    const updatedUser: User = {
      ...user,
      plan: newPlan,
      billingCycle: cycle,
      aiGenerationsLimit: limits[newPlan]
    };

    StorageService.setCurrentUser(updatedUser);
    setUser(updatedUser);
    addToast(`Upgraded to ${newPlan.toUpperCase()} tier! Quotas updated.`, 'success');
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
            <Showcase
              onSelectBookTemplate={(item) => {
                handleStartFromHero(item.description);
              }}
            />
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
                  onUpdateUser={(updated) => {
                    setUser(updated);
                    StorageService.setCurrentUser(updated);
                    AuthService.updateProfile({
                      name: updated.name,
                      defaultContentLanguage: updated.defaultContentLanguage,
                      interfaceLanguage: updated.interfaceLanguage
                    }).catch(() => {});
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
