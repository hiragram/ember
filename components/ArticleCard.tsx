import Link from 'next/link';
import Image from 'next/image';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  tags: string[];
  siteName: string;
  author: string;
  authorAvatar?: string;
  isDuringEmployment?: boolean;
}

type ArticleCardProps = {
  article: RSSItem;
};

export const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <article className="bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-700 flex flex-col h-full min-h-[340px]">
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-3">
          {article.link && (
            <a 
              href={`https://b.hatena.ne.jp/entry/${article.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src={`https://b.hatena.ne.jp/entry/image/large/${article.link}`}
                alt="はてなブックマーク数"
                width="auto"
                height="16"
                className="h-4"
              />
            </a>
          )}
          {article.link && (
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
              {new URL(article.link).hostname}
            </span>
          )}
        </div>
        
        <h2 className="text-xl font-bold mb-3 hover:text-amber-400 transition-colors overflow-hidden">
          <a 
            href={article.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block break-words break-all"
            style={{ 
              overflowWrap: 'anywhere', 
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              height: '4.5rem',
              maxHeight: '4.5rem',
              lineHeight: '1.5rem'
            }}
          >
            {article.title}
          </a>
        </h2>
        
        {article.author && (
          <Link 
            href={`/user/${article.author}`}
            className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-700">
              <Image 
                src={article.authorAvatar || '/avatars/default.png'} 
                alt={`${article.author}'s avatar`} 
                width={24} 
                height={24}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-xs text-gray-400">{article.author}</span>
          </Link>
        )}
        
        <p 
          className="text-sm text-gray-300 mb-auto overflow-hidden break-words break-all"
          style={{ 
            overflowWrap: 'anywhere', 
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '4.5rem',
            maxHeight: '4.5rem',
            lineHeight: '1.5rem'
          }}
        >
          {article.contentSnippet}
        </p>
        
        <div className="mt-4">
          <time className="text-xs font-mono text-gray-400" dateTime={article.pubDate}>
            {new Date(article.pubDate).toLocaleDateString('ja-JP')}
          </time>
        </div>
      </div>
    </article>
  );
};