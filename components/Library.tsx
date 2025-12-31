import React from 'react';
import { LibraryProps } from '../types';
import { Plus, BookOpen, Clock, Trash2, Image as ImageIcon } from 'lucide-react';

const Library: React.FC<LibraryProps> = ({ works, onSelectWork, onCreateWork, onDeleteWork }) => {
  
  const getWordCount = (chapters: any[]) => {
    return chapters.reduce((acc, ch) => {
      const text = ch.content || '';
      return acc + (text.trim() ? text.trim().split(/\s+/).length : 0);
    }, 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-[#f4f4f5]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-800 font-serif">Your Library</h2>
          <p className="text-stone-500 mt-1">Select a novel to continue writing or start a new masterpiece.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Create New Work Card */}
          <button
            onClick={onCreateWork}
            className="group relative flex flex-col items-center justify-center h-72 rounded-xl border-2 border-dashed border-stone-300 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-full bg-stone-100 group-hover:bg-indigo-100 flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-8 h-8 text-stone-400 group-hover:text-indigo-600" />
            </div>
            <span className="font-semibold text-stone-500 group-hover:text-indigo-700">Create New Novel</span>
          </button>

          {/* Existing Works */}
          {works.sort((a, b) => b.lastModified - a.lastModified).map((work) => (
            <div 
              key={work.id}
              onClick={() => onSelectWork(work.id)}
              className="group relative flex flex-col h-72 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-stone-200"
            >
              {/* Cover Area */}
              <div className="h-40 bg-stone-100 relative overflow-hidden">
                {work.illustrations && work.illustrations.length > 0 ? (
                  <img 
                    src={work.illustrations[0].imageUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-300">
                    <BookOpen className="w-12 h-12 opacity-50" />
                  </div>
                )}
                
                {/* Delete Button (Visible on Hover) */}
                <button
                  onClick={(e) => onDeleteWork(e, work.id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Delete Novel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Info Area */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-stone-800 font-serif line-clamp-1 mb-1 group-hover:text-indigo-700 transition-colors">
                    {work.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(work.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-400 font-medium border-t border-stone-100 pt-3">
                  <span>{getWordCount(work.chapters).toLocaleString()} words</span>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    <span>{work.illustrations.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library;