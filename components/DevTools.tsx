import { useState } from 'react';

// 開発環境かどうかを判定
const isDev = process.env.NODE_ENV === 'development';

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    duration?: string;
  } | null>(null);

  // 開発環境でなければ何も表示しない
  if (!isDev) return null;

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setRefreshResult(null);
      
      const response = await fetch('/api/refresh-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'dev-key'
        }
      });
      
      const result = await response.json();
      setRefreshResult(result);
    } catch (error) {
      setRefreshResult({ success: false, error: 'Failed to refresh feed' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* デベロッパーツール開閉ボタン */}
      <button
        onClick={toggleOpen}
        className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg"
      >
        {isOpen ? '❌' : '🔧'}
      </button>
      
      {/* デベロッパーツールパネル */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-64 bg-gray-800 text-white rounded-md shadow-xl p-4">
          <h3 className="text-md font-semibold mb-2">Dev Tools</h3>
          
          <div className="space-y-3">
            <div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`w-full py-2 rounded-md text-white text-sm ${
                  isRefreshing ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh RSS Feed Data'}
              </button>
            </div>
            
            {refreshResult && (
              <div className={`text-xs p-2 rounded ${refreshResult.success ? 'bg-green-800' : 'bg-red-800'}`}>
                {refreshResult.success ? (
                  <span>✅ {refreshResult.message} ({refreshResult.duration})</span>
                ) : (
                  <span>❌ {refreshResult.error} ({refreshResult.duration || 'N/A'})</span>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-400 mt-2">
              <p>Environment: {process.env.NODE_ENV}</p>
              <p>Last Render: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}