import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface User {
  name: string;
  full_name_ja?: string;
  full_name_en?: string;
  description?: string;
  avatar?: string;
  joined?: {
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

// ユーザーキャッシュ
let cachedUsers: User[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分キャッシュ

function getAllUsers() {
  // キャッシュが有効ならそれを返す
  const now = Date.now();
  if (cachedUsers && (now - cacheTime < CACHE_DURATION)) {
    return cachedUsers;
  }
  
  try {
    // 先にデータファイルからの読み込みを試みる（これを優先する）
    try {
      const usersFilePath = path.join(process.cwd(), 'public', 'data', 'users.json');
      if (fs.existsSync(usersFilePath)) {
        try {
          const userData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
          if (userData.users && Array.isArray(userData.users) && userData.users.length > 0) {
            console.log(`Loaded ${userData.users.length} users from users.json`);
            cachedUsers = userData.users;
            cacheTime = now;
            return cachedUsers;
          }
        } catch (parseError) {
          console.error('Error parsing users.json:', parseError);
        }
      }
    } catch (e) {
      console.log('Users data file not found or invalid:', e);
    }
    
    console.log('No valid users.json file found. This should not happen in production!');
    console.log('Run `npm run generate-feed` to pre-generate the users data.');
    
    // 本番環境では下記のコードは実行されるべきではない
    // ビルド時に必ずusers.jsonが生成されることを前提としている
    // 開発環境やテスト時のためのフォールバックコードとして残している
    
    // 直接設定ファイルからユーザーを取得
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents) as any;
    
    cachedUsers = config.users;
    cacheTime = now;
    
    // データディレクトリに保存を試みる（失敗しても続行）
    try {
      const dataDir = path.join(process.cwd(), 'public', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(dataDir, 'users.json'),
        JSON.stringify({ users: config.users }, null, 2)
      );
    } catch (e) {
      console.error('Error saving users data:', e);
    }
    
    return cachedUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ users: User[] } | { user: User | null } | { error: string }>
) {
  try {
    const userName = req.query.name as string | undefined;
    
    // すべてのユーザーを取得
    const users = getAllUsers();
    
    if (userName) {
      // 特定のユーザーのデータを返す
      const user = users.find(u => u.name === userName) || null;
      res.status(200).json({ user });
    } else {
      // アクティブなユーザーのみをフィルタリング
      const activeUsers = users.filter(user => user.left_at === null);
      res.status(200).json({ users: activeUsers });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
}