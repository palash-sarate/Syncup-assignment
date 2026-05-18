import React from 'react';

export const SkeletonLoader = () => {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((id) => (
        <div key={id} className="glass-panel rounded-xl p-5 md:p-6 border-l-4 border-l-zinc-700 animate-pulse space-y-4">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5" />
              <div className="space-y-2">
                <div className="h-3 w-28 bg-white/10 rounded" />
                <div className="h-2.5 w-16 bg-white/5 rounded" />
              </div>
            </div>
            <div className="h-5 w-16 bg-white/10 rounded-full" />
          </div>

          {/* Title Skeleton */}
          <div className="h-4 w-2/3 bg-white/10 rounded pt-2" />

          {/* Body Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-5/6 bg-white/5 rounded" />
          </div>

          {/* Media/Action Skeleton */}
          <div className="h-28 w-full bg-white/5 rounded-lg border border-white/5" />
        </div>
      ))}
    </div>
  );
};
