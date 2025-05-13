const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const Parser = require('rss-parser');

async function generateFeedJson() {
  try {
    const parser = new Parser({
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ember Feed Aggregator; +https://github.com/yourorg/ember)'
      },
      timeout: 60000, // 60 seconds timeout
      maxRedirects: 5
    });
    const yamlPath = path.join(process.cwd(), 'config.yaml');
    const fileContents = await fs.readFile(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    
    console.log('Fetching RSS feeds...');
    
    const allArticles = [];
    // Track processed feed URLs to avoid duplicates
    const processedUrls = new Set();
    
    // Function to handle feed fetching with retries
    const fetchFeedWithRetry = async (sourceUrl, retries = 3) => {
      try {
        console.log(`Fetching feed: ${sourceUrl}`);
        return await parser.parseURL(sourceUrl);
      } catch (error) {
        if (retries > 0) {
          console.log(`Retrying feed (${retries} attempts left): ${sourceUrl}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          return fetchFeedWithRetry(sourceUrl, retries - 1);
        }
        throw error;
      }
    };
    
    for (const user of config.users) {
      // Determine user's active period
      const joinDate = user.joined_at ? new Date(user.joined_at.year, user.joined_at.month - 1, 1) : new Date(0, 0, 1); // Month is 0-indexed in JS Date
      const leftDate = user.left_at ? new Date(user.left_at.year, user.left_at.month - 1, 1) : new Date(9999, 11, 31); // Far future date if still active
      
      // Process sources in parallel for better performance
      const feedPromises = user.sources
        .filter(sourceUrl => sourceUrl && !processedUrls.has(sourceUrl)) // Filter out empty URLs and already processed ones
        .map(async (sourceUrl) => {
          processedUrls.add(sourceUrl);
          
          try {
            const parsedFeed = await fetchFeedWithRetry(sourceUrl);
            
            if (parsedFeed.items && Array.isArray(parsedFeed.items)) {
              return parsedFeed.items
                .filter(item => item.pubDate) // Filter out items without publication date
                .map(item => {
                  const pubDate = new Date(item.pubDate);
                  // Add the employment status as a flag rather than filtering
                  const isDuringEmployment = pubDate >= joinDate && pubDate <= leftDate;
                  return {
                    ...item,
                    isDuringEmployment: isDuringEmployment
                  };
                })
                .map(item => ({
                  ...item,
                  tags: user.tags,
                  siteName: parsedFeed.title || 'Unknown Source',
                  author: user.name,
                  authorAvatar: user.avatar
                }));
            }
            return [];
          } catch (feedError) {
            console.error(`Error parsing feed ${sourceUrl}:`, feedError);
            return []; // Return empty array on error
          }
        });
      
      // Wait for all feed processing to complete
      const feedResults = await Promise.all(feedPromises);
      
      // Flatten and add to allArticles
      feedResults.forEach(articles => {
        allArticles.push(...articles);
      });
    }
    
    // Sort by date descending
    allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'public', 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Write all articles to a single JSON file
    await fs.writeFile(
      path.join(dataDir, 'feed.json'),
      JSON.stringify({ articles: allArticles }, null, 2)
    );

    // Extract all users
    const users = config.users;
    
    // Write all users to a JSON file
    await fs.writeFile(
      path.join(dataDir, 'users.json'),
      JSON.stringify({ users }, null, 2)
    );
    
    console.log(`Generated feed.json with ${allArticles.length} articles`);
    console.log(`Generated users.json with ${users.length} users`);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating feed JSON:', error);
    return { success: false, error: error.message };
  }
}

// Execute the function if this script is run directly
if (require.main === module) {
  generateFeedJson()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = generateFeedJson;