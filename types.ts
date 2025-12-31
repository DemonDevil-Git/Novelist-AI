export enum AppMode {
  ZEN = 'ZEN',
  CREATIVE = 'CREATIVE',
  EDITOR = 'EDITOR',
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Illustration {
  id: string;
  imageUrl: string;
  promptSnippet: string;
  timestamp: number;
}

export interface EditorSettings {
  fontFamily: string; // Tailwind class like 'font-serif'
  fontSize: string;   // Tailwind class like 'text-lg'
  lineHeight: string; // Tailwind class like 'leading-relaxed'
}

export interface EditorProps {
  chapters: Chapter[];
  updateChapter: (id: string, field: keyof Chapter, value: string) => void;
  mode: AppMode;
  onSelectionChange: (selection: string) => void;
  settings: EditorSettings;
}

export interface IllustrationPanelProps {
  illustrations: Illustration[];
  isGenerating: boolean;
  onGenerate: () => void;
  selectedText: string;
}

export interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onChapterSelect: (id: string) => void;
  onAddChapter: () => void;
  onDeleteChapter: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onGenerateTitle: (id: string) => void;
  isGeneratingTitleFor: string | null;
}

export interface FormatToolbarProps {
  settings: EditorSettings;
  onUpdateSettings: (key: keyof EditorSettings, value: string) => void;
}
