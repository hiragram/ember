import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { Press_Start_2P } from 'next/font/google';
import { ArticleCard } from '../components/ArticleCard';
import { Header } from '../components/Header';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

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

interface UsersApiResponse {
  users: User[];
}

export default function Home({ initialUsers, homeDescription }: { initialUsers: User[], homeDescription: string }) {
  const [articles, setArticles] = useState<RSSItem[]>([]);
  const [users, setUsers] = useState<User[]>(initialUsers);
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
        const response = await fetch(`/api/articles?page=1&perPage=${perPage}`);
        
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
  }, [perPage]);

  // 追加データのロード（2ページ目以降）
  useEffect(() => {
    if (currentPage === 1) return; // 最初のページは別のuseEffectで処理
    
    async function loadMoreArticles() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/articles?page=${currentPage}&perPage=${perPage}`);
        
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
  }, [currentPage, perPage]);

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen`}
    >
      <Header />
      
      <div className="container mx-auto pt-10 pb-6 px-4 max-w-[1200px] ">
        <div className="flex justify-center items-center mb-2 group">
          <span className="text-5xl font-bold mr-3 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🔥</span>
          <h1 className={`${pressStart2P.className} text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-red-600 dark:from-amber-400 dark:to-red-500 group-hover:scale-105 transition-all duration-500`}>EMBER</h1>
        </div>
        <p className="text-center text-gray-400 mt-2 max-w-2xl mx-auto">{homeDescription}</p>
      </div>
      
      <main className="container mx-auto px-4 pb-16 max-w-[1200px]">
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-200 flex items-center"><span className="mr-2">👥</span>参加者</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {users.map((user) => (
              <Link 
                key={user.name} 
                href={`/user/${user.name}`}
                className="flex flex-col items-center hover:scale-105 transition-transform duration-300"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-gray-700">
                  <Image 
                    src={user.avatar || '/avatars/default.png'} 
                    alt={`${user.name}'s avatar`} 
                    width={64} 
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-sm font-medium text-gray-200">{user.name}</span>
              </Link>
            ))}
          </div>
        </section>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-200 flex items-center">
            <span className="mr-2">📝</span>最近の記事
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
            <p>No articles found.</p>
          </div>
        )}
      </main>
      <footer className="py-6 bg-gray-800/80">
        <div className="container mx-auto px-4 max-w-[1200px] flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Ember</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <a
              className="flex items-center gap-2 text-gray-300 hover:text-amber-400 transition-colors"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
                className="opacity-75"
              />
              <span className="text-sm">Documentation</span>
            </a>
            <a
              className="flex items-center gap-2 text-gray-300 hover:text-amber-400 transition-colors"
              href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
                className="opacity-75"
              />
              <span className="text-sm">Deploy</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function getStaticProps() {
  try {
    // Only read users data during build time
    // Articles will be fetched client-side
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = await fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Filter for currently active users
    const activeUsers = config.users.filter(user => user.left_at === null);
    
    return {
      props: {
        initialUsers: activeUsers,
        homeDescription: config.home?.description || ''
      },
    };
  } catch (error) {
    console.error('Build time error:', error);
    return {
      props: {
        initialUsers: [],
        homeDescription: ''
      },
    };
  }
}
