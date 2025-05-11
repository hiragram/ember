import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Parser from 'rss-parser';

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

interface ApiResponse {
  articles: RSSItem[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

// キャッシュメカニズム
let cachedArticles: RSSItem[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分キャッシュ

async function getAllArticles() {
  // キャッシュが有効ならそれを返す
  const now = Date.now();
  if (cachedArticles && (now - cacheTime < CACHE_DURATION)) {
    return cachedArticles;
  }
  
  try {
    // 先にデータファイルからの読み込みを試みる（これを優先する）
    try {
      const feedFilePath = path.join(process.cwd(), 'public', 'data', 'feed.json');
      if (fs.existsSync(feedFilePath)) {
        try {
          const feedData = JSON.parse(fs.readFileSync(feedFilePath, 'utf8'));
          if (feedData.articles && Array.isArray(feedData.articles) && feedData.articles.length > 0) {
            console.log(`Loaded ${feedData.articles.length} articles from feed.json`);
            cachedArticles = feedData.articles;
            cacheTime = now;
            return cachedArticles;
          }
        } catch (parseError) {
          console.error('Error parsing feed.json:', parseError);
        }
      }
    } catch (e) {
      console.log('Feed data file not found or invalid:', e);
    }
    
    console.log('No valid feed.json file found. This should not happen in production!');
    console.log('Run `npm run generate-feed` to pre-generate the feed data.');
    
    // 本番環境では下記のコードは実行されるべきではない
    // ビルド時に必ずfeed.jsonが生成されることを前提としている
    // 開発環境やテスト時のためのフォールバックコードとして残している
    
    const parser = new Parser({
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ember Feed Aggregator; +https://github.com/yourorg/ember)'
      },
      timeout: 30000 // 30秒タイムアウト（APIではより短くする）
    });
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents) as any;
    
    const allArticles: RSSItem[] = [];
    
    for (const user of config.users) {
      // Determine user's active period
      const joinDate = new Date(user.joined.year, user.joined.month - 1, 1); // Month is 0-indexed in JS Date
      const leftDate = user.left_at ? new Date(user.left_at.year, user.left_at.month - 1, 1) : new Date(9999, 11, 31); // Far future date if still active
      
      for (const sourceUrl of user.sources) {
        if (!sourceUrl) continue;
        
        try {
          const parsedFeed = await parser.parseURL(sourceUrl);
          
          if (parsedFeed.items && Array.isArray(parsedFeed.items)) {
            parsedFeed.items.forEach((item: any) => {
              if (!item.pubDate) return;
              
              const pubDate = new Date(item.pubDate);
              
              // Only include articles published during the user's tenure
              if (pubDate >= joinDate && pubDate <= leftDate) {
                allArticles.push({
                  ...item,
                  tags: user.tags,
                  siteName: parsedFeed.title || 'Unknown Source',
                  author: user.name,
                  authorAvatar: user.avatar
                });
              }
            });
          }
        } catch (feedError) {
          console.error(`Error parsing feed ${sourceUrl}:`, feedError);
        }
      }
    }
    
    // Sort by date descending
    allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    // キャッシュを更新
    cachedArticles = allArticles;
    cacheTime = now;
    
    // データディレクトリに保存を試みる（失敗しても続行）
    try {
      const dataDir = path.join(process.cwd(), 'public', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(dataDir, 'feed.json'),
        JSON.stringify({ articles: allArticles }, null, 2)
      );
    } catch (e) {
      console.error('Error saving feed data:', e);
    }
    
    return allArticles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  try {
    // Get pagination parameters from query
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 12;
    const authorFilter = req.query.author as string | undefined;
    const tagFilter = req.query.tag as string | undefined;
    const duringEmploymentOnly = req.query.duringEmploymentOnly === 'true';
    
    // Get all articles
    let articles = await getAllArticles();
    
    // Apply filters if provided
    if (authorFilter) {
      articles = articles.filter(article => article.author === authorFilter);
      
      // If duringEmploymentOnly is true, filter articles by employment flag
      if (duringEmploymentOnly) {
        articles = articles.filter(article => article.isDuringEmployment === true);
      }
    }
    
    if (tagFilter) {
      articles = articles.filter(article => article.tags.includes(tagFilter));
    }
    
    // Calculate pagination
    const total = articles.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePageNumber = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePageNumber - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    // Get articles for current page
    const paginatedArticles = articles.slice(startIndex, endIndex);
    
    // Return the response
    res.status(200).json({
      articles: paginatedArticles,
      pagination: {
        total,
        page: safePageNumber,
        perPage,
        totalPages
      }
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to load articles' });
  }
}