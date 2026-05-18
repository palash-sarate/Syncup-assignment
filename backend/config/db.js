const mongoose = require('mongoose');
const redis = require('redis');

let redisClient = null;
let isRedisConnected = false;

const Coach = require('../models/Coach');

const seedCoaches = async () => {
  try {
    const count = await Coach.countDocuments();
    if (count === 0) {
      console.log('[DATABASE] Seeding professional coaches registry...');
      const defaultCoaches = [
        {
          username: 'sarah',
          name: 'Coach Sarah',
          type: 'Fitness Specialist',
          bio: 'Specializing in HIIT workouts, functional strength training, and cardiovascular endurance programming.',
          avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&q=80&w=200'
        },
        {
          username: 'marcus',
          name: 'Marcus Aurelius',
          type: 'Mindfulness & Meditation',
          bio: 'Providing coaching on Stoicism, focus management, daily breathwork, and emotional resilience.',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
        },
        {
          username: 'elena',
          name: 'Dr. Elena Rostova',
          type: 'Nutrition Specialist',
          bio: 'Expert nutritionist focused on macro tracking, pre/post workout nourishment, and gut health.',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
        },
        {
          username: 'kenji',
          name: 'Coach Kenji',
          type: 'Yoga & Flexibility',
          bio: 'Blending Vinyasa flow, deep static stretching, and athletic mobility routines to protect joint longevity.',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
        },
        {
          username: 'mike',
          name: 'Coach Mike',
          type: 'Strength Coach',
          bio: 'Powerlifting coach focused on bar path, optimal deadlift/squat forms, and progressive overloading cycles.',
          avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200'
        }
      ];
      await Coach.insertMany(defaultCoaches);
      console.log('[DATABASE] Seeded 5 professional coaches successfully!');
    }
  } catch (error) {
    console.error(`[DATABASE] Seeding error: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/syncup_coaching');
    console.log(`[DATABASE] MongoDB Connected: ${conn.connection.host}`);
    await seedCoaches(); // Execute seeding inside the connected handler
  } catch (error) {
    console.error(`[DATABASE] MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  console.log(`[CACHE] Initializing Redis Client targeting ${redisUrl}...`);
  
  redisClient = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          console.warn('[CACHE] Redis reconnect failed 5 times. Operating in NO-CACHE fallback mode.');
          isRedisConnected = false;
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 2000, 10000); // Backoff strategy
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error(`[CACHE] Redis Client Error: ${err.message}`);
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('[CACHE] Redis Client Connected Successfully.');
    isRedisConnected = true;
  });

  redisClient.on('ready', () => {
    console.log('[CACHE] Redis Client Ready to serve keys.');
    isRedisConnected = true;
  });

  redisClient.on('end', () => {
    console.warn('[CACHE] Redis connection closed.');
    isRedisConnected = false;
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`[CACHE] Failed to establish initial Redis connection: ${error.message}. Running with NO-CACHE fallback.`);
    isRedisConnected = false;
  }
};

const getRedisClient = () => {
  return isRedisConnected ? redisClient : null;
};

module.exports = {
  connectDB,
  connectRedis,
  getRedisClient,
  getIsRedisConnected: () => isRedisConnected
};
