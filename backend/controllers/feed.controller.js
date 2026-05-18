const Feed = require('../models/Feed');
const Coach = require('../models/Coach');
const Subscription = require('../models/Subscription');
const { getRedisClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const CACHE_KEY = 'coaching_feed_list';
const CACHE_TTL = 300; // 5 minutes

// Helper to broadcast socket events
const broadcastEvent = (req, eventName, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(eventName, data);
    console.log(`[SOCKET] Broadcasted event '${eventName}' to all clients`);
  } else {
    console.warn('[SOCKET] IO instance not set in app. Could not broadcast.');
  }
};

// Helper to clear Redis Cache
const clearFeedCache = async () => {
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      await redisClient.del(CACHE_KEY);
      console.log('[CACHE] Redis Feed List Cache Invalidated.');
    } catch (err) {
      console.error(`[CACHE] Failed to invalidate Redis cache: ${err.message}`);
    }
  }
};

// @desc    Get coaching feeds
// @route   GET /api/feed
// @access  Public (Optionally filtered by subscriptions if token & ?subscribed=true provided)
exports.getFeeds = async (req, res) => {
  try {
    const redisClient = getRedisClient();
    const isSubscribedFilter = req.query.subscribed === 'true';

    // Decode client username from JWT Bearer token if present
    let clientUsername = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        clientUsername = decoded.preferred_username?.toLowerCase();
        console.log(`[API] Filtering query for authenticated client: ${clientUsername}`);
      } catch (e) {
        console.warn('[API] Token present but could not be parsed for filter.');
      }
    }

    // If subscription filter is requested and client is identified
    if (isSubscribedFilter && clientUsername) {
      console.log(`[API] Subscription-only feed requested for ${clientUsername}`);
      const subs = await Subscription.find({ clientUsername });
      const subscribedCoaches = subs.map(s => s.coachUsername);
      
      // Perform direct DB query to ensure real-time subscription toggle reactivity
      const feeds = await Feed.find({ coachUsername: { $in: subscribedCoaches } }).sort({ createdAt: -1 });
      return res.status(200).json(feeds);
    }
    
    // 1. Attempt Redis Cache Fetch for global feeds
    if (redisClient) {
      try {
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
          console.log('[CACHE] Cache Hit! Serving global feed from Redis.');
          return res.status(200).json(JSON.parse(cachedData));
        }
        console.log('[CACHE] Cache Miss. Fetching feeds from database.');
      } catch (err) {
        console.error(`[CACHE] Redis get error: ${err.message}. Falling back to DB.`);
      }
    } else {
      console.log('[CACHE] Redis disconnected. Direct DB querying active.');
    }

    // 2. Database Query on Cache Miss / Failover
    const feeds = await Feed.find({ visibility: { $in: ['global', 'both'] } }).sort({ createdAt: -1 });

    // 3. Write Back to Cache if Redis is active
    if (redisClient) {
      try {
        await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(feeds));
        console.log('[CACHE] Successfully cached feed list in Redis.');
      } catch (err) {
        console.error(`[CACHE] Redis set error: ${err.message}`);
      }
    }

    return res.status(200).json(feeds);
  } catch (error) {
    console.error(`[API ERROR] GET /feed failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create new feed card
// @route   POST /api/feed
// @access  Private (Coach role verified by Keycloak JWT)
exports.createFeed = async (req, res) => {
  try {
    const { title, content, type, visibility, mediaUrl, pollOptions, workoutItems, goalTarget, goalCurrent } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    // Capture coach name & username from JWT token claims (Keycloak)
    const coachName = req.user?.name || req.user?.preferred_username || 'Coach';
    const coachUsername = (req.user?.preferred_username || 'sarah').toLowerCase();

    // Query the Coach's profile in MongoDB to get their professional Type
    const coachProfile = await Coach.findOne({ username: coachUsername });
    const coachType = coachProfile ? coachProfile.type : 'Fitness Specialist';

    // Formulate database entry with interactive items if present
    const feedData = {
      title,
      content,
      type: type || 'text',
      coachName,
      coachUsername,
      coachType,
      visibility: visibility || 'both',
      mediaUrl: mediaUrl || '',
      messageId: `msg_${uuidv4()}`
    };

    if (type === 'poll' && Array.isArray(pollOptions)) {
      feedData.pollOptions = pollOptions.map(opt => ({ optionText: opt, votes: 0 }));
    }

    if (type === 'workout' && Array.isArray(workoutItems)) {
      feedData.workoutItems = workoutItems.map(item => ({ itemText: item, isCompleted: false }));
    }

    if (type === 'goal') {
      feedData.goalTarget = goalTarget ? Number(goalTarget) : 100;
      feedData.goalCurrent = goalCurrent ? Number(goalCurrent) : 0;
    }

    const feed = await Feed.create(feedData);
    console.log(`[DATABASE] Created new Feed Card: ${feed.title} (${feed.type})`);

    // Invalidate Cache and Broadcast instantly
    await clearFeedCache();
    broadcastEvent(req, 'feed:new', feed);

    return res.status(201).json(feed);
  } catch (error) {
    console.error(`[API ERROR] POST /feed failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Cast vote on live poll
// @route   POST /api/feed/:id/vote
// @access  Public (Any coachee)
exports.votePoll = async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      return res.status(400).json({ success: false, error: 'Option ID is required' });
    }

    // Atomic increment of the specific option vote
    const updatedFeed = await Feed.findOneAndUpdate(
      { _id: req.params.id, 'pollOptions._id': optionId },
      { $inc: { 'pollOptions.$.votes': 1 } },
      { new: true }
    );

    if (!updatedFeed) {
      return res.status(404).json({ success: false, error: 'Feed item or option not found' });
    }

    console.log(`[DATABASE] Register vote on poll option ${optionId}`);

    // Invalidate Cache and Broadcast updated tally
    await clearFeedCache();
    broadcastEvent(req, 'feed:update', updatedFeed);

    return res.status(200).json(updatedFeed);
  } catch (error) {
    console.error(`[API ERROR] POST /feed/:id/vote failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Toggle workout checklist item
// @route   POST /api/feed/:id/workout/toggle
// @access  Public
exports.toggleWorkoutItem = async (req, res) => {
  try {
    const { itemId, isCompleted } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    const updatedFeed = await Feed.findOneAndUpdate(
      { _id: req.params.id, 'workoutItems._id': itemId },
      { $set: { 'workoutItems.$.isCompleted': !!isCompleted } },
      { new: true }
    );

    if (!updatedFeed) {
      return res.status(404).json({ success: false, error: 'Feed item or workout item not found' });
    }

    console.log(`[DATABASE] Toggle workout item ${itemId} to ${isCompleted}`);

    await clearFeedCache();
    broadcastEvent(req, 'feed:update', updatedFeed);

    return res.status(200).json(updatedFeed);
  } catch (error) {
    console.error(`[API ERROR] Toggle workout failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Increment goal progress
// @route   POST /api/feed/:id/goal/progress
// @access  Public
exports.updateGoalProgress = async (req, res) => {
  try {
    const { incrementBy } = req.body;
    const value = incrementBy ? Number(incrementBy) : 1;

    const feed = await Feed.findById(req.params.id);
    if (!feed || feed.type !== 'goal') {
      return res.status(404).json({ success: false, error: 'Goal card not found' });
    }

    // Don't exceed target progress
    const newProgress = Math.min((feed.goalCurrent || 0) + value, feed.goalTarget || 100);

    feed.goalCurrent = newProgress;
    await feed.save();

    console.log(`[DATABASE] Incremented Goal ${feed.title} progress to ${newProgress}`);

    await clearFeedCache();
    broadcastEvent(req, 'feed:update', feed);

    return res.status(200).json(feed);
  } catch (error) {
    console.error(`[API ERROR] Update goal failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all registered coaches (supports search query q for type or name)
// @route   GET /api/feed/coaches
// @access  Public
exports.getCoaches = async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};
    if (q) {
      query = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { type: { $regex: q, $options: 'i' } }
        ]
      };
    }
    const coaches = await Coach.find(query);
    return res.status(200).json(coaches);
  } catch (error) {
    console.error(`[API ERROR] GET /feed/coaches failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get subscribed coach usernames for current client
// @route   GET /api/feed/subscriptions
// @access  Private (Authenticated Clients)
exports.getSubscriptions = async (req, res) => {
  try {
    const clientUsername = req.user?.preferred_username?.toLowerCase();
    if (!clientUsername) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    const subs = await Subscription.find({ clientUsername });
    const subscribedCoachUsernames = subs.map(s => s.coachUsername);
    return res.status(200).json(subscribedCoachUsernames);
  } catch (error) {
    console.error(`[API ERROR] GET /feed/subscriptions failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Subscribe to coach
// @route   POST /api/feed/subscribe
// @access  Private (Authenticated Clients)
exports.subscribeCoach = async (req, res) => {
  try {
    const clientUsername = req.user?.preferred_username?.toLowerCase();
    const { coachUsername } = req.body;
    if (!clientUsername || !coachUsername) {
      return res.status(400).json({ success: false, error: 'Coach username is required' });
    }

    await Subscription.findOneAndUpdate(
      { clientUsername, coachUsername: coachUsername.toLowerCase() },
      { clientUsername, coachUsername: coachUsername.toLowerCase() },
      { upsert: true, new: true }
    );

    console.log(`[DATABASE] Client '${clientUsername}' subscribed to coach '${coachUsername}'`);
    return res.status(200).json({ success: true, coachUsername });
  } catch (error) {
    console.error(`[API ERROR] POST /feed/subscribe failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Unsubscribe from coach
// @route   POST /api/feed/unsubscribe
// @access  Private (Authenticated Clients)
exports.unsubscribeCoach = async (req, res) => {
  try {
    const clientUsername = req.user?.preferred_username?.toLowerCase();
    const { coachUsername } = req.body;
    if (!clientUsername || !coachUsername) {
      return res.status(400).json({ success: false, error: 'Coach username is required' });
    }

    await Subscription.deleteOne({ clientUsername, coachUsername: coachUsername.toLowerCase() });

    console.log(`[DATABASE] Client '${clientUsername}' unsubscribed from coach '${coachUsername}'`);
    return res.status(200).json({ success: true, coachUsername });
  } catch (error) {
    console.error(`[API ERROR] POST /feed/unsubscribe failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get current coach's own published posts
// @route   GET /api/feed/my-posts
// @access  Private (Coach role verified by Keycloak JWT)
exports.getMyPosts = async (req, res) => {
  try {
    const coachUsername = (req.user?.preferred_username || 'sarah').toLowerCase();
    console.log(`[DATABASE] Fetching past posts for coach: ${coachUsername}`);
    const feeds = await Feed.find({ coachUsername }).sort({ createdAt: -1 });
    return res.status(200).json(feeds);
  } catch (error) {
    console.error(`[API ERROR] GET /feed/my-posts failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

