const mongoose = require('mongoose');
const Coach = require('../models/Coach');
const Subscription = require('../models/Subscription');
const Feed = require('../models/Feed');
const { v4: uuidv4 } = require('uuid');

const MONGO_URI = 'mongodb://localhost:27017/syncup_coaching';

const coachesData = [
  {
    name: 'Sarah Jenkins',
    username: 'sarah',
    type: 'HIIT Fitness',
    bio: 'Elite strength & HIIT training specialist. Helping athletes push physical boundaries since 2015.',
    avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'Elena Rostova',
    username: 'elena',
    type: 'Nutrition Specialist',
    bio: 'Registered dietician & metabolic repair advocate. Customizing clean-eating routines for fat-loss and recovery.',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'Kenji Takahashi',
    username: 'kenji',
    type: 'Yoga Instructor',
    bio: 'Vinyasa flow, breathwork, and alignment master. Cultivating flexibility, peace, and mindfulness.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'Marcus Aurelius',
    username: 'marcus',
    type: 'Stoic Mindset',
    bio: 'Stoicism teacher, emotional resilience coach, and author. Practicing premeditation of adversity daily.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    name: 'David Goggins',
    username: 'david',
    type: 'Powerlifting Guide',
    bio: 'Hardcore endurance athlete, ultra-runner, and strength coach. Stay hard. No excuses allowed.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
  }
];

const clients = [
  'client1', 'client2', 'client3', 'client4', 'client5',
  'client6', 'client7', 'client8', 'client9', 'client10', 'coachee'
];

// Map clients to their subscribed coach usernames
const clientSubscriptions = {
  'client1': ['sarah', 'elena'],
  'client2': ['elena', 'kenji'],
  'client3': ['kenji', 'marcus'],
  'client4': ['marcus', 'david'],
  'client5': ['david', 'sarah'],
  'client6': ['sarah', 'marcus'],
  'client7': ['elena', 'david'],
  'client8': ['kenji', 'sarah'],
  'client9': ['marcus', 'elena'],
  'client10': ['david', 'kenji'],
  'coachee': ['sarah', 'kenji', 'marcus'] // Active test user
};

