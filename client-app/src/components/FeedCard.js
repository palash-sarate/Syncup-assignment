'use client';

import React, { useState } from 'react';
import { 
  Play, 
  Trophy, 
  User, 
  Clock, 
  CheckSquare, 
  Square, 
  Plus, 
  Vote, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const FeedCard = ({ feed, onVote, onToggleWorkout, onIncrementGoal }) => {
  const [votingOptionId, setVotingOptionId] = useState(null);
  const [workoutLoadingId, setWorkoutLoadingId] = useState(null);
  const [goalLoading, setGoalLoading] = useState(false);

  const {
    _id,
    title,
    content,
    type,
    coachName,
    mediaUrl,
    pollOptions,
    workoutItems,
    goalTarget,
    goalCurrent,
    createdAt
  } = feed;

  // Simple relative time formatter
  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Determine accent color theme based on feed type
  const getTypeTheme = () => {
    switch (type) {
      case 'video':
        return {
          border: 'border-l-4 border-l-amber-500',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <Play className="w-4 h-4 text-amber-400" />
        };
      case 'poll':
        return {
          border: 'border-l-4 border-l-purple-500',
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: <Vote className="w-4 h-4 text-purple-400" />
        };
      case 'workout':
        return {
          border: 'border-l-4 border-l-emerald-500',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <CheckSquare className="w-4 h-4 text-emerald-400" />
        };
      case 'goal':
        return {
          border: 'border-l-4 border-l-rose-500',
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <Trophy className="w-4 h-4 text-rose-400" />
        };
      case 'image':
        return {
          border: 'border-l-4 border-l-sky-500',
          badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          icon: <Sparkles className="w-4 h-4 text-sky-400" />
        };
      default:
        return {
          border: 'border-l-4 border-l-indigo-500',
          badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: <Sparkles className="w-4 h-4 text-indigo-400" />
        };
    }
  };

  const theme = getTypeTheme();

  // YouTube/Vimeo embed parser helper
  const renderVideoEmbed = () => {
    if (!mediaUrl) return null;
    let embedUrl = null;

    if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = mediaUrl.match(regExp);
      if (match && match[2].length === 11) {
        embedUrl = `https://www.youtube.com/embed/${match[2]}`;
      }
    }

    if (embedUrl) {
      return (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 mt-3">
          <iframe
            src={embedUrl}
            title="Video guide"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          ></iframe>
        </div>
      );
    }

    return (
      <a 
        href={mediaUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors duration-150"
      >
        Watch Video Resource <ExternalLink className="w-3 h-3" />
      </a>
    );
  };

  // Interactive Poll options
  const renderPollOptions = () => {
    if (type !== 'poll' || !pollOptions) return null;

    const totalVotes = pollOptions.reduce((acc, opt) => acc + (opt.votes || 0), 0);

    const handleVoteSubmit = async (optionId) => {
      if (!onVote) return; // Preview mode check
      setVotingOptionId(optionId);
      try {
        await onVote(_id, optionId);
      } catch (err) {
        console.error(err);
      } finally {
        setVotingOptionId(null);
      }
    };

    return (
      <div className="space-y-2 mt-4">
        {pollOptions.map((opt) => {
          const votesCount = opt.votes || 0;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;

          return (
            <button
              key={opt._id || opt.optionText}
              onClick={() => handleVoteSubmit(opt._id)}
              disabled={votingOptionId !== null || !onVote}
              className="relative w-full text-left p-3 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 active:bg-white/8 transition-all duration-150 group overflow-hidden"
            >
              {/* Progress bar background */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-purple-500/10 transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />

              <div className="relative flex justify-between items-center text-sm">
                <span className="font-medium text-zinc-200 group-hover:text-white transition-colors duration-150">
                  {opt.optionText}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>{votesCount} votes</span>
                  <span className="font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {percentage}%
                  </span>
                </span>
              </div>
            </button>
          );
        })}
        <div className="text-right text-[10px] text-zinc-500 mt-1">
          Total Votes: {totalVotes} {onVote ? '• Click option to cast vote live!' : '• (Preview Mode)'}
        </div>
      </div>
    );
  };

  // Interactive Workout checklist
  const renderWorkoutChecklist = () => {
    if (type !== 'workout' || !workoutItems) return null;

    const completedCount = workoutItems.filter(item => item.isCompleted).length;
    const progressPercent = workoutItems.length > 0 ? Math.round((completedCount / workoutItems.length) * 100) : 0;

    const handleToggle = async (itemId, currentStatus) => {
      if (!onToggleWorkout) return; // Preview mode check
      setWorkoutLoadingId(itemId);
      try {
        await onToggleWorkout(_id, itemId, !currentStatus);
      } catch (err) {
        console.error(err);
      } finally {
        setWorkoutLoadingId(null);
      }
    };

    return (
      <div className="mt-4 space-y-3">
        {/* Progress bar */}
        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
          <span>Workout Completion</span>
          <span className="font-semibold text-emerald-400">{completedCount}/{workoutItems.length} ({progressPercent}%)</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* List items */}
        <div className="space-y-1.5 pt-2">
          {workoutItems.map((item) => (
            <button
              key={item._id || item.itemText}
              onClick={() => handleToggle(item._id, item.isCompleted)}
              disabled={workoutLoadingId !== null || !onToggleWorkout}
              className={`flex items-center gap-3 w-full text-left p-2.5 rounded-lg border transition-all duration-150 ${
                item.isCompleted 
                  ? 'border-emerald-500/20 bg-emerald-500/3' 
                  : 'border-white/5 bg-white/2 hover:bg-white/5'
              }`}
            >
              {item.isCompleted ? (
                <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-zinc-500 shrink-0 hover:text-zinc-400 transition-colors duration-150" />
              )}
              <span className={`text-sm transition-all duration-150 ${
                item.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'
              }`}>
                {item.itemText}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Interactive Goal progress bar
  const renderGoalMeter = () => {
    if (type !== 'goal') return null;

    const progressPercent = goalTarget > 0 ? Math.round((goalCurrent / goalTarget) * 100) : 0;

    const handleIncrement = async () => {
      if (!onIncrementGoal) return; // Preview mode check
      setGoalLoading(true);
      try {
        await onIncrementGoal(_id);
      } catch (err) {
        console.error(err);
      } finally {
        setGoalLoading(false);
      }
    };

    return (
      <div className="mt-4 space-y-4">
        {/* Tally */}
        <div className="flex justify-between items-end">
          <div>
            <span className="text-2xl font-bold text-rose-400">{goalCurrent}</span>
            <span className="text-xs text-zinc-500"> / {goalTarget} completed</span>
          </div>
          <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            {progressPercent}% Target achieved
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action Button to increase progress */}
        <button
          onClick={handleIncrement}
          disabled={goalLoading || goalCurrent >= goalTarget || !onIncrementGoal}
          className="flex items-center justify-center gap-1.5 w-full p-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 active:bg-rose-500/20 text-rose-400 font-semibold text-sm border border-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Daily Goal Progress</span>
        </button>
      </div>
    );
  };

  return (
    <div className={`glass-panel glass-panel-hover rounded-xl p-5 md:p-6 transition-all duration-300 card-entry ${theme.border}`}>
      
      {/* Header Info */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-zinc-200">{coachName || 'Sarah'}</h4>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatTime(createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic type badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider ${theme.badgeBg}`}>
          {theme.icon}
          <span>{type}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="mt-4">
        <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
          {title || 'Card Title'}
        </h3>
        <p className="text-zinc-400 text-sm mt-2 whitespace-pre-line leading-relaxed">
          {content || 'Provide content...'}
        </p>

        {/* Conditional rendering for media and actions */}
        {type === 'image' && mediaUrl && (
          <div className="relative mt-3 rounded-lg overflow-hidden border border-white/10 bg-black/40">
            <img 
              src={mediaUrl} 
              alt={title} 
              className="w-full object-cover max-h-[350px] hover:scale-[1.02] transition-transform duration-300" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {type === 'video' && renderVideoEmbed()}

        {type === 'poll' && renderPollOptions()}

        {type === 'workout' && renderWorkoutChecklist()}

        {type === 'goal' && renderGoalMeter()}

      </div>

    </div>
  );
};
