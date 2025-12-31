import React from 'react';
import { FormatToolbarProps } from '../types';
import { Type, AlignLeft, ArrowUp } from 'lucide-react';

const FormatToolbar: React.FC<FormatToolbarProps> = ({ settings, onUpdateSettings }) => {
  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-stone-200 shadow-sm z-10 overflow-x-auto">
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-stone-400" />
        <select
          value={settings.fontFamily}
          onChange={(e) => onUpdateSettings('fontFamily', e.target.value)}
          className="text-sm border-none bg-stone-50 rounded-md py-1 px-2 focus:ring-1 focus:ring-indigo-500 text-stone-700 cursor-pointer hover:bg-stone-100"
        >
          <option value="font-serif">Merriweather (Serif)</option>
          <option value="font-sans">Inter (Sans)</option>
          <option value="font-mono">Monospace</option>
        </select>
      </div>

      <div className="w-px h-4 bg-stone-200"></div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-stone-500">Size</span>
        <select
          value={settings.fontSize}
          onChange={(e) => onUpdateSettings('fontSize', e.target.value)}
          className="text-sm border-none bg-stone-50 rounded-md py-1 px-2 focus:ring-1 focus:ring-indigo-500 text-stone-700 cursor-pointer hover:bg-stone-100"
        >
          <option value="text-sm">Small</option>
          <option value="text-base">Normal</option>
          <option value="text-lg">Large</option>
          <option value="text-xl">Extra Large</option>
          <option value="text-2xl">Header</option>
        </select>
      </div>

      <div className="w-px h-4 bg-stone-200"></div>

      <div className="flex items-center gap-2">
        <AlignLeft className="w-4 h-4 text-stone-400" />
        <select
          value={settings.lineHeight}
          onChange={(e) => onUpdateSettings('lineHeight', e.target.value)}
          className="text-sm border-none bg-stone-50 rounded-md py-1 px-2 focus:ring-1 focus:ring-indigo-500 text-stone-700 cursor-pointer hover:bg-stone-100"
        >
          <option value="leading-tight">Tight</option>
          <option value="leading-normal">Normal</option>
          <option value="leading-relaxed">Relaxed</option>
          <option value="leading-loose">Loose</option>
        </select>
      </div>
    </div>
  );
};

export default FormatToolbar;