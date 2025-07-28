'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  Trophy,
  Star,
  Target,
  Clock,
  CheckCircle,
  Circle,
  Award,
  Zap,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Flame,
  Medal,
  Crown,
  Gem,
  Shield,
  BookOpen,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  PlayCircle,
  Pause,
  RotateCcw,
  Filter,
  Download,
  Share2
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  icon: string;
  category: 'completion' | 'streak' | 'speed' | 'accuracy' | 'collaboration' | 'milestone';
  points: number;
  unlocked_at?: string;
  requirements: {
    type: string;
    target: number;
    current: number;
  };
}

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_multiplier: number;
}

interface SkillProgress {
  skill_name: string;
  skill_name_fr: string;
  current_level: number;
  progress_to_next: number;
  total_modules_completed: number;
  average_score: number;
  time_spent_hours: number;
  last_practiced: string;
  improvement_trend: 'improving' | 'stable' | 'declining';
}

interface TrainingStats {
  total_modules_completed: number;
  total_time_spent_hours: number;
  average_score: number;
  current_streak: number;
  total_points: number;
  achievements_unlocked: number;
  certificates_earned: number;
  rank_position: number;
  improvement_rate: number;
}

interface WeeklyActivity {
  date: string;
  modules_completed: number;
  time_spent_minutes: number;
  points_earned: number;
  streak_maintained: boolean;
}

interface TrainingProgressTrackerProps {
  /** User ID to track progress for */
  userId?: string;
  /** User's training statistics */
  stats?: TrainingStats;
  /** User's achievements */
  achievements?: Achievement[];
  /** User's skill progress */
  skillProgress?: SkillProgress[];
  /** User's learning streak */
  learningStreak?: LearningStreak;
  /** Weekly activity data */
  weeklyActivity?: WeeklyActivity[];
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether to show gamification elements */
  showGamification?: boolean;
  /** Callback when user wants to continue training */
  onContinueTraining?: (skillName?: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * TrainingProgressTracker - Visual progress tracking with gamification elements
 * 
 * Features:
 * - Comprehensive progress visualization with charts and graphs
 * - Gamification elements (points, achievements, streaks, levels)
 * - Skill-based progress tracking with improvement trends
 * - Achievement system with unlock notifications
 * - Learning streak tracking with multipliers
 * - Weekly activity patterns and insights
 * - Comparative ranking and peer comparison
 * - Goal setting and milestone tracking
 * - Motivational elements and encouragement
 * - Tablet-optimized responsive design
 * - Bilingual content support (EN/FR)
 * - Detailed analytics and insights
 * 
 * @param props TrainingProgressTrackerProps
 * @returns JSX.Element
 */
const TrainingProgressTracker: React.FC<TrainingProgressTrackerProps> = ({
  userId,
  stats,
  achievements = [],
  skillProgress = [],
  learningStreak,
  weeklyActivity = [],
  compact = false,
  showGamification = true,
  onContinueTraining,
  className
}) => {
  const t = useTranslations('training.progress');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('week');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate derived statistics
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    const completionRate = stats.total_modules_completed > 0 ? (stats.average_score / 100) : 0;
    const efficiencyScore = stats.total_time_spent_hours > 0 
      ? (stats.total_modules_completed / stats.total_time_spent_hours) * 10 
      : 0;
    
    return {
      ...stats,
      completion_rate: completionRate,
      efficiency_score: Math.min(efficiencyScore, 100),
      next_level_points: Math.ceil(stats.total_points / 1000) * 1000,
      progress_to_next_level: (stats.total_points % 1000) / 10
    };
  }, [stats]);

