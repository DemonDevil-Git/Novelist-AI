import React, { useState, useCallback } from 'react';
import { AppMode, Illustration, Chapter, EditorSettings } from './types';
import Editor from './components/Editor';
import IllustrationPanel from './components/IllustrationPanel';
import ChapterSidebar from './components/ChapterSidebar';
import FormatToolbar from './components/FormatToolbar';
import { generateNovelIllustration } from './services/geminiService';
import { Feather, Minimize2 } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  
  // Chapter State
  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: '1',
      title: 'Chapter 1: The Lighthouse',
      content: `The old lighthouse stood defiant against the crashing waves. For fifty years, Silas had climbed the spiral stairs, his knees aching more with each passing winter. 

Tonight was different. The storm wasn't just wind and rain; there was a peculiar green tint to the lightning that made the hairs on his arms stand up.

He reached the lantern room and froze. The great glass lens was already rotating, but the light it cast wasn't the warm yellow beam he knew. It was a piercing violet that seemed to cut through reality itself.`
    }
  ]);
  
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

  // --- Handlers ---

  const updateChapter = (id: string, field: keyof Chapter, value: string) => {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch));
  };

  const addChapter = () => {
    const newId = Date.now().toString();
    const newChapter: Chapter = {
      id: newId,
      title: `Chapter ${chapters.length + 1}`,
      content: ''
    };
    setChapters([...chapters, newChapter]);
    // Scroll to new chapter logic is handled by UI interaction usually, 
    // but we can set active to help highlighting
    setActiveChapterId(newId);
    setTimeout(() => scrollToChapter(newId), 100);
  };

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) return; // Prevent deleting last chapter
    setChapters(prev => prev.filter(ch => ch.id !== id));
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
    if (mode === newMode) return; // No op
    setMode(newMode);
  };

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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#fcfaf7] text-gray-900 font-sans">
      
      {/* Top Bar - Hidden in Zen, Visible in Creative/Editor */}
      <header 
        className={`flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white transition-all duration-500 z-30
          ${mode === AppMode.ZEN ? '-mt-16 opacity-0' : 'mt-0 opacity-100 shadow-sm'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
            <Feather size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-stone-800">Novelist AI</h1>
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