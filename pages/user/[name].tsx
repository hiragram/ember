import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { Press_Start_2P } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faXTwitter, faSpeakerDeck } from '@fortawesome/free-brands-svg-icons';
import { ArticleCard } from '../../components/ArticleCard';
import { Header } from '../../components/Header';
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

interface UserApiResponse {
  user: User;
}

export default function UserPage({ initialUser }: { initialUser: User }) {
  const [user, setUser] = useState<User>(initialUser);
  const [articles, setArticles] = useState<RSSItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyDuringEmployment, setShowOnlyDuringEmployment] = useState(false);
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

  // 初回ロード - アプリマウント時のみ実行
  // その後のフィルタ変更は別のuseEffectで処理
  useEffect(() => {
    async function loadInitialArticles() {
      try {
        setInitialLoading(true);
        setError(null);
        const response = await fetch(`/api/articles?page=1&perPage=${perPage}&author=${user.name}&duringEmploymentOnly=${showOnlyDuringEmployment}`);
        
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 追加データのロード（2ページ目以降）
  useEffect(() => {
    if (currentPage === 1) return; // 最初のページは別のuseEffectで処理
    
    async function loadMoreArticles() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/articles?page=${currentPage}&perPage=${perPage}&author=${user.name}&duringEmploymentOnly=${showOnlyDuringEmployment}`);
        
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
  }, [currentPage, perPage, user.name, showOnlyDuringEmployment]);

  // 在籍中のみフィルタが変更されたときの処理
  useEffect(() => {
    async function reloadWithFilter() {
      try {
        setInitialLoading(true);
        setError(null);
        // リセット
        setCurrentPage(1);
        setArticles([]);
        
        // フィルタリングパラメータを含めてAPI呼び出し
        const response = await fetch(`/api/articles?page=1&perPage=${perPage}&author=${user.name}&duringEmploymentOnly=${showOnlyDuringEmployment}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        
        const data: ArticleApiResponse = await response.json();
        setArticles(data.articles);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to load articles. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    }
    
    reloadWithFilter();
  }, [showOnlyDuringEmployment, perPage, user.name]);

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen`}
    >
      <Header />
      
      <div className="container mx-auto pt-10 pb-6 px-4 max-w-[1200px]">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 max-w-3xl mx-auto">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-700 flex-shrink-0">
            <Image 
              src={user.avatar || '/avatars/default.png'} 
              alt={`${user.name}'s avatar`} 
              width={128} 
              height={128}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex flex-col md:text-left text-center">
            <h1 className="text-3xl font-bold text-white">{user.name}</h1>
            
            {(user.full_name_ja || user.full_name_en) && (
              <div className="mt-1">
                <h2 className="text-lg font-medium text-gray-300">
                  {user.full_name_ja}
                  {user.full_name_ja && user.full_name_en && " / "}
                  {user.full_name_en && <span className="text-sm text-gray-400">{user.full_name_en}</span>}
                </h2>
              </div>
            )}
            
            {user.joined && (
              <div className="mt-1">
                <p className="text-sm text-gray-500">
                  {user.left_at ? 
                    `${user.joined.year}/${user.joined.month.toString().padStart(2, '0')}~${user.left_at.year}/${user.left_at.month.toString().padStart(2, '0')}` :
                    `${user.joined.year}/${user.joined.month.toString().padStart(2, '0')}~`
                  }
                </p>
              </div>
            )}
            
            {user.description && (
              <div className="text-gray-400 mt-3 whitespace-pre-line">
                {user.description}
              </div>
            )}
            
            <div className="flex flex-col md:items-start items-center gap-1 mt-4">
              {user.accounts?.x && (
                <a 
                  href={`https://x.com/${user.accounts.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
                >
                  <FontAwesomeIcon icon={faXTwitter} className="w-4 h-4" /> <span className="text-sm">{user.accounts.x}</span>
                </a>
              )}
              {user.accounts?.github && (
                <a 
                  href={`https://github.com/${user.accounts.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
                >
                  <FontAwesomeIcon icon={faGithub} className="w-4 h-4" /> <span className="text-sm">{user.accounts.github}</span>
                </a>
              )}
              {user.accounts?.speakerdeck && (
                <a 
                  href={`https://speakerdeck.com/${user.accounts.speakerdeck}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
                >
                  <FontAwesomeIcon icon={faSpeakerDeck} className="w-4 h-4" /> <span className="text-sm">{user.accounts.speakerdeck}</span>
                </a>
              )}
            </div>
            
            <div className="flex flex-wrap md:justify-start justify-center gap-2 mt-4">
              {user.tags.map((tag, i) => (
                <Link 
                  key={i} 
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 pb-16 max-w-[1200px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-200 flex items-center">
              <span className="mr-2">📝</span>記事
            </h2>
          </div>
          
          {user.joined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">在籍中の記事のみ</span>
              <button 
                onClick={() => setShowOnlyDuringEmployment(!showOnlyDuringEmployment)}
                className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                role="switch"
                aria-checked={showOnlyDuringEmployment}
                style={{ 
                  backgroundColor: showOnlyDuringEmployment ? '#3b82f6' : '#e5e7eb',
                }}
              >
                <span 
                  className={`
                    ${showOnlyDuringEmployment ? 'translate-x-6' : 'translate-x-1'} 
                    inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow-md
                  `}
                />
              </button>
            </div>
          )}
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
                const isLastItem = index === articles.length - 1;
                
                // 最後の要素かつ、まだ読み込む記事がある場合のみObserverを設定
                const shouldObserve = isLastItem && hasMore;
                
                if (shouldObserve) {
                  return (
                    <div ref={lastArticleElementRef} key={`${article.link}-${index}`}>
                      <ArticleCard article={article} />
                    </div>
                  );
                } else {
                  return <ArticleCard key={`${article.link}-${index}`} article={article} />;
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
  const yamlPath = path.join(process.cwd(), 'config.yaml');
  const fileContents = await fs.readFileSync(yamlPath, 'utf8');
  const config = yaml.load(fileContents);

  const paths = config.users.map((user: User) => ({
    params: { name: user.name },
  }));

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { name: string } }) {
  try {
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = await fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    
    const user = config.users.find((u: User) => u.name === params.name);
    
    if (!user) {
      return {
        notFound: true,
      };
    }
    
    return {
      props: {
        initialUser: user,
      },
    };
  } catch (error) {
    console.error('Build time error:', error);
    return {
      notFound: true,
    };
  }
}