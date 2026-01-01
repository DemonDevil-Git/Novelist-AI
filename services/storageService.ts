import { Work } from '../types';

const API_URL = 'http://localhost:3001/api';
const STORAGE_KEY = 'novelist-ai-works';

export const storageService = {
  async fetchWorks(): Promise<Work[]> {
    try {
      const response = await fetch(`${API_URL}/works`);
      if (!response.ok) throw new Error('Failed to fetch works');
      const works = await response.json();
      // Sync successful: update local cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
      return works;
    } catch (error) {
      console.warn("Server connection error, falling back to localStorage:", error);
      // Fallback to local cache
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  },

  async saveWork(work: Work): Promise<void> {
    // 1. Always save to LocalStorage first (Optimistic / Offline capability)
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let works: Work[] = saved ? JSON.parse(saved) : [];
        const index = works.findIndex(w => w.id === work.id);
        if (index >= 0) {
            works[index] = work;
        } else {
            works.unshift(work);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
    } catch (e) {
        console.error("LocalStorage save failed", e);
    }

    // 2. Try saving to Server
    try {
      const response = await fetch(`${API_URL}/works`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(work),
      });
      if (!response.ok) throw new Error('Failed to save work to server');
    } catch (error) {
      // Just log warning, don't throw, so app continues to function offline
      console.warn("Server save error (offline mode):", error);
    }
  },

  async deleteWork(id: string): Promise<void> {
    // 1. Update LocalStorage
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const works: Work[] = JSON.parse(saved);
            const newWorks = works.filter(w => w.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newWorks));
        }
    } catch (e) {
        console.error("LocalStorage delete failed", e);
    }

    // 2. Try delete on Server
    try {
      const response = await fetch(`${API_URL}/works/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete work on server');
    } catch (error) {
      console.warn("Server delete error (offline mode):", error);
    }
  },

  /**
   * Saves a base64 image to the local server.
   * Returns the server URL (e.g., http://localhost:3001/images/md5.png) if successful.
   * Returns null if the server is offline.
   */
  async saveImage(base64Image: string): Promise<string | null> {
    try {
        const response = await fetch(`${API_URL}/save-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image }),
        });
        
        if (!response.ok) throw new Error('Failed to upload image');
        
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.warn("Image save to server failed (likely offline). Keeping base64 in memory.", error);
        return null;
    }
  }
};