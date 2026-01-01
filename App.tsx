import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, Illustration, Chapter, EditorSettings, Work } from './types';
import Editor from './components/Editor';
import IllustrationPanel from './components/IllustrationPanel';
import ChapterSidebar from './components/ChapterSidebar';
import FormatToolbar from './components/FormatToolbar';
import Library from './components/Library';
import ConfirmationModal from './components/ConfirmationModal';
import { generateNovelIllustration, generateChapterTitle } from './services/geminiService';
import { storageService } from './services/storageService';
import { Feather, Minimize2, Undo2, Redo2, Download, Cloud, ChevronLeft, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- Global State ---
  const [works, setWorks] = useState<Work[]>([]);
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  
  // --- Active Work State (Derived/Local) ---
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [history, setHistory] = useState<Chapter[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const historyTimeoutRef = useRef<number | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isGeneratingTitleFor, setIsGeneratingTitleFor] = useState<string | null>(null);

  // --- Modal State ---
  const [workToDelete, setWorkToDelete] = useState<string | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);

  // Creative Mode State
  const [selectedText, setSelectedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Editor Appearance Settings
  const [settings, setSettings] = useState<EditorSettings>({
    fontFamily: 'font-serif',
    fontSize: 'text-lg',
    lineHeight: 'leading-loose',
  });

  // --- Helpers ---
  const activeWork = works.find(w => w.id === activeWorkId);
  
  // Count words across chapters
  const countWords = (text: string) => {
    if (!text) return 0;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };
  
  const totalWords = activeWork 
    ? activeWork.chapters.reduce((acc, ch) => acc + countWords(ch.content), 0)
    : 0;

  // --- Initialization & Storage ---

  // Load Works from Server (or Fallback) on Mount
  useEffect(() => {
    const loadWorks = async () => {
      try {
        const loadedWorks = await storageService.fetchWorks();
        if (loadedWorks) {
          setWorks(loadedWorks);
        }
      } catch (e) {
        console.error("Failed to load works", e);
      }
    };
    loadWorks();
  }, []);

  // Auto-save ACTIVE Work
  useEffect(() => {
    if (!activeWork) return;

    const handler = setTimeout(async () => {
       try {
         await storageService.saveWork(activeWork);
         setLastSaved(new Date());
       } catch (e) {
         console.error("Auto-save failed", e);
       }
    }, 2000); // Debounce save to 2 seconds

    return () => clearTimeout(handler);
  }, [activeWork]);

  // --- Library Actions ---

  const handleCreateWork = async () => {
    const newWorkId = Date.now().toString();
    const newWork: Work = {
        id: newWorkId,
        title: 'Untitled Novel',
        chapters: [{
            id: '1',
            title: 'Chapter 1',
            content: ''
        }],
        illustrations: [],
        lastModified: Date.now()
    };
    
    // Optimistic update
    setWorks([newWork, ...works]);
    
    // Save (Service handles server/local)
    try {
        await storageService.saveWork(newWork);
        handleSelectWork(newWorkId);
    } catch (e) {
        console.error("Error creating work", e);
    }
  };

  const handleSelectWork = (workId: string) => {
    setActiveWorkId(workId);
    setMode(AppMode.EDITOR);
    
    // Reset History for new session
    const work = works.find(w => w.id === workId);
    if (work) {
        setHistory([work.chapters]);
        setHistoryIndex(0);
        setActiveChapterId(work.chapters[0]?.id || null);
    }
  };

  // Step 1: Request Delete (Opens Modal)
  const handleDeleteWorkRequest = (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    setWorkToDelete(workId);
  };

  // Step 2: Confirm Delete (Actual Action)
  const confirmDeleteWork = async () => {
    if (workToDelete) {
        // Optimistic UI update
        setWorks(prev => prev.filter(w => w.id !== workToDelete));
        if (activeWorkId === workToDelete) {
            setActiveWorkId(null);
        }
        
        try {
            await storageService.deleteWork(workToDelete);
        } catch (e) {
            console.error("Delete failed", e);
        }
        
        setWorkToDelete(null);
    }
  };

  const handleBackToLibrary = () => {
    setActiveWorkId(null);
    setMode(AppMode.EDITOR); // Reset mode for next time
  };

  // --- Editor Logic (Acting on Active Work) ---

  const updateWorkChapters = (newChapters: Chapter[]) => {
      if (!activeWorkId) return;

      // Update Works State
      setWorks(prev => prev.map(w => {
          if (w.id === activeWorkId) {
              return { ...w, chapters: newChapters, lastModified: Date.now() };
          }
          return w;
      }));

      // Update History (Debounced)
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = window.setTimeout(() => {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newChapters);
          if (newHistory.length > 50) newHistory.shift();
          else setHistoryIndex(newHistory.length - 1);
          setHistory(newHistory);
      }, 800);
  };

  const updateWorkIllustrations = (newIllustrations: Illustration[]) => {
      if (!activeWorkId) return;
      setWorks(prev => prev.map(w => {
          if (w.id === activeWorkId) {
              return { ...w, illustrations: newIllustrations, lastModified: Date.now() };
          }
          return w;
      }));
  };

  const updateWorkTitle = (newTitle: string) => {
    if (!activeWorkId) return;
    setWorks(prev => prev.map(w => {
        if (w.id === activeWorkId) {
            return { ...w, title: newTitle, lastModified: Date.now() };
        }
        return w;
    }));
  };

  // --- Chapter Manipulation ---

  const updateChapter = (id: string, field: keyof Chapter, value: string) => {
    if (!activeWork) return;
    const newChapters = activeWork.chapters.map(ch => ch.id === id ? { ...ch, [field]: value } : ch);
    updateWorkChapters(newChapters);
  };

  const addChapter = () => {
    if (!activeWork) return;
    const newId = Date.now().toString();
    const newChapter: Chapter = {
      id: newId,
      title: `Chapter ${activeWork.chapters.length + 1}`,
      content: ''
    };
    const newChapters = [...activeWork.chapters, newChapter];
    
    // Immediate state update to force re-render
    setWorks(prev => prev.map(w => {
        if (w.id === activeWorkId) return { ...w, chapters: newChapters, lastModified: Date.now() };
        return w;
    }));
    
    // Immediate history push
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newChapters);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setActiveChapterId(newId);
    setTimeout(() => {
        const element = document.getElementById(`chapter-${newId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Step 1: Request Delete Chapter
  const handleDeleteChapterRequest = (id: string) => {
    if (!activeWork || activeWork.chapters.length <= 1) {
        return; 
    }
    setChapterToDelete(id);
  };

  // Step 2: Confirm Delete Chapter
  const confirmDeleteChapter = () => {
     if (!activeWork || !chapterToDelete) return;

    const newChapters = activeWork.chapters.filter(ch => ch.id !== chapterToDelete);
    
    setWorks(prev => prev.map(w => {
        if (w.id === activeWorkId) return { ...w, chapters: newChapters, lastModified: Date.now() };
        return w;
    }));

    // Immediate history push
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newChapters);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setChapterToDelete(null);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      // Directly modify works without triggering new history push
      setWorks(prev => prev.map(w => {
          if (w.id === activeWorkId) return { ...w, chapters: history[newIndex], lastModified: Date.now() };
          return w;
      }));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWorks(prev => prev.map(w => {
          if (w.id === activeWorkId) return { ...w, chapters: history[newIndex], lastModified: Date.now() };
          return w;
      }));
    }
  };

  // --- Features ---

  const handleExportMarkdown = () => {
    if (!activeWork) return;
    let mdContent = `# ${activeWork.title}\n\n`;
    activeWork.chapters.forEach(ch => {
        mdContent += `## ${ch.title}\n\n${ch.content}\n\n`;
    });
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWork.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateIllustration = async () => {
    if (!selectedText || !activeWork) return;

    setIsGenerating(true);
    try {
      const base64Image = await generateNovelIllustration(selectedText);
      
      // Attempt to save to server to get a persistent file URL
      let finalImageUrl = base64Image;
      try {
        const savedUrl = await storageService.saveImage(base64Image);
        if (savedUrl) {
            finalImageUrl = savedUrl;
        }
      } catch (saveError) {
        console.warn("Could not save image to server, using base64 fallback.");
      }

      const newIllustration: Illustration = {
        id: Date.now().toString(),
        imageUrl: finalImageUrl,
        promptSnippet: selectedText,
        timestamp: Date.now(),
      };
      updateWorkIllustrations([newIllustration, ...activeWork.illustrations]);
    } catch (error) {
      alert("Failed to generate illustration. Please try again or check your API key quotas.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTitle = async (chapterId: string) => {
    if (!activeWork) return;
    const chapter = activeWork.chapters.find(c => c.id === chapterId);
    if (!chapter || chapter.content.length < 50) {
        alert("Content too short to generate a title.");
        return;
    }

    setIsGeneratingTitleFor(chapterId);
    try {
        const newTitle = await generateChapterTitle(chapter.content);
        updateChapter(chapterId, 'title', newTitle);
    } catch (e) {
        alert("Could not generate title.");
    } finally {
        setIsGeneratingTitleFor(null);
    }
  };

  const scrollToChapter = (id: string) => {
    setActiveChapterId(id);
    const element = document.getElementById(`chapter-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- Render ---

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#fcfaf7] text-gray-900 font-sans">
      
      {/* Modals */}
      <ConfirmationModal
        isOpen={!!workToDelete}
        title="Delete Novel"
        message="Are you sure you want to delete this entire novel? The associated folder and files will be removed from your disk."
        confirmLabel="Delete Novel"
        onConfirm={confirmDeleteWork}
        onCancel={() => setWorkToDelete(null)}
      />

      <ConfirmationModal
        isOpen={!!chapterToDelete}
        title="Delete Chapter"
        message="Are you sure you want to delete this chapter? This action cannot be undone."
        confirmLabel="Delete Chapter"
        onConfirm={confirmDeleteChapter}
        onCancel={() => setChapterToDelete(null)}
      />

      {/* Top Bar - Common Header */}
      <header 
        className={`flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white transition-all duration-500 z-30
          ${mode === AppMode.ZEN && activeWorkId ? '-mt-16 opacity-0' : 'mt-0 opacity-100 shadow-sm'}`}
      >
        <div className="flex items-center gap-4">
          <div 
            onClick={handleBackToLibrary}
            className={`flex items-center gap-2 cursor-pointer group ${!activeWorkId ? 'pointer-events-none' : ''}`}
          >
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white shadow-md group-hover:bg-indigo-600 transition-colors">
                {activeWorkId ? <ChevronLeft size={20} /> : <Feather size={18} />}
            </div>
            <h1 className="text-lg font-bold tracking-tight text-stone-800 hidden md:block group-hover:text-indigo-700 transition-colors">
                Novelist AI
            </h1>
          </div>
          
          {/* Editor Action Buttons (Only visible if active work) */}
          {activeWorkId && (
            <div className="flex items-center gap-1 border-l border-stone-200 pl-4">
                <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-stone-500 hover:bg-stone-100 rounded-md disabled:opacity-30 transition-colors" title="Undo">
                    <Undo2 size={18} />
                </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-stone-500 hover:bg-stone-100 rounded-md disabled:opacity-30 transition-colors" title="Redo">
                    <Redo2 size={18} />
                </button>
                <button onClick={handleExportMarkdown} className="p-2 text-stone-500 hover:bg-stone-100 rounded-md transition-colors" title="Export Markdown">
                    <Download size={18} />
                </button>
            </div>
          )}
        </div>

        {/* Status / Title Area */}
        {activeWorkId && activeWork ? (
            <div className="flex flex-col items-center">
                <input 
                    value={activeWork.title}
                    onChange={(e) => updateWorkTitle(e.target.value)}
                    className="text-sm font-semibold text-stone-700 text-center bg-transparent border-none focus:ring-0 p-0 hover:bg-stone-50 rounded px-2 transition-colors"
                />
                <div className="flex items-center gap-2 text-[10px] font-medium text-stone-400">
                    <span>{totalWords.toLocaleString()} words</span>
                    {lastSaved && <span>• Saved {lastSaved.toLocaleTimeString()}</span>}
                </div>
            </div>
        ) : (
            <div className="text-sm font-medium text-stone-500">
                Library
            </div>
        )}
        
        {/* Mode Toggles (Only visible if active work) */}
        <div className="flex items-center gap-4">
            {activeWorkId && (
                <div className="flex bg-stone-100 rounded-lg p-1">
                    <button
                        onClick={() => setMode(AppMode.EDITOR)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.EDITOR ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setMode(AppMode.CREATIVE)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.CREATIVE ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        Creative
                    </button>
                    <button
                        onClick={() => setMode(AppMode.ZEN)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.ZEN ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        Zen
                    </button>
                </div>
            )}
        </div>
      </header>

      {/* Main View Switcher */}
      {!activeWorkId || !activeWork ? (
         // Library View
         <Library 
            works={works} 
            onSelectWork={handleSelectWork} 
            onCreateWork={handleCreateWork} 
            onDeleteWork={handleDeleteWorkRequest} 
         />
      ) : (
        // Editor View
        <main className="flex-1 flex overflow-hidden relative">
            
            {/* Left Sidebar */}
            <div 
                className={`transition-all duration-500 ease-in-out transform border-r border-stone-200 z-20
                    ${mode === AppMode.EDITOR ? 'translate-x-0 w-64 opacity-100' : '-translate-x-full w-0 opacity-0 overflow-hidden border-none'}
                `}
            >
                <div className="w-64 h-full">
                    <ChapterSidebar 
                        chapters={activeWork.chapters}
                        activeChapterId={activeChapterId}
                        onChapterSelect={scrollToChapter}
                        onAddChapter={addChapter}
                        onDeleteChapter={handleDeleteChapterRequest}
                        onUpdateTitle={(id, title) => updateChapter(id, 'title', title)}
                        onGenerateTitle={handleGenerateTitle}
                        isGeneratingTitleFor={isGeneratingTitleFor}
                    />
                </div>
            </div>

            {/* Center Area */}
            <div className="flex-1 relative flex flex-col min-w-0">
                {mode === AppMode.EDITOR && (
                    <FormatToolbar settings={settings} onUpdateSettings={(k, v) => setSettings(p => ({...p, [k]: v}))} />
                )}

                <Editor 
                    chapters={activeWork.chapters}
                    updateChapter={updateChapter}
                    mode={mode}
                    onSelectionChange={setSelectedText}
                    settings={settings}
                />

                {/* Zen Extras */}
                {mode === AppMode.ZEN && (
                    <>
                        <div className="fixed bottom-6 right-20 text-stone-400 text-xs select-none pointer-events-none opacity-40 flex items-center gap-2">
                            <span>{totalWords.toLocaleString()} words</span>
                        </div>
                        <button
                            onClick={() => setMode(AppMode.EDITOR)}
                            className="fixed top-6 right-6 p-3 rounded-full bg-stone-100/30 hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition-all duration-300 backdrop-blur-sm z-50"
                            title="Exit Zen Mode"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* Right Sidebar */}
            <div 
                className={`transition-all duration-500 ease-in-out transform border-l border-stone-200 z-20
                    ${mode === AppMode.CREATIVE ? 'translate-x-0 w-80 opacity-100' : 'translate-x-full w-0 opacity-0 overflow-hidden border-none'}
                `}
            >
                <div className="w-80 h-full">
                    <IllustrationPanel 
                        illustrations={activeWork.illustrations}
                        isGenerating={isGenerating}
                        onGenerate={handleGenerateIllustration}
                        selectedText={selectedText}
                    />
                </div>
            </div>
        </main>
      )}
    </div>
  );
};

export default App;