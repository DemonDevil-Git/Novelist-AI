import React from 'react';
import { Illustration, IllustrationPanelProps } from '../types';
import { Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

const IllustrationPanel: React.FC<IllustrationPanelProps> = ({ 
  illustrations, 
  isGenerating, 
  onGenerate, 
  selectedText 
}) => {
  return (
    <div className="w-80 border-l border-stone-200 bg-white flex flex-col h-full shadow-lg z-20">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center gap-2 bg-stone-50">
        <ImageIcon className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-stone-800">Visualizer</h2>
      </div>

      {/* Action Area */}
      <div className="p-4 border-b border-stone-100 bg-white sticky top-0">
        <div className="mb-2">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider block mb-1">
            Current Selection
          </label>
          <div className="h-16 bg-stone-50 rounded border border-stone-200 p-2 text-xs text-stone-600 italic overflow-y-auto">
            {selectedText ? `"${selectedText}"` : <span className="text-stone-400 not-italic">Select text in the editor to generate...</span>}
          </div>
        </div>
        
        <button
          onClick={onGenerate}
          disabled={!selectedText || isGenerating}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-200
            ${!selectedText || isGenerating 
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:transform active:scale-95'
            }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Dreaming...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Illustration</span>
            </>
          )}
        </button>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-stone-50/50">
        {illustrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-400">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No illustrations yet.</p>
          </div>
        ) : (
          illustrations.map((item) => (
            <div key={item.id} className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-stone-100">
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt="AI Generated" 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-stone-500 line-clamp-3 italic">
                  "{item.promptSnippet}"
                </p>
                <div className="mt-2 flex justify-between items-center">
                   <span className="text-[10px] text-stone-400">
                    {new Date(item.timestamp).toLocaleTimeString()}
                   </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IllustrationPanel;