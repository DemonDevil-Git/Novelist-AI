import React from 'react';
import { ChapterSidebarProps } from '../types';
import { Plus, Trash2, FileText, ChevronRight, Wand2, Loader2 } from 'lucide-react';

const ChapterSidebar: React.FC<ChapterSidebarProps> = ({
  chapters,
  activeChapterId,
  onChapterSelect,
  onAddChapter,
  onDeleteChapter,
  onUpdateTitle,
  onGenerateTitle,
  isGeneratingTitleFor
}) => {
  const getWordCount = (text: string) => {
    if (!text) return 0;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  return (
    <div className="w-64 bg-stone-50 border-r border-stone-200 h-full flex flex-col z-20 shadow-sm">
      <div className="p-4 border-b border-stone-200 bg-stone-100/50">
        <h2 className="font-semibold text-stone-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Chapters
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chapters.map((chapter) => (
          <div 
            key={chapter.id}
            className={`group flex flex-col p-2 rounded-md cursor-pointer transition-colors relative
              ${activeChapterId === chapter.id ? 'bg-white shadow-sm border border-stone-200' : 'hover:bg-stone-200/50'}`}
            onClick={() => onChapterSelect(chapter.id)}
          >
            <div className="flex items-center gap-2">
                <ChevronRight className={`w-3 h-3 text-stone-400 transition-transform ${activeChapterId === chapter.id ? 'rotate-90' : ''}`} />
                
                <input
                type="text"
                value={chapter.title}
                onChange={(e) => onUpdateTitle(chapter.id, e.target.value)}
                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 text-stone-700 font-medium placeholder-stone-400"
                placeholder="Untitled Chapter"
                onClick={(e) => e.stopPropagation()} 
                />

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    {/* AI Title Generator Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onGenerateTitle(chapter.id);
                        }}
                        disabled={isGeneratingTitleFor === chapter.id}
                        className="p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded transition-all"
                        title="Generate Title with AI"
                    >
                        {isGeneratingTitleFor === chapter.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                        ) : (
                            <Wand2 className="w-3 h-3" />
                        )}
                    </button>

                    {/* Delete Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Removed native confirm() to solve sandbox issue. 
                            // Logic is now handled by modal in App.tsx
                            onDeleteChapter(chapter.id);
                        }}
                        className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                        title="Delete Chapter"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            
            {/* Word Count Label */}
            <div className="ml-5 mt-1">
                 <span className="text-[10px] text-stone-400 font-medium">
                    {getWordCount(chapter.content)} words
                 </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-stone-200 bg-stone-100/30">
        <button
          onClick={onAddChapter}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Chapter
        </button>
      </div>
    </div>
  );
};

export default ChapterSidebar;