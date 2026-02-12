import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
        <div className="relative bg-white p-4 rounded-full shadow-xl border-4 border-blue-100">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2 animate-pulse">
        Sedang Mencari Berita Seru...
      </h2>
      <p className="text-gray-500 max-w-md">
        Robot pintar kami sedang membaca Techmeme dan menerjemahkannya untukmu. Tunggu sebentar ya!
      </p>
    </div>
  );
};

export default Loading;
