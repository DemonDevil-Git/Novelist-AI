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