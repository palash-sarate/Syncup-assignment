const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feed.controller');
const { verifyKeycloakToken } = require('../middleware/auth');

// GET /api/feed - Retrieve feed list (uses Redis Cache middleware)
router.get('/', feedController.getFeeds);

// GET /api/feed/coaches - Search and list registered coaches (Public)
router.get('/coaches', feedController.getCoaches);

// GET /api/feed/my-posts - Get current coach's own published posts (Coach Private)
router.get('/my-posts', verifyKeycloakToken('coach'), feedController.getMyPosts);

// GET /api/feed/subscriptions - Get client's subscribed coach usernames (Client Private)
router.get('/subscriptions', verifyKeycloakToken('client'), feedController.getSubscriptions);

// POST /api/feed/subscribe - Subscribe to a coach (Client Private)
router.post('/subscribe', verifyKeycloakToken('client'), feedController.subscribeCoach);

// POST /api/feed/unsubscribe - Unsubscribe from a coach (Client Private)
router.post('/unsubscribe', verifyKeycloakToken('client'), feedController.unsubscribeCoach);

// POST /api/feed/:id/vote - Cast poll vote (Public)
router.post('/:id/vote', feedController.votePoll);

// POST /api/feed/:id/workout/toggle - Toggle workout item completion (Public)
router.post('/:id/workout/toggle', feedController.toggleWorkoutItem);

// POST /api/feed/:id/goal/progress - Advance goal target progress (Public)
router.post('/:id/goal/progress', feedController.updateGoalProgress);

// POST /api/feed - Create new feed card (requires valid Keycloak coach token)
router.post('/', verifyKeycloakToken('coach'), feedController.createFeed);

module.exports = router;
