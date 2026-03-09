import { GoogleGenAI } from "@google/genai";
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

      PENTING: Balas HANYA dengan JSON Array berisi tepat ${NEWS_COUNT} objek, tanpa teks lain.
      Format: [{"title":"...","summary":"...","link":"..."},...]
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Grounding to get real Techmeme data
        // Note: responseMimeType + responseSchema tidak kompatibel dengan googleSearch
      }
    });

    if (response.text) {
      let parsed: NewsItem[];
      try {
        // Strip markdown code fences jika model menambahkannya
        let rawText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Ambil hanya bagian JSON array
        const jsonStart = rawText.indexOf('[');
        const jsonEnd = rawText.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          rawText = rawText.slice(jsonStart, jsonEnd + 1);
        }
        parsed = JSON.parse(rawText) as NewsItem[];
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
      throw new Error("Batas request API tercapai (Error 429). Tunggu beberapa menit lalu coba lagi. Jika masih gagal, kuota harian Google Search Grounding mungkin sudah habis.");
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
