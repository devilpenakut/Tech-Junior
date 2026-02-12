import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is guaranteed to be available in this environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches top Techmeme news, translates, and simplifies for kids.
 */
export const fetchTechNewsForKids = async (): Promise<NewsItem[]> => {
  try {
    const model = "gemini-3-flash-preview";
    
    // Using a combined prompt with Search Grounding to get fresh data.
    // Explicitly mentioning Techmeme URL to guide the search context.
    const prompt = `
      Kamu adalah asisten berita untuk anak-anak.
      Tugasmu:
      1. Cari informasi terkini tentang "Techmeme top stories" atau akses data terkait headline di https://techmeme.com/.
      2. Pilih 6 berita teknologi PALING PENTING yang sedang trending hari ini.
      3. Untuk setiap berita:
         - Temukan URL sumber aslinya (misalnya link ke The Verge, TechCrunch, CNBC, dll yang ditautkan oleh Techmeme). JANGAN mengarang URL. Gunakan URL yang benar-benar ada di hasil pencarian.
         - Buat Judul dalam Bahasa Indonesia yang seru.
         - Buat Ringkasan cerita pendek untuk anak umur 10 tahun (Bahasa Indonesia).

      Output JSON Array dengan 6 item.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Grounding to get real Techmeme data
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Judul berita Indonesia yang menarik" },
              summary: { type: Type.STRING, description: "Ringkasan cerita anak" },
              link: { type: Type.STRING, description: "URL valid ke artikel sumber berita (bukan halaman utama)" }
            },
            required: ["title", "summary", "link"]
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed as NewsItem[];
    }
    
    throw new Error("No content generated");

  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
};
