import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  BookText,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { getReaderInfo, saveReadingProgress, getReaderContent } from '../api/readerApi';

export default function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [readerInfo, setReaderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Content state for HTML/text reader
  const [htmlContent, setHtmlContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Reader settings
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light' | 'sepia'
  const [fontSize, setFontSize] = useState(18); // for html/text
  const [zoom, setZoom] = useState(100); // percentage for pdf/embed
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reading progress state
  const [progress, setProgress] = useState(0);
  const [initialProgress, setInitialProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // 1. Fetch reader metadata
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getReaderInfo(bookId)
      .then((data) => {
        if (!isMounted) return;
        setReaderInfo(data);
        const p = data.progress || 0;
        setProgress(p);
        setInitialProgress(p);
        setCurrentPage(data.current_page || 1);
        setTotalPages(data.total_pages || 100);

        if (p > 0 && p < 100) {
          setShowResumeBanner(true);
        }

        // If reader_type is HTML, fetch sanitized text content
        if (data.available && (data.reader_type === 'html' || data.reader_type === 'text')) {
          setContentLoading(true);
          getReaderContent(bookId)
            .then((res) => {
              if (isMounted) setHtmlContent(res.content);
            })
            .catch(() => {
              // fallback to iframe if content API fails
            })
            .finally(() => {
              if (isMounted) setContentLoading(false);
            });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load reader information.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  // Set document title
  useEffect(() => {
    if (readerInfo?.title) {
      document.title = `Reading: ${readerInfo.title} · SmartLib`;
    }
    return () => {
      document.title = 'SmartLib';
    };
  }, [readerInfo?.title]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Save progress handler
  const persistProgress = useCallback(
    (newProgress, page) => {
      setProgress(newProgress);
      if (page) setCurrentPage(page);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSavingProgress(true);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveReadingProgress(bookId, {
            progress: newProgress,
            current_page: page || currentPage,
            total_pages: totalPages,
          });
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
        } catch {
          // silently fail progress save
        } finally {
          setSavingProgress(false);
        }
      }, 600);
    },
    [bookId, currentPage, totalPages]
  );

  // Page navigation
  const handlePageChange = (newPage) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage));
    const newProgress = Math.round((validPage / totalPages) * 100);
    persistProgress(newProgress, validPage);
  };

  // Slider change
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    const newPage = Math.max(1, Math.round((val / 100) * totalPages));
    persistProgress(val, newPage);
  };

  // Theme styling classes
  const themeStyles = {
    dark: 'bg-ink-950 text-fg',
    light: 'bg-[#fcfbf9] text-[#1c1c1e]',
    sepia: 'bg-[#f7efe3] text-[#4a3928]',
  };

  const headerThemeStyles = {
    dark: 'bg-ink-900/90 border-white/10 text-fg',
    light: 'bg-white/95 border-black/10 text-gray-900 shadow-sm',
    sepia: 'bg-[#efe5d6]/95 border-[#dfd2be] text-[#4a3928] shadow-sm',
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-ink-950 text-fg">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
        <p className="text-sm font-medium text-fg-muted">Opening SmartLib Reader…</p>
      </div>
    );
  }

  // Error State
  if (error || !readerInfo) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-ink-950 text-fg">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h1 className="mt-4 text-xl font-bold">Unable to Open Reader</h1>
          <p className="mt-2 text-sm text-fg-muted">{error || 'Could not load reader for this book.'}</p>
          <button
            type="button"
            onClick={() => navigate(`/book/${bookId}`)}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Book
          </button>
        </div>
      </div>
    );
  }

  // Unavailable / Restricted Access State
  if (!readerInfo.available) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-ink-950 text-fg">
        <div className="card max-w-lg p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <BookText className="h-7 w-7" />
          </div>
          <span className="mt-4 inline-block rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning">
            {readerInfo.access_type === 'paid' ? 'Purchase Required' : 'Online Reading Unavailable'}
          </span>
          <h1 className="mt-3 text-2xl font-bold">{readerInfo.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">by {readerInfo.author}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg-subtle">
            {readerInfo.message || 'This book does not currently have a legally available online reading source.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate(`/book/${bookId}`)}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Book
            </button>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="btn-ghost inline-flex items-center justify-center gap-2"
            >
              Explore Other Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex h-screen w-full flex-col overflow-hidden select-none transition-colors duration-200 ${themeStyles[theme]}`}
    >
      {/* ============================================================
          TOP NAVIGATION & READER CONTROLS
          ============================================================ */}
      <header
        className={`z-20 flex flex-wrap items-center justify-between border-b px-4 py-2.5 backdrop-blur-md transition-colors ${headerThemeStyles[theme]}`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/book/${bookId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-medium hover:bg-white/10"
            title="Back to Book Details"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="min-w-0 truncate">
            <h1 className="truncate text-sm sm:text-base font-bold leading-tight">{readerInfo.title}</h1>
            <p className="truncate text-xs opacity-75">{readerInfo.author}</p>
          </div>
        </div>

        {/* Right: Controls & Progress Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Progress pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{progress}% read</span>
            {savingProgress && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
            {savedSuccess && <Check className="h-3 w-3 text-success" />}
          </div>

          {/* Font size controls for HTML reader */}
          {readerInfo.reader_type === 'html' && (
            <div className="flex items-center gap-1 rounded-lg border border-current/20 p-1">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(12, s - 2))}
                className="px-2 py-0.5 text-xs font-bold hover:bg-current/10 rounded"
                title="Decrease font size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(32, s + 2))}
                className="px-2 py-0.5 text-xs font-bold hover:bg-current/10 rounded"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          )}

          {/* Zoom controls for PDF / Embed */}
          {readerInfo.reader_type !== 'html' && (
            <div className="hidden md:flex items-center gap-1 rounded-lg border border-current/20 p-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1 hover:bg-current/10 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-1 text-xs">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="p-1 hover:bg-current/10 rounded"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Reading Theme Toggle */}
          <div className="flex items-center rounded-lg border border-current/20 p-0.5">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`rounded p-1.5 ${theme === 'dark' ? 'bg-white/20' : 'hover:bg-current/10'}`}
              title="Dark Mode"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`rounded p-1.5 ${theme === 'light' ? 'bg-black/10' : 'hover:bg-current/10'}`}
              title="Light Mode"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('sepia')}
              className={`rounded px-1.5 py-1 text-xs font-semibold ${theme === 'sepia' ? 'bg-[#dfd2be]' : 'hover:bg-current/10'}`}
              title="Sepia Mode"
            >
              Sepia
            </button>
          </div>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg p-2 hover:bg-current/10"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ============================================================
          RESUME PROGRESS BANNER
          ============================================================ */}
      {showResumeBanner && (
        <div className="z-10 flex items-center justify-between border-b border-brand/30 bg-brand/10 px-4 py-2 text-xs font-medium text-brand sm:px-6">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              You were previously reading this book at <strong>{initialProgress}%</strong> (page {currentPage} of{' '}
              {totalPages}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResumeBanner(false)}
              className="rounded px-2.5 py-1 font-semibold hover:bg-brand/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          MAIN BOOK CONTENT VIEWER
          ============================================================ */}
      <main className="relative flex-1 overflow-hidden">
        {/* Case 1: HTML / Text content */}
        {readerInfo.reader_type === 'html' && (
          <div className="h-full overflow-y-auto px-4 py-8 sm:px-8 md:px-16 lg:px-32">
            {contentLoading ? (
              <div className="flex h-64 items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <span className="text-sm">Fetching book content…</span>
              </div>
            ) : htmlContent ? (
              <div
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                className="mx-auto max-w-3xl font-serif select-text leading-relaxed"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-sm text-fg-muted">Opening text document directly in viewer…</p>
                <iframe
                  src={readerInfo.reader_url}
                  title={readerInfo.title}
                  className="mt-4 h-[70vh] w-full rounded-xl border border-current/10 shadow"
                />
              </div>
            )}
          </div>
        )}

        {/* Case 2: Embeddable iframe (Internet Archive BookReader / Open Library) */}
        {readerInfo.reader_type === 'iframe' && (
          <div className="h-full w-full">
            <iframe
              src={readerInfo.reader_url}
              title={readerInfo.title}
              className="h-full w-full border-0"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              allow="fullscreen; clipboard-read; encrypted-media"
              allowFullScreen
            />
          </div>
        )}

        {/* Case 3: PDF Document */}
        {readerInfo.reader_type === 'pdf' && (
          <div className="h-full w-full">
            <object
              data={`${readerInfo.reader_url}#page=${currentPage}&zoom=${zoom}`}
              type="application/pdf"
              className="h-full w-full"
            >
              <iframe
                src={`${readerInfo.reader_url}#page=${currentPage}`}
                title={readerInfo.title}
                className="h-full w-full border-0"
              />
            </object>
          </div>
        )}
      </main>

      {/* ============================================================
          BOTTOM CONTROL BAR (PAGE NAVIGATION & PROGRESS SLIDER)
          ============================================================ */}
      <footer
        className={`z-20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 backdrop-blur-md transition-colors ${headerThemeStyles[theme]}`}
      >
        {/* Left: Previous / Next Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn-ghost flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          <span className="text-xs font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn-ghost flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Middle: Progress Slider */}
        <div className="flex flex-1 items-center gap-3 max-w-md mx-4">
          <span className="text-xs font-medium opacity-70">0%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSliderChange}
            className="h-1.5 w-full cursor-pointer rounded-lg bg-current/20 accent-brand"
            aria-label="Reading progress percentage"
          />
          <span className="text-xs font-medium opacity-70">100%</span>
        </div>

        {/* Right: Quick progress actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => persistProgress(100, totalPages)}
            className="rounded px-2.5 py-1 text-xs font-medium hover:bg-current/10"
            title="Mark this book as finished"
          >
            Mark Completed
          </button>
          <button
            type="button"
            onClick={() => persistProgress(0, 1)}
            className="p-1 hover:bg-current/10 rounded"
            title="Reset progress to start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
