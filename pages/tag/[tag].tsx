import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { Press_Start_2P } from 'next/font/google';
import { ArticleCard } from '../../components/ArticleCard';
import { Header } from '../../components/Header';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

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

interface User {
  name: string;
  full_name_ja?: string;
  full_name_en?: string;
  description?: string;
  avatar?: string;
  joined_at?: {
    year: number;
    month: number;
  };
  left_at?: {
    year: number;
    month: number;
  } | null;
  tags: string[];
  accounts?: {
    x?: string;
    github?: string;
    speakerdeck?: string;
  };
  sources: string[];
}

const pressStart2P = Press_Start_2P({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

interface ArticleApiResponse {
  articles: RSSItem[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export default function TagPage({ users, tag }: { users: User[], tag: string }) {
  const [articles, setArticles] = useState<RSSItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const perPage = 12;

  // 最後の記事要素への参照
  const lastArticleElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // 次のページを読み込む
        setCurrentPage(prevPage => prevPage + 1);
      }
    }, { threshold: 0.5 });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // 初回ロード
  useEffect(() => {
    async function loadInitialArticles() {
      try {
        setInitialLoading(true);
        setError(null);
        const response = await fetch(`/api/articles?page=1&perPage=${perPage}&tag=${encodeURIComponent(tag)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        
        const data: ArticleApiResponse = await response.json();
        setArticles(data.articles);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to load articles. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    }
    
    loadInitialArticles();
  }, [perPage, tag]);

  // 追加データのロード（2ページ目以降）
  useEffect(() => {
    if (currentPage === 1) return; // 最初のページは別のuseEffectで処理
    
    async function loadMoreArticles() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/articles?page=${currentPage}&perPage=${perPage}&tag=${encodeURIComponent(tag)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch more articles');
        }
        
        const data: ArticleApiResponse = await response.json();
        setArticles(prev => [...prev, ...data.articles]);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      } catch (err) {
        console.error('Error fetching more articles:', err);
        setError('Failed to load more articles. Please try again.');
        // ページを元に戻す
        setCurrentPage(prev => prev - 1);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMoreArticles();
  }, [currentPage, perPage, tag]);

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen`}
    >
      <Header />
      
      <div className="container mx-auto pt-10 pb-6 px-4 max-w-[1200px]">
        <h1 className="text-3xl font-bold text-center text-white mt-4">
          {tag}
        </h1>
        <p className="text-center text-gray-400 mt-2 max-w-2xl mx-auto">
          このタグを持つメンバー
        </p>
      </div>
      
      <main className="container mx-auto px-4 pb-16 max-w-[1200px]">
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {users.map((user) => (
              <Link 
                key={user.name} 
                href={`/user/${user.name}`}
                className="flex flex-col items-center p-6 rounded-lg border border-gray-700 bg-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-gray-700">
                  <Image 
                    src={user.avatar || '/avatars/default.png'} 
                    alt={`${user.name}'s avatar`} 
                    width={96} 
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h2 className="text-md font-medium text-gray-200">{user.name}</h2>
                
                {(user.full_name_ja || user.full_name_en) && (
                  <div className="mt-1 text-center">
                    {user.full_name_ja && (
                      <span className="text-sm font-medium text-gray-300">
                        {user.full_name_ja}
                        {user.full_name_en && " / "}
                      </span>
                    )}
                    {user.full_name_en && (
                      <span className="text-xs text-gray-400">{user.full_name_en}</span>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {user.tags.map((userTag, i) => (
                    <span 
                      key={i} 
                      className={`text-xs px-2 py-1 rounded-full ${
                        userTag === tag
                          ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {userTag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No members found with this tag.</p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-200 flex items-center">
              <span className="mr-2">📝</span>"{tag}"がつくメンバーの記事
            </h2>
          </div>
          
          {initialLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : error && articles.length === 0 ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {articles.map((article: RSSItem, index: number) => {
                  // 最後の要素に参照を付ける
                  if (index === articles.length - 1) {
                    return (
                      <div ref={lastArticleElementRef} key={index}>
                        <ArticleCard article={article} />
                      </div>
                    );
                  } else {
                    return <ArticleCard key={index} article={article} />;
                  }
                })}
              </div>
              
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                </div>
              )}
              
              {!hasMore && articles.length > 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>最後まで読み込みました</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>記事がありません</p>
            </div>
          )}
        </section>
      </main>
      
      <footer className="py-6 bg-gray-800/80">
        <div className="container mx-auto px-4 max-w-[1200px] flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Ember</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link
              className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
              href="/"
            >
              <span className="text-sm">Home</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function getStaticPaths() {
  try {
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = await fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Get all unique tags from all users
    const allTags = new Set<string>();
    config.users.forEach((user: User) => {
      user.tags.forEach((tag: string) => {
        allTags.add(tag);
      });
    });
    
    const paths = Array.from(allTags).map((tag: string) => ({
      params: { tag },
    }));
    
    return {
      paths,
      fallback: false,
    };
  } catch (error) {
    console.error('Error generating tag paths:', error);
    return {
      paths: [],
      fallback: false,
    };
  }
}

export async function getStaticProps({ params }: { params: { tag: string } }) {
  try {
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = await fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Filter users that have the specified tag
    const filteredUsers = config.users.filter((user: User) => 
      user.tags.includes(params.tag)
    );
    
    return {
      props: {
        users: filteredUsers,
        tag: params.tag,
      },
    };
  } catch (error) {
    console.error('Build time error:', error);
    return {
      props: {
        users: [],
        tag: params.tag,
      },
    };
  }
}