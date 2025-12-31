import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an illustration based on a text snippet from a novel.
 * Uses the 'nano banana' model (gemini-2.5-flash-image).
 */
export const generateNovelIllustration = async (textSnippet: string): Promise<string> => {
  if (!textSnippet || textSnippet.trim().length === 0) {
    throw new Error("Please select some text to generate an illustration.");
  }

  try {
    const prompt = `Create an artistic, novel-style illustration based on the following text segment: "${textSnippet}". The style should be evocative and suitable for a book illustration.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Mapped to Nano Banana per guidelines
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3", // Standard book illustration ratio
        },
      },
    });

    // Check for inline data (base64 image)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64Data}`;
        }
      }
    }

    throw new Error("No image data returned from the model.");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a short, creative chapter title based on the chapter content.
 * Uses 'gemini-3-flash-preview' for text tasks.
 */
export const generateChapterTitle = async (chapterContent: string): Promise<string> => {
  if (!chapterContent || chapterContent.trim().length < 10) {
    throw new Error("Chapter content is too short to generate a title.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Read the following chapter text and generate a single, creative, short title (max 6 words) for it. Do not include "Chapter X" or quotes in the output, just the title text itself. 
      
      Text:
      ${chapterContent.substring(0, 5000)}`, // Limit context to first 5000 chars to save tokens/speed
    });

    return response.text?.trim() || "Untitled Chapter";
  } catch (error) {
    console.error("Gemini Title Generation Error:", error);
    throw error;
  }
};