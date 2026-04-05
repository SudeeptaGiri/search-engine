// src/config/index.ts
export const config = {
  crawler: {
    maxConcurrency: 5,
    maxDepth: 3,
    maxPages: 2000,
    requestTimeout: 10000,
    delayBetweenRequests: 1000,
    userAgent: 'MiniSearchBot/1.0 (educational project)',

    // ─── Seed URLs: Mix of Wikipedia AND Reddit ───
    seedUrls: [
      // Wikipedia
      'https://en.wikipedia.org/wiki/Web_search_engine',
      'https://en.wikipedia.org/wiki/JavaScript',

      // Reddit — just regular URLs!
      'https://www.reddit.com/r/programming/hot',
      'https://www.reddit.com/r/javascript/top?t=week',
      'https://www.reddit.com/r/webdev/hot',
      'https://www.reddit.com/r/node/hot',
      'https://www.reddit.com/r/reactjs/top?t=week',
      'https://www.reddit.com/r/typescript/hot',
      'https://www.reddit.com/r/learnprogramming/top?t=week',
    ],

    // Reddit-specific subreddits to crawl
    redditSubreddits: (
      process.env.REDDIT_SUBREDDITS ||
      'programming,javascript,typescript,webdev,node,reactjs,learnprogramming'
    ).split(','),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/searchengine',
  },

  search: {
    resultsPerPage: 10,
    maxResults: 100,
    cacheExpiry: 3600,
  },

  api: {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
  },

  bm25: {
    k1: 1.2,
    b: 0.75,
  },
} as const;