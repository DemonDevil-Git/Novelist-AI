import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, Illustration, Chapter, EditorSettings } from './types';
import Editor from './components/Editor';
import IllustrationPanel from './components/IllustrationPanel';
import ChapterSidebar from './components/ChapterSidebar';
import FormatToolbar from './components/FormatToolbar';
import { generateNovelIllustration, generateChapterTitle } from './services/geminiService';
import { Feather, Minimize2, Undo2, Redo2, Download, Cloud } from 'lucide-react';

const STORAGE_KEY = 'novelist-ai-chapters';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  
  // Chapter State with History for Undo/Redo
  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: '1',
      title: 'Chapter 1: The Lighthouse',
      content: `The old lighthouse stood defiant against the crashing waves. For fifty years, Silas had climbed the spiral stairs, his knees aching more with each passing winter. 

Tonight was different. The storm wasn't just wind and rain; there was a peculiar green tint to the lightning that made the hairs on his arms stand up.

He reached the lantern room and froze. The great glass lens was already rotating, but the light it cast wasn't the warm yellow beam he knew. It was a piercing violet that seemed to cut through reality itself.`
    }
  ]);

  const [history, setHistory] = useState<Chapter[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const historyTimeoutRef = useRef<number | null>(null);
  
  const [activeChapterId, setActiveChapterId] = useState<string | null>('1');

  // Editor Appearance Settings
  const [settings, setSettings] = useState<EditorSettings>({
    fontFamily: 'font-serif',
    fontSize: 'text-lg',
    lineHeight: 'leading-loose',
  });

  // Creative Mode State
  const [selectedText, setSelectedText] = useState<string>('');
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // AI Title Generation State
  const [isGeneratingTitleFor, setIsGeneratingTitleFor] = useState<string | null>(null);

  // --- Initialization & Auto-Save ---

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            setChapters(parsed);
            setHistory([parsed]);
            setHistoryIndex(0);
            setActiveChapterId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load saved chapters", e);
      }
    } else {
        // Initialize history with default state
        setHistory([chapters]);
        setHistoryIndex(0);
    }
  }, []);

  // Save to local storage (Auto-save)
  useEffect(() => {
    const handler = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
        setLastSaved(new Date());
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(handler);
  }, [chapters]);

  // --- History Management (Undo/Redo) ---
  
  const pushToHistory = (newChapters: Chapter[]) => {
    // Debounce history updates to avoid saving every keystroke as a separate step
    if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
    }

    historyTimeoutRef.current = window.setTimeout(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newChapters);
        
        // Limit history size to 50 steps
        if (newHistory.length > 50) {
            newHistory.shift();
        } else {
            setHistoryIndex(newHistory.length - 1);
        }
        
        setHistory(newHistory);
    }, 800); 
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setChapters(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setChapters(history[newIndex]);
    }
  };

  // --- Content Handlers ---

  const updateChapter = (id: string, field: keyof Chapter, value: string) => {
    const newChapters = chapters.map(ch => ch.id === id ? { ...ch, [field]: value } : ch);
    setChapters(newChapters);
    pushToHistory(newChapters);
  };

  const addChapter = () => {
    const newId = Date.now().toString();
    const newChapter: Chapter = {
      id: newId,
      title: `Chapter ${chapters.length + 1}`,
      content: ''
    };
    const newChapters = [...chapters, newChapter];
    setChapters(newChapters);
    
    // Immediate push to history for structural changes
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newChapters);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setActiveChapterId(newId);
    setTimeout(() => scrollToChapter(newId), 100);
  };

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) return;
    const newChapters = chapters.filter(ch => ch.id !== id);
    setChapters(newChapters);

    // Immediate push to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newChapters);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const scrollToChapter = (id: string) => {
    setActiveChapterId(id);
    const element = document.getElementById(`chapter-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateSettings = (key: keyof EditorSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleMode = (newMode: AppMode) => {
    if (mode === newMode) return; 
    setMode(newMode);
  };

  // --- Export ---
  const handleExportMarkdown = () => {
    let mdContent = `# Novelist AI Export\n\n`;
    chapters.forEach(ch => {
        mdContent += `## ${ch.title}\n\n${ch.content}\n\n`;
    });
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novel_export.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Creative Handlers ---

  const handleSelectionChange = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  const handleGenerateIllustration = async () => {
    if (!selectedText) return;

    setIsGenerating(true);
    try {
      const base64Image = await generateNovelIllustration(selectedText);
      const newIllustration: Illustration = {
        id: Date.now().toString(),
        imageUrl: base64Image,
        promptSnippet: selectedText,
        timestamp: Date.now(),
      };
      setIllustrations((prev) => [newIllustration, ...prev]);
    } catch (error) {
      alert("Failed to generate illustration. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTitle = async (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    if (chapter.content.length < 50) {
        alert("Chapter content is too short to generate a title. Write a bit more first!");
        return;
    }

    setIsGeneratingTitleFor(chapterId);
    try {
        const newTitle = await generateChapterTitle(chapter.content);
        updateChapter(chapterId, 'title', newTitle);
    } catch (e) {
        alert("Could not generate title. Try again.");
    } finally {
        setIsGeneratingTitleFor(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#fcfaf7] text-gray-900 font-sans">
      
      {/* Top Bar */}
      <header 
        className={`flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white transition-all duration-500 z-30
          ${mode === AppMode.ZEN ? '-mt-16 opacity-0' : 'mt-0 opacity-100 shadow-sm'}`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white shadow-md">
                <Feather size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-stone-800 hidden md:block">Novelist AI</h1>
          </div>
          
          {/* Action Buttons */}
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
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
             {lastSaved ? (
                 <>
                    <Cloud size={14} />
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                 </>
             ) : (
                 <span>Unsaved</span>
             )}
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex bg-stone-100 rounded-lg p-1">
             <button
               onClick={() => toggleMode(AppMode.EDITOR)}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.EDITOR ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
             >
               Editor
             </button>
             <button
               onClick={() => toggleMode(AppMode.CREATIVE)}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.CREATIVE ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
             >
               Creative
             </button>
             <button
               onClick={() => toggleMode(AppMode.ZEN)}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === AppMode.ZEN ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
             >
               Zen
             </button>
           </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar - Chapter Navigation (Only in Editor Mode) */}
        <div 
          className={`transition-all duration-500 ease-in-out transform border-r border-stone-200 z-20
            ${mode === AppMode.EDITOR ? 'translate-x-0 w-64 opacity-100' : '-translate-x-full w-0 opacity-0 overflow-hidden border-none'}
          `}
        >
          <div className="w-64 h-full">
            <ChapterSidebar 
              chapters={chapters}
              activeChapterId={activeChapterId}
              onChapterSelect={scrollToChapter}
              onAddChapter={addChapter}
              onDeleteChapter={deleteChapter}
              onUpdateTitle={(id, title) => updateChapter(id, 'title', title)}
              onGenerateTitle={handleGenerateTitle}
              isGeneratingTitleFor={isGeneratingTitleFor}
            />
          </div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 relative flex flex-col min-w-0">
          
          {/* Format Toolbar - Only in Editor Mode */}
          {mode === AppMode.EDITOR && (
             <FormatToolbar settings={settings} onUpdateSettings={updateSettings} />
          )}

          {/* Editor Surface */}
          <Editor 
            chapters={chapters}
            updateChapter={updateChapter}
            mode={mode}
            onSelectionChange={handleSelectionChange}
            settings={settings}
          />

          {/* Floating Save Status for Zen Mode */}
          {mode === AppMode.ZEN && lastSaved && (
              <div className="fixed bottom-6 right-20 text-stone-300 text-xs select-none pointer-events-none opacity-50">
                  Auto-saved {lastSaved.toLocaleTimeString()}
              </div>
          )}

          {/* Floating Exit Zen Button */}
          {mode === AppMode.ZEN && (
            <button
              onClick={() => toggleMode(AppMode.EDITOR)}
              className="fixed top-6 right-6 p-3 rounded-full bg-stone-100/50 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all duration-300 backdrop-blur-sm z-50 group"
              title="Exit Zen Mode"
            >
              <Minimize2 size={20} />
            </button>
          )}
        </div>

        {/* Right Sidebar - Creative Visualizer (Only in Creative Mode) */}
        <div 
          className={`transition-all duration-500 ease-in-out transform border-l border-stone-200 z-20
            ${mode === AppMode.CREATIVE ? 'translate-x-0 w-80 opacity-100' : 'translate-x-full w-0 opacity-0 overflow-hidden border-none'}
          `}
        >
          <div className="w-80 h-full">
            <IllustrationPanel 
              illustrations={illustrations}
              isGenerating={isGenerating}
              onGenerate={handleGenerateIllustration}
              selectedText={selectedText}
            />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;