const feedsData = [
  // Sarah Jenkins (HIIT Fitness)
  {
    title: 'Morning HIIT Cardio Blast',
    content: 'Rise and grind team! Today we are focusing on explosive plyometric movements to skyrocket metabolic burn. Perform 3 rounds with 45 seconds of effort and 15 seconds of rest. Stay focused on your core engagement during the mountain climbers.',
    type: 'text',
    coachName: 'Sarah Jenkins',
    coachUsername: 'sarah',
    coachType: 'HIIT Fitness',
    visibility: 'global'
  },
  {
    title: 'Sarah\'s HIIT Circuit Checklist',
    content: 'Complete these three rounds. Check them off once done to submit accountability stats to my dashboard:',
    type: 'workout',
    coachName: 'Sarah Jenkins',
    coachUsername: 'sarah',
    coachType: 'HIIT Fitness',
    visibility: 'subscribers',
    workoutItems: [
      { itemText: '20 Jumping Lunges', isCompleted: false },
      { itemText: '15 Hand-Release Pushups', isCompleted: false },
      { itemText: '30 Mountain Climbers', isCompleted: false },
      { itemText: '45s Forearm Plank Hold', isCompleted: false }
    ]
  },
  {
    title: 'Daily Heart Rate Zone Tracker',
    content: 'Goal: Log your active cardio workout minutes today. Aim for Zone 4 intensity (80-90% max HR):',
    type: 'goal',
    coachName: 'Sarah Jenkins',
    coachUsername: 'sarah',
    coachType: 'HIIT Fitness',
    visibility: 'both',
    goalTarget: 45,
    goalCurrent: 0
  },

  // Elena Rostova (Nutrition Specialist)
  {
    title: 'Superfood Green Smoothie Recipe',
    content: 'A perfect morning formula: Blend 1 cup baby spinach, 1/2 banana, 1 cup unsweetened almond milk, 1 scoop vanilla whey/plant protein, 1 tbsp chia seeds, and ice. This offers 25g protein, 8g fiber, and essential micronutrients.',
    type: 'text',
    coachName: 'Elena Rostova',
    coachUsername: 'elena',
    coachType: 'Nutrition Specialist',
    visibility: 'global',
    mediaUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Meal Prep Protein Selection Poll',
    content: 'What is your main protein source for this week\'s lunch prep? I will post corresponding recipe packs based on your votes!',
    type: 'poll',
    coachName: 'Elena Rostova',
    coachUsername: 'elena',
    coachType: 'Nutrition Specialist',
    visibility: 'both',
    pollOptions: [
      { optionText: 'Lean Chicken Breast', votes: 4 },
      { optionText: 'Wild Caught Salmon', votes: 2 },
      { optionText: 'Tofu / Tempeh / Seitan', votes: 5 },
      { optionText: 'Lean Ground Beef', votes: 3 }
    ]
  },
  {
    title: 'Exclusive Low-GI Grocery Checklist',
    content: 'Grab these low-glycemic, anti-inflammatory staples on your next grocery run:',
    type: 'workout',
    coachName: 'Elena Rostova',
    coachUsername: 'elena',
    coachType: 'Nutrition Specialist',
    visibility: 'subscribers',
    workoutItems: [
      { itemText: 'Organic Avocados', isCompleted: false },
      { itemText: 'Fresh Wild Blueberries', isCompleted: false },
      { itemText: 'Raw Walnuts & Pecans', isCompleted: false },
      { itemText: 'Steamed Edamame Pods', isCompleted: false }
    ]
  },

  // Kenji Takahashi (Yoga Instructor)
  {
    title: '15-Minute Hip Opening Yoga Vinyasa',
    content: 'This restorative flow opens tight hips and releases psychological stress locked in the psoas. Follow the flow in this reference video and sync with deep ujjayi breathing:',
    type: 'video',
    coachName: 'Kenji Takahashi',
    coachUsername: 'kenji',
    coachType: 'Yoga Instructor',
    visibility: 'global',
    mediaUrl: 'https://www.youtube.com/watch?v=s2S6sTMeevg'
  },
  {
    title: 'Meditation Breathing Rhythm Poll',
    content: 'Which pranayama breathing technique are we practicing together in our live stream tonight?',
    type: 'poll',
    coachName: 'Kenji Takahashi',
    coachUsername: 'kenji',
    coachType: 'Yoga Instructor',
    visibility: 'both',
    pollOptions: [
      { optionText: 'Nadi Shodhana (Alternate Nostril)', votes: 8 },
      { optionText: 'Kapalabhati (Skull-Shining Breath)', votes: 3 },
      { optionText: '4-7-8 Deep Rest Calm Breath', votes: 9 }
    ]
  },
  {
    title: 'Daily Yoga Routine Streak',
    content: 'Stay consistent. Log your restorative and stretching minutes today:',
    type: 'goal',
    coachName: 'Kenji Takahashi',
    coachUsername: 'kenji',
    coachType: 'Yoga Instructor',
    visibility: 'subscribers',
    goalTarget: 30,
    goalCurrent: 0
  },

  // Marcus Aurelius (Stoic Mindset)
  {
    title: 'The Obstacle is the Way',
    content: 'Our actions may be impeded, but there can be no impeding our intentions or dispositions. Because we can accommodate and adapt. The mind adapts and converts to its own purposes the obstacle to our acting. The impediment to action advances action. What stands in the way becomes the way.',
    type: 'text',
    coachName: 'Marcus Aurelius',
    coachUsername: 'marcus',
    coachType: 'Stoic Mindset',
    visibility: 'global'
  },
  {
    title: 'Stoic Evening Reflection Log',
    content: 'Tick off your daily mental alignment checks before sleep:',
    type: 'workout',
    coachName: 'Marcus Aurelius',
    coachUsername: 'marcus',
    coachType: 'Stoic Mindset',
    visibility: 'subscribers',
    workoutItems: [
      { itemText: 'Morning premeditation of adversity (Premeditatio Malorum)', isCompleted: false },
      { itemText: 'Practiced Amor Fati during unexpected friction', isCompleted: false },
      { itemText: 'Evening self-examination (Did I react with anger?)', isCompleted: false }
    ]
  },
  {
    title: 'Emotional Calibrated Reaction Poll',
    content: 'When insulted or faced with rude behavior today, how effectively did you apply the gap between stimulus and response?',
    type: 'poll',
    coachName: 'Marcus Aurelius',
    coachUsername: 'marcus',
    coachType: 'Stoic Mindset',
    visibility: 'both',
    pollOptions: [
      { optionText: 'Unshakably Calm: Insult belongs to the speaker.', votes: 14 },
      { optionText: 'Slightly perturbed, but self-restored immediately.', votes: 10 },
      { optionText: 'Reacted with defensive words. Must practice more.', votes: 5 }
    ]
  },

  // David Goggins (Powerlifting Guide)
  {
    title: 'Stay Hard! Who Gonna Carry the Boats?',
    content: 'You don\'t know me son! When that alarm goes off at 4:30 AM, your brain is gonna tell you it\'s cold, it\'s dark, stay in bed. That is where you have to win! If you can win the battle in your own mind, nobody can stop you. We are pushing heavy iron today. Get your mind right.',
    type: 'text',
    coachName: 'David Goggins',
    coachUsername: 'david',
    coachType: 'Powerlifting Guide',
    visibility: 'global',
    mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Goggins Heavy Pushup Grind',
    content: 'Log your total military pushup repetitions today. No shortcuts. Do not cheat yourself.',
    type: 'goal',
    coachName: 'David Goggins',
    coachUsername: 'david',
    coachType: 'Powerlifting Guide',
    visibility: 'subscribers',
    goalTarget: 200,
    goalCurrent: 0
  },
  {
    title: 'Endurance Core Accountability Checklist',
    content: 'Crush this core finisher after lifting. Take souls today:',
    type: 'workout',
    coachName: 'David Goggins',
    coachUsername: 'david',
    coachType: 'Powerlifting Guide',
    visibility: 'both',
    workoutItems: [
      { itemText: '100 Hanging Leg Raises', isCompleted: false },
      { itemText: '60 Russian Twists with Medicine Ball', isCompleted: false },
      { itemText: '4 min Cumulative Forearm Plank', isCompleted: false }
    ]
  }
];

