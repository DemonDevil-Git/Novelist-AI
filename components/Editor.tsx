import React, { useRef, useEffect } from 'react';
import { AppMode, EditorProps } from '../types';

const Editor: React.FC<EditorProps> = ({ 
  chapters, 
  updateChapter, 
  mode, 
  onSelectionChange,
  settings 
}) => {
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const selectedText = target.value.substring(start, end);
      onSelectionChange(selectedText);
    } else {
      // Don't clear immediately to allow UI interaction in Creative mode, 
      // but strictly following previous logic implies clearing. 
      // For multi-textarea, checking if others are selected is complex, 
      // so we just reset if *this* one is clicked without selection.
      onSelectionChange('');
    }
  };

  // Auto-resize logic for all textareas
  useEffect(() => {
    chapters.forEach(chapter => {
      const el = textareaRefs.current[chapter.id];
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    });
  }, [chapters, settings, mode]);

  // Dynamic Styles based on settings and mode
  const containerClass = mode === AppMode.ZEN 
    ? "max-w-3xl mx-auto py-20 px-8 transition-all duration-700 ease-in-out" 
    : "max-w-4xl mx-auto px-12 py-12 transition-all duration-700 ease-in-out bg-white shadow-sm min-h-full my-4 rounded-lg";

  // Base styling + User Configurable Settings
  const contentStyle = `${settings.fontFamily} ${settings.fontSize} ${settings.lineHeight}`;

  return (
    <div className={`flex-1 h-full overflow-y-auto bg-[#fcfaf7] scroll-smooth ${mode === AppMode.ZEN ? 'cursor-text' : ''}`}>
      <div className={containerClass}>
        
        {chapters.map((chapter, index) => (
          <div key={chapter.id} id={`chapter-${chapter.id}`} className="mb-16 scroll-mt-24">
            
            {/* Chapter Heading */}
            <input
              type="text"
              value={chapter.title}
              onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
              placeholder="Chapter Title"
              className={`w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-stone-800 placeholder-stone-300 mb-6
                ${mode === AppMode.ZEN ? 'text-center text-3xl opacity-80' : 'text-3xl'}`}
            />

            {/* Chapter Content */}
            <textarea
              ref={(el) => { textareaRefs.current[chapter.id] = el; }}
              value={chapter.content}
              onChange={(e) => updateChapter(chapter.id, 'content', e.target.value)}
              onSelect={handleSelect}
              onMouseUp={handleSelect}
              onKeyUp={handleSelect}
              placeholder="Start writing..."
              className={`w-full bg-transparent border-none resize-none focus:ring-0 outline-none text-stone-700 placeholder-stone-300 overflow-hidden
                ${contentStyle}`}
              spellCheck={false}
              style={{ minHeight: '200px' }}
            />
            
            {/* Visual separator in non-Zen modes */}
            {mode !== AppMode.ZEN && index < chapters.length - 1 && (
              <div className="w-24 h-px bg-stone-200 mx-auto mt-12 mb-4"></div>
            )}
          </div>
        ))}

        {/* Padding at bottom to scroll comfortably */}
        <div className="h-[40vh]"></div>
      </div>
    </div>
  );
};

export default Editor;