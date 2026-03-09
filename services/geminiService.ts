import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

const CACHE_KEY = 'techmeme_news_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in milliseconds
const GEMINI_MODEL = "gemini-3-flash-preview";
export const NEWS_COUNT = 6;

interface CachedData {
  timestamp: number;
  data: NewsItem[];
}

/**
 * Fetches top Techmeme news, translates, and simplifies for kids.
 * Includes caching to save API quota.
 */
export const fetchTechNewsForKids = async (forceRefresh = false): Promise<NewsItem[]> => {
  // 0. Check API Key presence (Critical for Vercel debugging)
  if (!process.env.API_KEY) {
    throw new Error("API Key tidak ditemukan! Pastikan Anda sudah memasukkan 'API_KEY' di Settings > Environment Variables pada Vercel.");
  }

  // Initialize Gemini Client here to ensure key is present
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Check Cache first (if not forced)
  if (!forceRefresh) {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached: CachedData = JSON.parse(cachedRaw);
        const now = Date.now();
        // If cache is valid (less than 1 hour old)
        if (now - cached.timestamp < CACHE_DURATION) {
          if (import.meta.env.DEV) console.log("Serving news from cache (Saving API Quota)");
          return cached.data;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }

  try {
    if (import.meta.env.DEV) console.log("Fetching fresh news from Gemini API...");

    const prompt = `
      Kamu adalah asisten berita untuk anak-anak.
      Tugasmu:
      1. Cari informasi terkini tentang "Techmeme top stories" atau akses data terkait headline di https://techmeme.com/.
      2. Pilih ${NEWS_COUNT} berita teknologi PALING PENTING yang sedang trending hari ini.
      3. Untuk setiap berita:
         - Temukan URL sumber aslinya (misalnya link ke The Verge, TechCrunch, CNBC, dll yang ditautkan oleh Techmeme). JANGAN mengarang URL. Gunakan URL yang benar-benar ada di hasil pencarian.
         - Buat Judul dalam Bahasa Indonesia yang seru.
         - Buat Ringkasan cerita pendek untuk anak umur 10 tahun (Bahasa Indonesia).

      Output JSON Array dengan ${NEWS_COUNT} item.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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
      let parsed: NewsItem[];
      try {
        parsed = JSON.parse(response.text) as NewsItem[];
      } catch {
        throw new Error("Gagal memproses data berita dari server.");
      }

      // 2. Save to Cache
      const cacheData: CachedData = {
        timestamp: Date.now(),
        data: parsed
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      return parsed;
    }

    throw new Error("No content generated");

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };

    // Customize error messages for better user experience
    if (err.message?.includes('429') || err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Kuota API Harian Habis (Error 429). Silakan coba lagi besok!");
    }

    if (err.message?.includes('403') || err.status === 403) {
      throw new Error("Masalah Izin API Key (Error 403). Cek konfigurasi.");
    }

    if (err.message?.includes('API Key tidak ditemukan') || err.message?.includes('memproses data')) {
      throw error; // Rethrow specific errors
    }

    throw new Error("Gagal mengambil berita. Server sedang sibuk atau ada gangguan jaringan.");
  }
};