async function seedKeycloakUsers() {
  console.log('[KEYCLOAK] Authenticating to Keycloak master realm...');
  let adminToken;
  try {
    const authRes = await fetch('http://localhost:8080/realms/master/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        username: 'admin',
        password: 'admin',
        grant_type: 'password'
      })
    });
    if (!authRes.ok) {
      throw new Error(`Admin login rejected by Keycloak: ${authRes.statusText}`);
    }
    const authData = await authRes.json();
    adminToken = authData.access_token;
    console.log('[KEYCLOAK] Successfully authenticated. Admin session active.');
  } catch (err) {
    console.warn(`[KEYCLOAK WARNING] Could not authenticate to Keycloak. Seeding Keycloak bypassed: ${err.message}`);
    return;
  }

  // Helper to get or create realm role
  const getOrCreateRole = async (roleName) => {
    const res = await fetch(`http://localhost:8080/admin/realms/coaching-realm/roles/${roleName}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.status === 404) {
      console.log(`[KEYCLOAK] Role '${roleName}' not found. Creating...`);
      await fetch(`http://localhost:8080/admin/realms/coaching-realm/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ name: roleName })
      });
      const retry = await fetch(`http://localhost:8080/admin/realms/coaching-realm/roles/${roleName}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      return await retry.json();
    }
    return await res.json();
  };

  const clientRole = await getOrCreateRole('client');
  const coachRole = await getOrCreateRole('coach');

  const provisionUser = async (username, password, roleName, fullName) => {
    username = username.toLowerCase();
    const searchRes = await fetch(`http://localhost:8080/admin/realms/coaching-realm/users?username=${username}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const users = await searchRes.json();
    let userId;

    const names = fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`[KEYCLOAK] User '${username}' already exists. Synced ID: ${userId}. Retroactively updating emailVerified: true...`);
      await fetch(`http://localhost:8080/admin/realms/coaching-realm/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          username,
          enabled: true,
          email: `${username}@example.com`,
          emailVerified: true,
          firstName,
          lastName
        })
      });
    } else {
      console.log(`[KEYCLOAK] Provisioning user '${username}'...`);
      const createRes = await fetch(`http://localhost:8080/admin/realms/coaching-realm/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          username,
          enabled: true,
          email: `${username}@example.com`,
          emailVerified: true,
          firstName,
          lastName,
          credentials: [
            {
              type: 'password',
              value: password,
              temporary: false
            }
          ]
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`[KEYCLOAK ERROR] Provision failed for '${username}': ${errText}`);
        return;
      }

      // Fetch the created user ID
      const findRes = await fetch(`http://localhost:8080/admin/realms/coaching-realm/users?username=${username}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const foundUsers = await findRes.json();
      userId = foundUsers[0].id;
    }

    // Map role
    const targetRole = roleName === 'coach' ? coachRole : clientRole;
    const roleMapRes = await fetch(`http://localhost:8080/admin/realms/coaching-realm/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify([targetRole])
    });

    if (roleMapRes.ok) {
      console.log(`[KEYCLOAK] Role '${roleName}' mapped cleanly to user '${username}'.`);
    } else {
      console.error(`[KEYCLOAK ERROR] Failed mapping role '${roleName}' to '${username}'.`);
    }
  };

  // Seed Coaches into Keycloak
  console.log('[KEYCLOAK] Provisioning coaches...');
  for (const coach of coachesData) {
    await provisionUser(coach.username, 'password', 'coach', coach.name);
  }

  // Seed Clients into Keycloak
  console.log('[KEYCLOAK] Provisioning clients...');
  for (const client of clients) {
    const pw = client === 'coachee' ? 'coachee' : 'password';
    await provisionUser(client, pw, 'client', `${client.toUpperCase()} User`);
  }
}

