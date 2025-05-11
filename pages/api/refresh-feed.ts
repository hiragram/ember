import { NextApiRequest, NextApiResponse } from 'next';
import generateFeed from '../../scripts/generate-feed';

// この開発用APIは、開発中にRSSフィードを手動で更新するためのものです
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POSTリクエストのみ受け付ける
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // シークレットキーを検証（オプション）
  const secretKey = req.headers['x-api-key'] || req.body?.secretKey;
  const validKey = process.env.REFRESH_API_KEY || 'dev-key';
  
  if (secretKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // RSSフィードの生成を実行
    const startTime = Date.now();
    const result = await generateFeed();
    const duration = Date.now() - startTime;

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Feed refreshed successfully', 
        duration: `${duration}ms`
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Unknown error',
        duration: `${duration}ms`
      });
    }
  } catch (error) {
    console.error('Error refreshing feed:', error);
    return res.status(500).json({ success: false, error: 'Failed to refresh feed' });
  }
}