  // Get level information based on points
  const getLevelInfo = (points: number) => {
    const level = Math.floor(points / 1000) + 1;
    const levelNames = ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master', 'Grandmaster'];
    const levelColors = ['text-gray-600', 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    const levelIcons = [BookOpen, Shield, Star, Trophy, Crown, Gem];
    
    const levelIndex = Math.min(level - 1, levelNames.length - 1);
    const LevelIcon = levelIcons[levelIndex];
    
    return {
      level,
      name: levelNames[levelIndex],
      color: levelColors[levelIndex],
      icon: LevelIcon,
      progress: (points % 1000) / 10
    };
  };

  // Get achievement icon component
  const getAchievementIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      trophy: Trophy,
      star: Star,
      medal: Medal,
      crown: Crown,
      zap: Zap,
      flame: Flame,
      target: Target,
      award: Award
    };
    return iconMap[iconName] || Trophy;
  };

  // Get trend icon and color
  const getTrendInfo = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return { icon: ArrowUp, color: 'text-green-600', bg: 'bg-green-50' };
      case 'declining':
        return { icon: ArrowDown, color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // Render overview cards
  const renderOverviewCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Modules Completed */}
      <Card>
        <CardContent className="p-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto text-jade-green mb-2" />
          <div className="text-2xl font-bold text-krong-black">
            {derivedStats?.total_modules_completed || 0}
          </div>
          <div className="text-tablet-xs text-muted-foreground">
            {t('modulesCompleted')}
          </div>
        </CardContent>
      </Card>

      {/* Average Score */}
      <Card>
        <CardContent className="p-4 text-center">
          <Star className="w-8 h-8 mx-auto text-golden-saffron mb-2" />
          <div className="text-2xl font-bold text-krong-black">
            {derivedStats?.average_score || 0}%
          </div>
          <div className="text-tablet-xs text-muted-foreground">
            {t('averageScore')}
          </div>
        </CardContent>
      </Card>

      {/* Current Streak */}
      <Card>
        <CardContent className="p-4 text-center">
          <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
          <div className="text-2xl font-bold text-krong-black">
            {learningStreak?.current_streak || 0}
          </div>
          <div className="text-tablet-xs text-muted-foreground">
            {t('dayStreak')}
          </div>
        </CardContent>
      </Card>

      {/* Total Points */}
      <Card>
        <CardContent className="p-4 text-center">
          <Trophy className="w-8 h-8 mx-auto text-krong-red mb-2" />
          <div className="text-2xl font-bold text-krong-black">
            {derivedStats?.total_points || 0}
          </div>
          <div className="text-tablet-xs text-muted-foreground">
            {t('totalPoints')}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render level progress
  const renderLevelProgress = () => {
    if (!derivedStats || !showGamification) return null;

    const levelInfo = getLevelInfo(derivedStats.total_points);
    const LevelIcon = levelInfo.icon;

    return (
      <Card className="border-2 border-golden-saffron bg-gradient-to-r from-golden-saffron/5 to-golden-saffron/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-golden-saffron/20 rounded-full">
                <LevelIcon className={cn("w-6 h-6", levelInfo.color)} />
              </div>
              <div>
                <h3 className="text-tablet-lg font-heading font-bold text-krong-black">
                  {t('level')} {levelInfo.level}
                </h3>
                <p className="text-tablet-sm text-muted-foreground">
                  {levelInfo.name}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-tablet-sm font-medium text-krong-black">
                {derivedStats.total_points} / {derivedStats.next_level_points}
              </div>
              <div className="text-tablet-xs text-muted-foreground">
                {t('pointsToNextLevel')}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={levelInfo.progress} className="h-3" />
            <div className="flex justify-between text-tablet-xs text-muted-foreground">
              <span>{t('progress')}</span>
              <span>{Math.round(levelInfo.progress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render achievements
  const renderAchievements = () => {
    const unlockedAchievements = achievements.filter(a => a.unlocked_at);
    const lockedAchievements = achievements.filter(a => !a.unlocked_at);

    return (
      <div className="space-y-4">
        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div>
            <h3 className="font-semibold text-krong-black mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-golden-saffron" />
              {t('unlockedAchievements')} ({unlockedAchievements.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unlockedAchievements.map((achievement) => {
                const IconComponent = getAchievementIcon(achievement.icon);
                return (
                  <Card key={achievement.id} className="border-golden-saffron bg-golden-saffron/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-golden-saffron/20 rounded-lg">
                          <IconComponent className="w-5 h-5 text-golden-saffron" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-tablet-sm text-krong-black">
                            {achievement.title}
                          </h4>
                          <p className="text-tablet-xs text-muted-foreground mt-1">
                            {achievement.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {achievement.points} {t('points')}
                            </Badge>
                            {achievement.unlocked_at && (
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(achievement.unlocked_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div>
            <h3 className="font-semibold text-krong-black mb-3 flex items-center gap-2">
              <Circle className="w-5 h-5 text-muted-foreground" />
              {t('lockedAchievements')} ({lockedAchievements.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lockedAchievements.slice(0, 6).map((achievement) => {
                const IconComponent = getAchievementIcon(achievement.icon);
                const progress = (achievement.requirements.current / achievement.requirements.target) * 100;
                
                return (
                  <Card key={achievement.id} className="border-dashed border-gray-300 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-tablet-sm text-gray-600">
                            {achievement.title}
                          </h4>
                          <p className="text-tablet-xs text-muted-foreground mt-1">
                            {achievement.description}
                          </p>
                          
                          {/* Progress toward achievement */}
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>
                                {achievement.requirements.current}/{achievement.requirements.target}
                              </span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                          </div>
                          
                          <Badge variant="outline" className="text-[10px] mt-2">
                            {achievement.points} {t('points')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render skill progress
  const renderSkillProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-krong-black">
          {t('skillProgress')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onContinueTraining?.()}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {t('continueTraining')}
        </Button>
      </div>
      
      <div className="space-y-3">
        {skillProgress.map((skill) => {
          const trendInfo = getTrendInfo(skill.improvement_trend);
          const TrendIcon = trendInfo.icon;
          
          return (
            <Card key={skill.skill_name} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-tablet-lg font-bold text-krong-red">
                        {skill.current_level}
                      </div>
                      <div className="text-tablet-xs text-muted-foreground">
                        {t('level')}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-krong-black">
                        {skill.skill_name}
                      </h4>
                      <div className="flex items-center gap-2 text-tablet-xs text-muted-foreground">
                        <span>{skill.total_modules_completed} {t('modules')}</span>
                        <span>•</span>
                        <span>{skill.average_score}% {t('avgScore')}</span>
                        <span>•</span>
                        <span>{skill.time_spent_hours}h</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded", trendInfo.bg)}>
                      <TrendIcon className={cn("w-4 h-4", trendInfo.color)} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onContinueTraining?.(skill.skill_name)}
                    >
                      {t('practice')}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-tablet-xs">
                    <span>{t('nextLevel')}</span>
                    <span>{Math.round(skill.progress_to_next)}%</span>
                  </div>
                  <Progress value={skill.progress_to_next} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Render weekly activity
  const renderWeeklyActivity = () => {
    const maxModules = Math.max(...weeklyActivity.map(day => day.modules_completed), 1);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-krong-red" />
            {t('weeklyActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weeklyActivity.map((day, index) => {
              const intensity = day.modules_completed / maxModules;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en', { weekday: 'short' });
              
              return (
                <div key={day.date} className="text-center">
                  <div className="text-tablet-xs text-muted-foreground mb-1">
                    {dayName}
                  </div>
                  <div
                    className={cn(
                      "w-8 h-8 rounded border border-gray-200 flex items-center justify-center text-tablet-xs font-medium transition-colors",
                      intensity > 0.7 ? "bg-jade-green text-white" :
                      intensity > 0.4 ? "bg-jade-green/60 text-white" :
                      intensity > 0.1 ? "bg-jade-green/30" :
                      "bg-gray-50"
                    )}
                    title={`${day.modules_completed} modules, ${day.time_spent_minutes}min`}
                  >
                    {day.modules_completed > 0 && day.modules_completed}
                  </div>
                  {day.streak_maintained && (
                    <Flame className="w-3 h-3 text-orange-500 mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between text-tablet-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
              <span className="text-muted-foreground">{t('noActivity')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-jade-green rounded"></div>
              <span className="text-muted-foreground">{t('highActivity')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!derivedStats && !compact) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-tablet-lg font-heading font-semibold text-krong-black mb-2">
            {t('noProgressData')}
          </h3>
          <p className="text-tablet-sm text-muted-foreground mb-4">
            {t('noProgressDataDesc')}
          </p>
          <Button onClick={() => onContinueTraining?.()}>
            <PlayCircle className="w-4 h-4 mr-2" />
            {t('startTraining')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Compact Mode */}
      {compact && derivedStats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-tablet-lg font-bold text-krong-red">
                    {getLevelInfo(derivedStats.total_points).level}
                  </div>
                  <div className="text-tablet-xs text-muted-foreground">
                    {t('level')}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 text-tablet-sm">
                    <span>{derivedStats.total_modules_completed} {t('modules')}</span>
                    <span>•</span>
                    <span>{derivedStats.average_score}% {t('avg')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {learningStreak?.current_streak || 0}
                    </span>
                  </div>
                  <Progress 
                    value={getLevelInfo(derivedStats.total_points).progress} 
                    className="h-2 mt-2" 
                  />
                </div>
              </div>
              
              <Button size="sm" onClick={() => onContinueTraining?.()}>
                <PlayCircle className="w-4 h-4 mr-2" />
                {t('continue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Mode */}
      {!compact && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-tablet-xl font-heading font-bold text-krong-black flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-krong-red" />
                {t('trainingProgress')}
              </h2>
              <p className="text-tablet-sm text-muted-foreground mt-1">
                {t('trackYourLearning')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {t('export')}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                {t('share')}
              </Button>
            </div>
          </div>

          {/* Level Progress */}
          {showGamification && renderLevelProgress()}

          {/* Overview Cards */}
          {renderOverviewCards()}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
              <TabsTrigger value="skills">{t('skills')}</TabsTrigger>
              <TabsTrigger value="achievements">{t('achievements')}</TabsTrigger>
              <TabsTrigger value="activity">{t('activity')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {renderWeeklyActivity()}
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-krong-red" />
                    {t('quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => onContinueTraining?.()}
                    >
                      <PlayCircle className="w-6 h-6 text-krong-red" />
                      <span className="text-tablet-sm">{t('continueTraining')}</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveTab('achievements')}
                    >
                      <Trophy className="w-6 h-6 text-golden-saffron" />
                      <span className="text-tablet-sm">{t('viewAchievements')}</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveTab('skills')}
                    >
                      <Target className="w-6 h-6 text-jade-green" />
                      <span className="text-tablet-sm">{t('skillProgress')}</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                    >
                      <Users className="w-6 h-6 text-blue-500" />
                      <span className="text-tablet-sm">{t('leaderboard')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              {renderSkillProgress()}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              {renderAchievements()}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {renderWeeklyActivity()}
              
              {/* Detailed Activity Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <div className="text-tablet-lg font-bold text-krong-black">
                      {derivedStats?.total_time_spent_hours || 0}h
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('totalTimeSpent')}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                    <div className="text-tablet-lg font-bold text-krong-black">
                      {learningStreak?.longest_streak || 0}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('longestStreak')}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <div className="text-tablet-lg font-bold text-krong-black">
                      {derivedStats?.efficiency_score.toFixed(1) || 0}
                    </div>
                    <div className="text-tablet-xs text-muted-foreground">
                      {t('efficiencyScore')}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default TrainingProgressTracker;