async function seed() {
  try {
    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[SEED] Connection active. Purging existing collections...');

    await Coach.deleteMany({});
    await Subscription.deleteMany({});
    await Feed.deleteMany({});

    console.log('[SEED] Seeding 5 professional coaches...');
    const insertedCoaches = await Coach.insertMany(coachesData);
    console.log(`[SEED] Success! Seeded ${insertedCoaches.length} coaches.`);

    console.log('[SEED] Seeding subscriber relations for 10 clients + coachee...');
    const subscriptionDocs = [];
    for (const client of clients) {
      const coachList = clientSubscriptions[client] || [];
      for (const coachUser of coachList) {
        subscriptionDocs.push({
          clientUsername: client.toLowerCase(),
          coachUsername: coachUser.toLowerCase()
        });
      }
    }
    const insertedSubs = await Subscription.insertMany(subscriptionDocs);
    console.log(`[SEED] Success! Seeded ${insertedSubs.length} active client-to-coach subscriptions.`);

    console.log('[SEED] Seeding 15 coaching feeds (Text, Poll, Video, Checklists)...');
    const finalFeeds = feedsData.map(feed => ({
      ...feed,
      messageId: `msg_${uuidv4()}`
    }));
    const insertedFeeds = await Feed.insertMany(finalFeeds);
    console.log(`[SEED] Success! Seeded ${insertedFeeds.length} coaching cards.`);

    // Synchronize to Keycloak via Admin API
    await seedKeycloakUsers();

    console.log('[SEED] Database and Keycloak populated successfully! Closing connection...');
    await mongoose.connection.close();
    console.log('[SEED] MongoDB session terminated.');
    process.exit(0);
  } catch (error) {
    console.error('[SEED ERROR] Script failed:', error);
    process.exit(1);
  }
}

seed();
