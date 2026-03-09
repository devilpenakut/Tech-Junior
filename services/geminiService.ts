import { GoogleGenAI } from "@google/genai";
import { NewsItem } from "../types";

const CACHE_KEY = 'techmeme_news_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in milliseconds
const GEMINI_MODEL = "gemini-3-flash-preview";
export const NEWS_COUNT = 6;

const RSS2JSON_URL = `https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.techmeme.com%2Ffeed.xml&api_key=&count=${NEWS_COUNT * 2}`;

interface CachedData {
  timestamp: number;
  data: NewsItem[];
}

interface Rss2JsonItem {
  title: string;
  link: string;
  description?: string;
}

interface Rss2JsonResponse {
  status: string;
  items: Rss2JsonItem[];
}

/**
 * Fetches top Techmeme news via RSS, then translates and simplifies for kids using Gemini.
 * No Google Search Grounding used — avoids search quota issues.
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
    if (import.meta.env.DEV) console.log("Fetching RSS from Techmeme via rss2json...");

    // 2. Fetch Techmeme RSS Feed (no API quota)
    const rssResponse = await fetch(RSS2JSON_URL);
    if (!rssResponse.ok) {
      throw new Error(`Gagal mengambil RSS feed (HTTP ${rssResponse.status})`);
    }

    const rssData: Rss2JsonResponse = await rssResponse.json();
    if (rssData.status !== 'ok' || !rssData.items?.length) {
      throw new Error("RSS feed tidak mengandung berita.");
    }

    const topItems = rssData.items.slice(0, NEWS_COUNT);
    const newsListText = topItems
      .map((item, i) => `${i + 1}. Judul: "${item.title}" | URL: ${item.link}`)
      .join('\n');

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

    if (!response.text) {
      throw new Error("No content generated from Gemini.");
    }

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
    if (err.message?.includes('RSS feed') || err.message?.includes('Gagal mengambil RSS')) {
      throw new Error("Gagal mengambil berita dari Techmeme. Periksa koneksi internet.");
    }

    throw new Error("Gagal mengambil berita. Server sedang sibuk atau ada gangguan jaringan.");
  }
};
