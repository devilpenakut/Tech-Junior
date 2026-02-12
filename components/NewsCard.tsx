import React from 'react';
import { NewsItem } from '../types';
import { ExternalLink } from 'lucide-react';

interface NewsCardProps {
  item: NewsItem;
  index: number;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, index }) => {
  const colors = [
    'bg-red-50 border-red-200',
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-yellow-50 border-yellow-200',
    'bg-purple-50 border-purple-200',
    'bg-orange-50 border-orange-200'
  ];
  
  const iconColors = [
    'text-red-500 bg-red-100',
    'text-blue-500 bg-blue-100',
    'text-green-500 bg-green-100',
    'text-yellow-500 bg-yellow-100',
    'text-purple-500 bg-purple-100',
    'text-orange-500 bg-orange-100'
  ];

  const colorClass = colors[index % colors.length];
  const iconClass = iconColors[index % iconColors.length];

  return (
    <div className={`rounded-3xl p-6 border-4 shadow-lg transition-transform hover:-translate-y-1 duration-300 ${colorClass} flex flex-col h-full`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${iconClass}`}>
          <span className="text-2xl font-bold font-mono">#{index + 1}</span>
        </div>
        <a 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Lihat sumber asli"
          aria-label="Link to source"
        >
          <ExternalLink size={20} />
        </a>
      </div>

      <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-3 leading-tight">
        {item.title}
      </h3>
      
      <p className="text-gray-700 text-lg leading-relaxed flex-grow">
        {item.summary}
      </p>
    </div>
  );
};

export default NewsCard;
