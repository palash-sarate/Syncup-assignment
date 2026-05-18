'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { FeedCard } from '../components/FeedCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useSocket } from '../hooks/useSocket';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Inbox, 
  Loader2, 
  Search, 
  UserPlus, 
  UserCheck, 
  UserMinus, 
  Compass, 
  Flame, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const { authenticated, user, loading: authLoading, token } = useAuth();
  const router = useRouter();

  // Feeds and Caching State
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  // Search & Subscription Directory State
  const [coaches, setCoaches] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [coachSearch, setCoachSearch] = useState('');
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(true);
  const [subscribingUsernames, setSubscribingUsernames] = useState({}); // Loader state per coach

  // Refs for tracking states inside callbacks
  const showSubscribedOnlyRef = useRef(showSubscribedOnly);
  const subscriptionsRef = useRef(subscriptions);

  useEffect(() => {
    showSubscribedOnlyRef.current = showSubscribedOnly;
  }, [showSubscribedOnly]);

  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  // Authentication gate redirect check
  useEffect(() => {
    if (!authLoading && !authenticated) {
      console.warn('[AUTH GATE] Client unauthenticated. Redirecting to login portal...');
      router.push('/login');
    }
  }, [authenticated, authLoading, router]);

  // Fetch initial coach directory
  const fetchCoaches = async () => {
    try {
      console.log('[API] Querying /api/feed/coaches...');
      const res = await fetch('http://localhost:5000/api/feed/coaches');
      if (!res.ok) throw new Error('Failed to fetch coaches registry.');
      const data = await res.json();
      setCoaches(data);
    } catch (err) {
      console.error('[API ERROR] Fetch coaches failed:', err);
    }
  };

  // Fetch client subscription list
  const fetchSubscriptions = async () => {
    if (!token) return;
    try {
      console.log('[API] Querying client subscriptions...');
      const res = await fetch('http://localhost:5000/api/feed/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch active subscriptions.');
      const data = await res.json();
      setSubscriptions(data.map(username => username.toLowerCase()));
    } catch (err) {
      console.error('[API ERROR] Fetch subscriptions failed:', err);
    }
  };

  // Fetch initial feed list (Supports ?subscribed=true or global)
  const fetchFeeds = async (isRetry = false) => {
    if (isRetry) setLoading(true);
    setError(null);
    try {
      const url = showSubscribedOnly 
        ? 'http://localhost:5000/api/feed?subscribed=true'
        : 'http://localhost:5000/api/feed';

      console.log(`[API] Dispatching REST request to ${url}...`);
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Gateway returned error status: ${res.status}`);
      }
      const data = await res.json();
      setFeeds(data);
      
      // Register all fetched feed messageIds in the socket deduplicator
      data.forEach(item => {
        registerProcessedId(item.messageId);
      });
    } catch (err) {
      console.error('[REST ERROR] Failed to fetch initial feeds:', err);
      setError('Could not connect to the API server. Please make sure the backend is active.');
    } finally {
      setLoading(false);
    }
  };

  // Define Socket event callbacks
  const handleNewFeedBroadcast = useCallback((newFeed) => {
    console.log('[CLIENT] Live feed broadcast received:', newFeed.title);
    setFeeds(prevFeeds => {
      // Safety check to ensure no duplicates enter local state
      if (prevFeeds.some(item => item._id === newFeed._id)) return prevFeeds;
      
      // If we are in personalized subscription mode, ignore feeds from unsubscribed coaches
      const isSubscribedView = showSubscribedOnlyRef.current;
      const subs = subscriptionsRef.current;
      const author = (newFeed.coachUsername || '').toLowerCase();
      
      if (isSubscribedView && !subs.includes(author)) {
        console.log(`[CLIENT] Filtering out live feed from unsubscribed coach: ${author}`);
        return prevFeeds;
      }
      
      return [newFeed, ...prevFeeds];
    });
  }, []);

  const handleUpdateFeedBroadcast = useCallback((updatedFeed) => {
    console.log('[CLIENT] Live feed update broadcast received:', updatedFeed._id);
    setFeeds(prevFeeds => 
      prevFeeds.map(item => item._id === updatedFeed._id ? updatedFeed : item)
    );
  }, []);

  // Initialize socket connection hook
  const { status: socketStatus, registerProcessedId } = useSocket(
    handleNewFeedBroadcast,
    handleUpdateFeedBroadcast
  );

  // Sync feed on toggle switch or initial token load
  useEffect(() => {
    if (authenticated && token) {
      fetchCoaches();
      fetchSubscriptions();
    }
  }, [authenticated, token]);

  useEffect(() => {
    if (authenticated) {
      fetchFeeds();
    }
  }, [authenticated, showSubscribedOnly]);

  // Subscription Toggles
  const handleToggleSubscription = async (coachUsername) => {
    const isSubscribed = subscriptions.includes(coachUsername.toLowerCase());
    
    // Set loading spinner state
    setSubscribingUsernames(prev => ({ ...prev, [coachUsername]: true }));

    const endpoint = isSubscribed ? 'unsubscribe' : 'subscribe';
    try {
      console.log(`[API] Triggering subscription toggle '${endpoint}' for coach '${coachUsername}'...`);
      const res = await fetch(`http://localhost:5000/api/feed/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coachUsername })
      });

      if (!res.ok) throw new Error('Action failed.');

      // Refresh subscription mapping
      await fetchSubscriptions();
      
      // Trigger temporary banner alert
      triggerTemporaryAlert(
        isSubscribed 
          ? `Successfully unsubscribed from ${coachUsername}.` 
          : `Successfully subscribed to ${coachUsername}'s feed!`
      );

      // Re-trigger feed sync so scrollable list reacts instantly
      await fetchFeeds();
    } catch (err) {
      console.error(`[API ERROR] Toggle subscription failed:`, err);
      triggerTemporaryAlert('Could not complete subscription operation.');
    } finally {
      setSubscribingUsernames(prev => ({ ...prev, [coachUsername]: false }));
    }
  };

  // Interactive card actions
  const handleVote = async (feedId, optionId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/feed/${feedId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      });
      if (!res.ok) throw new Error('Failed to register vote.');
    } catch (err) {
      triggerTemporaryAlert('Could not submit vote. Connection issue.');
    }
  };

  const handleToggleWorkout = async (feedId, itemId, isCompleted) => {
    try {
      const res = await fetch(`http://localhost:5000/api/feed/${feedId}/workout/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isCompleted })
      });
      if (!res.ok) throw new Error('Failed to update check status.');
    } catch (err) {
      triggerTemporaryAlert('Could not update workout checklist.');
    }
  };

  const handleIncrementGoal = async (feedId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/feed/${feedId}/goal/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementBy: 1 })
      });
      if (!res.ok) throw new Error('Failed to increment goal.');
    } catch (err) {
      triggerTemporaryAlert('Could not record goal progress.');
    }
  };

  const triggerTemporaryAlert = (msg) => {
    setAlert(msg);
    setTimeout(() => setAlert(null), 4000);
  };

  // Filter local coach directories by type or name
  const getFilteredCoaches = () => {
    return coaches.filter(coach => {
      const target = coachSearch.toLowerCase();
      return (
        coach.name.toLowerCase().includes(target) ||
        coach.type.toLowerCase().includes(target)
      );
    });
  };

  // Loading Screen
  if (authLoading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-semibold tracking-tight">Verifying Auth Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-16 min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar socketStatus={socketStatus} />

      {/* Floating Alerts */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white font-semibold text-xs px-4 py-3 rounded-lg shadow-xl border border-indigo-500/20 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{alert}</span>
        </div>
      )}

      {/* Main Grid Layout (Facebook style dual columns) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pt-8 md:pt-12">
        
        {/* Banner/Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-[11px] uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20 animate-pulse" />
              <span>STAY ACCOUNTABLE IN REALTIME</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none mt-1.5">
              SyncUp Client Portal
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-2">
              Follow coaches of different specialties and stream interactive check-ins smoothly.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFeeds(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 active:scale-95 disabled:opacity-50 text-xs font-semibold text-zinc-300 transition-all duration-150 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Feed</span>
            </button>
          </div>
        </div>

        {/* Live Network Disconnect Alert */}
        {socketStatus === 'disconnected' && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">Realtime stream interrupted.</span> Attempting reconnect...
            </div>
          </div>
        )}

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Feed Stream (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Facebook-style Feed Tabs Toggle */}
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5 max-w-md">
              <button
                onClick={() => setShowSubscribedOnly(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  showSubscribedOnly 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>My Personalized Feed ({subscriptions.length})</span>
              </button>
              <button
                onClick={() => setShowSubscribedOnly(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  !showSubscribedOnly 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Global Discovery</span>
              </button>
            </div>

            {/* Scrollable Container simulating Facebook feed */}
            <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {loading ? (
                <SkeletonLoader />
              ) : error ? (
                <div className="glass-panel rounded-2xl p-8 text-center border-l-4 border-l-rose-500 space-y-4 shadow-xl">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="font-bold text-lg text-white">Connection Error</h3>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">{error}</p>
                  <button
                    onClick={() => fetchFeeds(true)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : feeds.length === 0 ? (
                /* Subscriptions Empty State */
                showSubscribedOnly ? (
                  <div className="glass-panel rounded-2xl p-8 md:p-10 text-center border border-white/5 space-y-5 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                      <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-black text-lg text-white">Personalized Feed is Empty</h3>
                      <p className="text-zinc-400 text-xs md:text-sm max-w-sm mx-auto leading-relaxed">
                        {subscriptions.length === 0 
                          ? "You are not subscribed to any professional coaches yet. Search and follow coach types on the right directory to build your feed!"
                          : "Your subscribed coaches have not posted any guides recently. Try switching to Global Discovery above!"}
                      </p>
                    </div>
                    
                    {subscriptions.length === 0 && (
                      <div className="flex justify-center items-center gap-1.5 text-xs text-indigo-400 font-bold animate-pulse">
                        <span>Subscribe on the right directory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl p-10 text-center space-y-4 border border-white/5 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-white">No Global Feeds</h3>
                    <p className="text-zinc-400 text-xs md:text-sm max-w-xs mx-auto leading-relaxed">
                      Coaches have not published any check-ins. When a card is broadcast, it will populate here instantly.
                    </p>
                  </div>
                )
              ) : (
                /* Facebook Feed Cards list */
                <div className="space-y-6">
                  {feeds.map((feed) => (
                    <FeedCard
                      key={feed._id}
                      feed={feed}
                      onVote={handleVote}
                      onToggleWorkout={handleToggleWorkout}
                      onIncrementGoal={handleIncrementGoal}
                    />
                  ))}
                  <div className="py-4 text-center text-[10px] text-zinc-600 font-semibold tracking-wider uppercase">
                    --- End of coaching updates ---
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Coaches Search & Subscribe Directory (4 cols on lg) */}
          <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-white/5 shadow-xl space-y-5 lg:sticky lg:top-24">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Coaches Directory</span>
              </h2>
              <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                Follow premium experts to populate your customized feed.
              </p>
            </div>

            {/* Specialty Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search type (Yoga, Stoic, Fitness)..."
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder:text-zinc-650 focus:outline-none focus:border-indigo-500 transition-colors duration-150"
              />
              <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Coaches List */}
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
              {getFilteredCoaches().length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-white/5 rounded-xl">
                  No coaches match your search.
                </div>
              ) : (
                getFilteredCoaches().map(coach => {
                  const isSubscribed = subscriptions.includes(coach.username.toLowerCase());
                  const isLoading = subscribingUsernames[coach.username] || false;

                  return (
                    <div 
                      key={coach._id}
                      className="p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all duration-150 flex items-start gap-3 relative overflow-hidden"
                    >
                      {/* Avatar */}
                      <img 
                        src={coach.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'} 
                        alt={coach.name}
                        className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
                      />

                      {/* Info & Specialty */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white truncate">{coach.name}</div>
                        <div className="text-[10px] text-indigo-400 font-extrabold tracking-tight mt-0.5 uppercase shrink-0">
                          {coach.type}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-normal line-clamp-2">
                          {coach.bio}
                        </p>

                        {/* Subscription Action Button */}
                        <div className="mt-2.5 flex justify-end">
                          <button
                            onClick={() => handleToggleSubscription(coach.username)}
                            disabled={isLoading}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight transition-all duration-150 flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                              isSubscribed 
                                ? 'bg-emerald-600/15 hover:bg-rose-600/20 text-emerald-400 hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/20 group' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isSubscribed ? (
                              <>
                                <UserCheck className="w-3 h-3 group-hover:hidden shrink-0" />
                                <UserMinus className="w-3 h-3 hidden group-hover:inline shrink-0" />
                                <span className="group-hover:hidden">Subscribed</span>
                                <span className="hidden group-hover:inline">Unsubscribe</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3 shrink-0" />
                                <span>Subscribe</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-white/5 text-[9px] text-zinc-500 leading-normal text-center">
              Active Session: <strong className="text-zinc-400">{user?.name || user?.username}</strong>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
