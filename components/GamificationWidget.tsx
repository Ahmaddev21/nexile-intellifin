
import React from 'react';
import { Trophy, Shield, Zap, Star, Award, TrendingUp, Users } from 'lucide-react';
import { UserProgress, Badge } from '../types';

interface GamificationWidgetProps {
  progress: UserProgress;
  userName?: string;
}

const iconMap: Record<string, any> = {
  Trophy, Shield, Zap, Star
};

const GamificationWidget: React.FC<GamificationWidgetProps> = ({ progress, userName }) => {
  const levelProgress = (progress.points / progress.nextLevelPoints) * 100;
  const firstName = userName?.split(' ')[0] || 'You';

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Level {progress.level} Specialist</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{progress.points} / {progress.nextLevelPoints} XP</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-heading">#{Math.floor(Math.random() * 10) + 1}</div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Team Rank</div>
          </div>
        </div>
        
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
            style={{ width: `${levelProgress}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">750 XP until Level {progress.level + 1}</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Recent Achievements
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {progress.badges.map((badge) => {
            const IconComponent = iconMap[badge.icon] || Trophy;
            return (
              <div 
                key={badge.id} 
                className={`p-3 rounded-2xl border transition-all ${
                  badge.unlocked 
                    ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm opacity-100' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700 opacity-40 grayscale'
                }`}
              >
                <IconComponent className={`w-6 h-6 mb-2 ${badge.color}`} />
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{badge.name}</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">{badge.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-indigo-900 text-white overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="font-bold text-indigo-100 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5" /> Team Leaderboard
          </h3>
          <div className="space-y-3 mt-4">
            <LeaderboardItem name="Alex Rivet" points={3420} rank={1} isUser={false} />
            <LeaderboardItem name={`${firstName} (You)`} points={progress.points} rank={4} isUser={true} />
            <LeaderboardItem name="Marcus P." points={1100} rank={8} isUser={false} />
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
      </div>
    </div>
  );
};

const LeaderboardItem: React.FC<{ name: string; points: number; rank: number; isUser: boolean }> = ({ name, points, rank, isUser }) => (
  <div className={`flex items-center justify-between p-2 rounded-xl ${isUser ? 'bg-indigo-800 border border-indigo-700' : ''}`}>
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-indigo-300 w-4">{rank}</span>
      <div className="w-7 h-7 bg-indigo-700 rounded-lg flex items-center justify-center text-[10px] font-bold">
        {name.charAt(0)}
      </div>
      <span className={`text-xs font-medium ${isUser ? 'text-white' : 'text-indigo-200'}`}>{name}</span>
    </div>
    <span className="text-xs font-bold text-indigo-300">{points} XP</span>
  </div>
);

export default GamificationWidget;
