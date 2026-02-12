import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

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
  // 0. Check API Key presence (Critical for Vercel debugging)
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing in process.env");
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
    console.error("Error fetching news raw:", error);
    
    // Customize error messages for better user experience
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Kuota API Harian Habis (Error 429). Silakan coba lagi besok!");
    }

    if (error.message?.includes('403') || error.status === 403) {
      throw new Error("Masalah Izin API Key (Error 403). Cek konfigurasi.");
    }

    if (error.message?.includes('API Key tidak ditemukan')) {
      throw error; // Rethrow the missing key error specifically
    }
    
    throw new Error("Gagal mengambil berita. Server sedang sibuk atau ada gangguan jaringan.");
  }
};