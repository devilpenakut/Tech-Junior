import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is guaranteed to be available in this environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEY = 'techmeme_news_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in milliseconds

interface CachedData {
  timestamp: number;
  data: NewsItem[];
}

/**
 * Fetches top Techmeme news, translates, and simplifies for kids.
 * Includes caching to save API quota.
 */
export const fetchTechNewsForKids = async (forceRefresh = false): Promise<NewsItem[]> => {
  // 1. Check Cache first (if not forced)
  if (!forceRefresh) {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached: CachedData = JSON.parse(cachedRaw);
        const now = Date.now();
        // If cache is valid (less than 1 hour old)
        if (now - cached.timestamp < CACHE_DURATION) {
          console.log("Serving news from cache (Saving API Quota)");
          return cached.data;
        }
      } catch (e) {
        console.warn("Cache parse error", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }

  try {
    console.log("Fetching fresh news from Gemini API...");
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
      const parsed = JSON.parse(response.text) as NewsItem[];
      
      // 2. Save to Cache
      const cacheData: CachedData = {
        timestamp: Date.now(),
        data: parsed
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      return parsed;
    }
    
    throw new Error("No content generated");

  } catch (error: any) {
    console.error("Error fetching news:", error);
    
    // Check for common billing/quota errors
    if (error.message?.includes('429') || error.status === 429) {
      throw new Error("Kuota API harian habis atau server sedang sibuk. Coba lagi besok ya!");
    }
    if (error.message?.includes('403') || error.status === 403) {
      throw new Error("Masalah izin API Key (Billing/Restriction). Cek konfigurasi.");
    }
    
    throw error;
  }
};