import React, { useEffect, useState, useRef } from 'react';
import { Rocket, AlertCircle, ShieldCheck } from 'lucide-react';
import { fetchTechNewsForKids } from './services/geminiService';
import { NewsItem, AppState } from './types';
import NewsCard from './components/NewsCard';
import Loading from './components/Loading';

const App: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secretCount, setSecretCount] = useState(0);
  const hasFetched = useRef(false); // Ref to prevent double-fetching in StrictMode

  const loadNews = async (force: boolean = false) => {
    // In dev mode, prevents double call. In force refresh, we ignore this check.
    if (!force && hasFetched.current) return;
    hasFetched.current = true;

    setAppState(AppState.LOADING);
    setErrorMsg(null);
    try {
      const data = await fetchTechNewsForKids(force);
      setNews(data);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      // Display the specific error message thrown from the service
      setErrorMsg(err.message || "Waduh! Gagal mengambil berita. Coba lagi ya!");
    }
  };

  useEffect(() => {
    // Initial load
    loadNews(false);
  }, []);

  const handleSecretClick = () => {
    // Secret backdoor: Click rocket 10 times to force refresh
    const newCount = secretCount + 1;
    setSecretCount(newCount);
    
    if (newCount === 10) {
      loadNews(true); // Force refresh
      setSecretCount(0);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-blue-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 select-none cursor-pointer" onClick={handleSecretClick}>
            <div className={`bg-blue-500 p-2 rounded-xl text-white shadow-lg transform transition-all ${secretCount > 0 ? 'scale-110 rotate-12' : '-rotate-3'}`}>
              <Rocket size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
                Techmeme <span className="text-blue-500">Junior</span>
              </h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">
                Berita Teknologi untuk Anak Indonesia
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
            <ShieldCheck size={14} />
            <span>Live Update</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-8">
        
        {appState === AppState.LOADING && <Loading />}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-3xl border-2 border-red-100 text-center mt-8">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-red-800 mb-2">{errorMsg}</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              {errorMsg?.includes('API Key') 
                ? "Admin perlu mengecek pengaturan Vercel." 
                : "Mungkin kuota habis atau internet sedang gangguan."}
            </p>
            <button 
              onClick={() => loadNews(true)}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {appState === AppState.SUCCESS && (
          <>
            <div className="mb-8 text-center">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-2 animate-bounce bg-yellow-100 text-yellow-800">
                Update Hari Ini
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800">
                Apa yang terjadi di dunia teknologi?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {news.map((item, index) => (
                <NewsCard key={index} item={item} index={index} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-400 text-sm pb-8">
        <p>Ditenagai oleh Gemini AI & Techmeme</p>
        <p className="mt-1">Dibuat khusus untuk pembaca cilik 🚀</p>
        {secretCount > 0 && <p className="text-xs text-blue-300 mt-2">Admin mode: {secretCount}/10</p>}
      </footer>
    </div>
  );
};

export default App;