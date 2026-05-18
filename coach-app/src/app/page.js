'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { FeedCard } from '../components/FeedCard';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  UserCheck,
  Eye,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export default function CoachDashboard() {
  const { authenticated, user, loading: authLoading, token, logout } = useAuth();
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('text');
  const [visibility, setVisibility] = useState('both');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Interactive poll options
  const [pollOptions, setPollOptions] = useState(['Yes, definitely!', 'Not today.']);
  
  // Interactive workout checklist tasks
  const [workoutItems, setWorkoutItems] = useState(['15 Squats', '10 Pushups', '2 min Plank']);
  
  // Interactive Goal parameters
  const [goalTarget, setGoalTarget] = useState('50');

  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Authentication gate redirects
  useEffect(() => {
    if (!authLoading && !authenticated) {
      console.warn('[AUTH GATE] Coach unauthenticated. Redirecting to login portal...');
      router.push('/login');
    }
  }, [authenticated, authLoading, router]);

  // Clear notifications automatically
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Construct a mock feed item for live rendering in the preview pane
  const getMockFeed = () => {
    const mock = {
      _id: 'mock_preview_id',
      title: title || 'Live Preview Card Title',
      content: content || 'Your card content and descriptions will update dynamically in this preview panel as you compose.',
      type,
      coachName: user?.name || 'Coach Sarah',
      mediaUrl: mediaUrl || '',
      createdAt: new Date().toISOString()
    };

    if (type === 'poll') {
      mock.pollOptions = pollOptions.map((opt, i) => ({ 
        _id: `opt_${i}`, 
        optionText: opt || `Option ${i+1}`, 
        votes: 2 * (i + 1) 
      }));
    }

    if (type === 'workout') {
      mock.workoutItems = workoutItems.map((item, i) => ({ 
        _id: `task_${i}`, 
        itemText: item || `Task ${i+1}`, 
        isCompleted: i === 0 
      }));
    }

    if (type === 'goal') {
      mock.goalTarget = Number(goalTarget) || 100;
      mock.goalCurrent = Math.round(Number(goalTarget) * 0.4) || 0;
    }

    return mock;
  };

  // Poll Dynamic Fields Helpers
  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions([...pollOptions, '']);
  };
  const updatePollOption = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };
  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Workout Dynamic Fields Helpers
  const addWorkoutItem = () => {
    if (workoutItems.length < 8) setWorkoutItems([...workoutItems, '']);
  };
  const updateWorkoutItem = (index, value) => {
    const updated = [...workoutItems];
    updated[index] = value;
    setWorkoutItems(updated);
  };
  const removeWorkoutItem = (index) => {
    if (workoutItems.length > 1) {
      setWorkoutItems(workoutItems.filter((_, i) => i !== index));
    }
  };

  // Publish Form Submission
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Please specify both a title and description.');
      return;
    }

    setFormLoading(true);
    setErrorMsg(null);

    // Compile POST payload
    const payload = {
      title,
      content,
      type,
      visibility,
      mediaUrl
    };

    if (type === 'poll') {
      payload.pollOptions = pollOptions.filter(opt => opt.trim() !== '');
      if (payload.pollOptions.length < 2) {
        setErrorMsg('Please provide at least 2 valid poll options.');
        setFormLoading(false);
        return;
      }
    }

    if (type === 'workout') {
      payload.workoutItems = workoutItems.filter(item => item.trim() !== '');
      if (payload.workoutItems.length < 1) {
        setErrorMsg('Please provide at least 1 valid task item.');
        setFormLoading(false);
        return;
      }
    }

    if (type === 'goal') {
      payload.goalTarget = Number(goalTarget) || 100;
      payload.goalCurrent = 0;
    }

    try {
      console.log('[API] Dispatching authorized POST /api/feed...');
      const res = await fetch('http://localhost:5000/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Keycloak OIDC JWT token header
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      // Success Reset
      setTitle('');
      setContent('');
      setVisibility('both');
      setMediaUrl('');
      setPollOptions(['Yes, definitely!', 'Not today.']);
      setWorkoutItems(['15 Squats', '10 Pushups', '2 min Plank']);
      setGoalTarget('50');
      setSuccessMsg('Coaching Card Published and Broadcast Live Successfully!');
    } catch (err) {
      console.error('[API ERROR] Publish failed:', err);
      setErrorMsg(err.message || 'Could not complete publishing operation. API is unreachable.');
    } finally {
      setFormLoading(false);
    }
  };

  // 1. Loading screen
  if (authLoading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-sm font-semibold tracking-tight">Validating Coach OIDC session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Screen (Possesses account but lacks role 'coach')
  if (authenticated && !user?.isCoach) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar socketStatus="connected" />
        
        <main className="flex-1 max-w-md w-full mx-auto px-4 flex flex-col justify-center pb-24">
          <div className="glass-panel rounded-2xl p-6 md:p-8 border border-white/5 space-y-6 text-center shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 text-rose-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Access Denied</h2>
              <p className="text-rose-300 text-xs leading-relaxed max-w-xs mx-auto">
                Authorized role: <strong className="font-extrabold uppercase">coach</strong>. Your account '{user?.username}' is recognized as a <strong className="font-extrabold uppercase text-purple-400">client</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="w-full py-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/20 text-rose-400 font-bold text-sm border border-rose-500/20 transition-all duration-150 cursor-pointer"
              >
                Sign Out / Switch Accounts
              </button>
              
              <a
                href="http://localhost:3000"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-sm border border-white/10 transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Client Feed</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Authorized Coach Panel Dashboard
  return (
    <div className="flex-1 flex flex-col pb-16 min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar socketStatus="connected" />

      {/* Floating Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white font-semibold text-xs px-4 py-3 rounded-lg shadow-xl border border-emerald-500/20 animate-bounce">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-rose-600 text-white font-semibold text-xs px-4 py-3 rounded-lg shadow-xl border border-rose-500/20 animate-bounce">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pt-8 md:pt-12">
        
        {/* Title */}
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-2 text-purple-400 font-extrabold text-[11px] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 animate-pulse" />
            <span>COACH EXCLUSIVE CONTROL PANEL</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none mt-1.5 font-sans">
            Publish Coaching Guidance
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-2 leading-relaxed">
            Authorized session active as <strong className="text-purple-400">{user?.name || user?.username}</strong>. Live cards will broadcast to all client screens immediately.
          </p>
        </div>

        {/* Form and Preview Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Composer Form Panel (7 cols on lg) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-5 md:p-6 border border-white/5 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Card Composer</h2>

            <form onSubmit={handlePublish} className="space-y-4">
              
              {/* Type Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Card Type / Template</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setMediaUrl(''); // Reset url on switch
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 transition-colors duration-150"
                >
                  <option value="text">Standard Guidance (Text)</option>
                  <option value="image">Rich Image Card</option>
                  <option value="video">Embed Video Tutorial</option>
                  <option value="poll">Interactive Live Poll</option>
                  <option value="workout">Exercise Checklist Task</option>
                  <option value="goal">Goal Progress Tracker</option>
                </select>
              </div>

              {/* Visibility Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Card Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 transition-colors duration-150"
                >
                  <option value="both">Both (Global Discovery & Subscribers Feed)</option>
                  <option value="global">Global Only (Discovery Feed only)</option>
                  <option value="subscribers">Subscribers Only (Exclusive content)</option>
                </select>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Card Header / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Focus on Posture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 transition-colors duration-150"
                />
              </div>

              {/* Content Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Card Description / Content</label>
                <textarea
                  rows="4"
                  placeholder="Provide complete instructional steps, workout guides, or description info."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 transition-colors duration-150 resize-y"
                />
              </div>

              {/* CONDITIONAL: Image / Video URL */}
              {(type === 'image' || type === 'video') && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">
                    {type === 'image' ? 'Image File Address (URL)' : 'YouTube Video Address (URL)'}
                  </label>
                  <input
                    type="url"
                    placeholder={type === 'image' ? 'https://images.unsplash.com/photo-...' : 'https://www.youtube.com/watch?v=...'}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 transition-colors duration-150"
                  />
                  <span className="text-[10px] text-zinc-500 leading-normal">
                    {type === 'image' 
                      ? 'Input a direct image url to render it embedded in the card.' 
                      : 'Supports standard youtube.com/watch?v=... and youtu.be/... sharing links.'}
                  </span>
                </div>
              )}

              {/* CONDITIONAL: Dynamic Poll Options */}
              {type === 'poll' && (
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight flex justify-between items-center">
                    <span>Poll Vote Options</span>
                    <button
                      type="button"
                      onClick={addPollOption}
                      disabled={pollOptions.length >= 5}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-350 flex items-center gap-0.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD OPTION
                    </button>
                  </label>
                  
                  <div className="space-y-2">
                    {pollOptions.map((opt, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Option ${index + 1}`}
                          value={opt}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          disabled={pollOptions.length <= 2}
                          className="p-2.5 rounded-lg border border-white/5 bg-white/2 hover:bg-rose-500/10 hover:border-rose-500/20 text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONDITIONAL: Dynamic Workout Tasks */}
              {type === 'workout' && (
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight flex justify-between items-center">
                    <span>Exercise Checklist Tasks</span>
                    <button
                      type="button"
                      onClick={addWorkoutItem}
                      disabled={workoutItems.length >= 8}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-350 flex items-center gap-0.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD TASK
                    </button>
                  </label>
                  
                  <div className="space-y-2">
                    {workoutItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Task ${index + 1} e.g. 20 Jumping Jacks`}
                          value={item}
                          onChange={(e) => updateWorkoutItem(index, e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkoutItem(index)}
                          disabled={workoutItems.length <= 1}
                          className="p-2.5 rounded-lg border border-white/5 bg-white/2 hover:bg-rose-500/10 hover:border-rose-500/20 text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONDITIONAL: Goal Target */}
              {type === 'goal' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Daily Target Count (Goal Target)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 transition-colors duration-150"
                  />
                  <span className="text-[10px] text-zinc-500 leading-normal">
                    The total target reps, minutes, or counts for clients to incrementally record progress against.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-purple-600/10 active:scale-98 transition-all duration-150 cursor-pointer"
              >
                {formLoading ? (
                  <div className="w-4 h-4 border-t-2 border-white border-r-2 border-r-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Publish & Broadcast Card</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* RIGHT: Live Preview Split (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 px-1.5">
              <Eye className="w-4 h-4 text-zinc-500" />
              <span>Live Card Preview</span>
            </h2>

            {/* Frame wrapper simulating the dashboard view */}
            <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-white/1 flex flex-col justify-center">
              <FeedCard 
                feed={getMockFeed()} 
                onVote={null} // Pass null to signify preview mode
                onToggleWorkout={null}
                onIncrementGoal={null}
              />
            </div>
            
            <p className="text-[10px] text-zinc-500 leading-normal text-center max-w-xs mx-auto">
              This preview mimics exact styling and features rendered on client dashboards, including interactive components.
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}
