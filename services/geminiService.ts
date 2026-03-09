import { GoogleGenAI } from "@google/genai";
import { NewsItem } from "../types";

const CACHE_KEY = 'techmeme_news_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in milliseconds
const GEMINI_MODEL = "gemini-3-flash-preview";
export const NEWS_COUNT = 6;

const TECHMEME_RSS = "https://www.techmeme.com/feed.xml";
const CORS_PROXY = "https://api.allorigins.win/get?url=";

interface CachedData {
  timestamp: number;
  data: NewsItem[];
}

/**
 * Fetches top Techmeme news via RSS (allorigins.win CORS proxy + DOMParser),
 * then translates and simplifies for kids using Gemini.
 * No Google Search Grounding — avoids search quota issues.
 */
export const fetchTechNewsForKids = async (forceRefresh = false): Promise<NewsItem[]> => {
  // 0. Check API Key presence
  if (!process.env.API_KEY) {
    throw new Error("API Key tidak ditemukan! Pastikan Anda sudah memasukkan 'API_KEY' di Settings > Environment Variables pada Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Check Cache first (if not forced)
  if (!forceRefresh) {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached: CachedData = JSON.parse(cachedRaw);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          if (import.meta.env.DEV) console.log("Serving news from cache (Saving API Quota)");
          return cached.data;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }

  try {
    if (import.meta.env.DEV) console.log("Fetching Techmeme RSS via allorigins.win...");

    // 2. Fetch Techmeme RSS via CORS proxy
    const proxyRes = await fetch(`${CORS_PROXY}${encodeURIComponent(TECHMEME_RSS)}`);
    if (!proxyRes.ok) throw new Error(`Proxy gagal (HTTP ${proxyRes.status})`);

    const proxyData = await proxyRes.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(proxyData.contents as string, "text/xml");
    const xmlItems = Array.from(xml.querySelectorAll("item")).slice(0, NEWS_COUNT);

    if (!xmlItems.length) throw new Error("RSS feed tidak mengandung berita.");

    const newsListText = xmlItems
      .map((item, i) => {
        const title = item.querySelector("title")?.textContent ?? "";
        const link = item.querySelector("link")?.textContent ?? "";
        return `${i + 1}. Judul: "${title}" | URL: ${link}`;
      })
      .join("\n");

    if (import.meta.env.DEV) console.log("RSS fetched. Sending to Gemini for translation...");

    // 3. Send to Gemini for translation/simplification only (no search grounding)
    const prompt = `
      Kamu adalah asisten berita untuk anak-anak usia 10 tahun.
      Berikut adalah ${NEWS_COUNT} berita teknologi terkini dari Techmeme:

      ${newsListText}

      Tugasmu untuk SETIAP berita:
      1. Buat Judul dalam Bahasa Indonesia yang seru dan mudah dipahami anak.
      2. Buat Ringkasan singkat (2-3 kalimat) dalam Bahasa Indonesia yang sederhana.
      3. Gunakan URL asli yang sudah diberikan di atas (jangan ubah URL-nya).

      PENTING: Balas HANYA dengan JSON Array berisi tepat ${NEWS_COUNT} objek, tanpa teks lain.
      Format: [{"title":"...","summary":"...","link":"..."},...]
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    if (!response.text) throw new Error("No content generated from Gemini.");

    let parsed: NewsItem[];
    try {
      let rawText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        rawText = rawText.slice(jsonStart, jsonEnd + 1);
      }
      parsed = JSON.parse(rawText) as NewsItem[];
    } catch {
      throw new Error("Gagal memproses data berita dari server.");
    }

    // 4. Save to Cache
    const cacheData: CachedData = { timestamp: Date.now(), data: parsed };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    return parsed;

  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };

    if (err.message?.includes('429') || err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Batas request API tercapai (Error 429). Tunggu beberapa menit lalu coba lagi.");
    }
    if (err.message?.includes('403') || err.status === 403) {
      throw new Error("Masalah Izin API Key (Error 403). Cek konfigurasi.");
    }
    if (err.message?.includes('API Key tidak ditemukan') || err.message?.includes('memproses data')) {
      throw error;
    }
    if (err.message?.includes('Proxy gagal') || err.message?.includes('RSS feed')) {
      throw new Error("Gagal mengambil berita dari Techmeme. Periksa koneksi internet.");
    }

    throw new Error("Gagal mengambil berita. Server sedang sibuk atau ada gangguan jaringan.");
  }
};
