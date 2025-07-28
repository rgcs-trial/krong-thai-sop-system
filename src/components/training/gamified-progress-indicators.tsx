/**
 * Gamified Training Progress Indicators
 * Advanced gamification system with achievements, streaks, leaderboards,
 * progress visualizations, and motivational elements for restaurant staff
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy,
  Star,
  Award,
  Medal,
  Crown,
  Gem,
  Shield,
  Zap,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Calendar,
  Clock,
  Timer,
  CheckCircle,
  Circle,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Download,
  Eye,
  EyeOff,
  Settings,
  Gift,
  PartyPopper,
  Sparkles,
  Heart,
  ThumbsUp,
  MessageSquare,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  SkipForward,
  SkipBack,
  Maximize,
  Minimize,
  Move,
  Grid,
  List,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Calendar as CalendarIcon,
  MapPin,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Headphones,
  Mic,
  Camera,
  Image,
  Video,
  FileText,
  BookOpen,
  Lightbulb,
  Brain,
  Rocket,
  Flag,
  Mountain,
  Sunrise,
  Moon,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Gauge,
  Compass,
  Map,
  Navigation,
  Route,
  Waypoints
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface Achievement {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  icon: string;
  category: 'progress' | 'streak' | 'speed' | 'accuracy' | 'collaboration' | 'milestone' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirements: {
    type: string;
    target: number;
    current: number;
    condition?: string;
  };
  unlockedAt?: string;
  progress: number;
  isSecret: boolean;
  rewards?: {
    points: number;
    badges: string[];
    unlocks: string[];
    special?: string;
  };
}

interface LearningStreak {
  current: number;
  longest: number;
  lastActivity: string;
  multiplier: number;
  milestones: number[];
  streakType: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  freezesUsed: number;
  maxFreezes: number;
}

interface SkillLevel {
  skill: string;
  skill_fr: string;
  currentLevel: number;
  currentXP: number;
  xpToNext: number;
  totalXP: number;
  prestige: number;
  mastery: number;
  specializations: string[];
  rank: string;
  rank_fr: string;
  progression: {
    beginner: { level: number; xp: number };
    intermediate: { level: number; xp: number };
    advanced: { level: number; xp: number };
    expert: { level: number; xp: number };
    master: { level: number; xp: number };
  };
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  position: number;
  points: number;
  level: number;
  achievements: number;
  streak: number;
  avatar?: string;
  badge?: string;
  change: 'up' | 'down' | 'same';
  changeAmount: number;
  department: string;
  joinedAt: string;
}

interface Challenge {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  startDate: string;
  endDate: string;
  progress: number;
  target: number;
  rewards: {
    points: number;
    achievements: string[];
    badges: string[];
    special?: string;
  };
  participants: number;
  isCompleted: boolean;
  isActive: boolean;
  category: string;
}

interface Badge {
  id: string;
  name: string;
  name_fr: string;
  description: string;
  description_fr: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
  category: string;
  isDisplayed: boolean;
}

interface MilestoneReward {
  id: string;
  title: string;
  title_fr: string;
  description: string;
  description_fr: string;
  type: 'points' | 'badge' | 'achievement' | 'unlock' | 'special';
  value: number | string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  animation: 'confetti' | 'fireworks' | 'sparkles' | 'glow';
  sound?: string;
}

interface GamificationSettings {
  showProgress: boolean;
  showAchievements: boolean;
  showLeaderboard: boolean;
  showStreaks: boolean;
  enableSounds: boolean;
  enableAnimations: boolean;
  enableNotifications: boolean;
  competitiveMode: boolean;
  shareProgress: boolean;
  showRanking: boolean;
  motivationalMessages: boolean;
  celebrationLevel: 'minimal' | 'moderate' | 'maximum';
  privacyLevel: 'public' | 'department' | 'private';
}

interface GamifiedProgressIndicatorsProps {
  className?: string;
  userId?: string;
  currentProgress?: number;
  achievements?: Achievement[];
  skillLevels?: SkillLevel[];
  learningStreak?: LearningStreak;
  leaderboard?: LeaderboardEntry[];
  challenges?: Challenge[];
  badges?: Badge[];
  onLevelUp?: (skill: string, newLevel: number) => void;
  onAchievementUnlocked?: (achievement: Achievement) => void;
  onChallengeCompleted?: (challenge: Challenge) => void;
  settings?: Partial<GamificationSettings>;
}

const DEFAULT_SETTINGS: GamificationSettings = {
  showProgress: true,
  showAchievements: true,
  showLeaderboard: true,
  showStreaks: true,
  enableSounds: true,
  enableAnimations: true,
  enableNotifications: true,
  competitiveMode: true,
  shareProgress: false,
  showRanking: true,
  motivationalMessages: true,
  celebrationLevel: 'moderate',
  privacyLevel: 'department'
};

export function GamifiedProgressIndicators({
  className,
  userId = 'current-user',
  currentProgress = 0,
  achievements = [],
  skillLevels = [],
  learningStreak,
  leaderboard = [],
  challenges = [],
  badges = [],
  onLevelUp,
  onAchievementUnlocked,
  onChallengeCompleted,
  settings: propSettings
}: GamifiedProgressIndicatorsProps) {
  const { t, locale } = useI18n();
  
  // State management
  const [settings, setSettings] = useState<GamificationSettings>({
    ...DEFAULT_SETTINGS,
    ...propSettings
  });
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<MilestoneReward | null>(null);
  const [animatingElements, setAnimatingElements] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'progress' | 'rarity' | 'date'>('progress');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Refs for animations
  const celebrationRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef<HTMLAudioElement>(null);
  
  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalPoints = skillLevels.reduce((sum, skill) => sum + skill.totalXP, 0);
    const averageLevel = skillLevels.length > 0 
      ? skillLevels.reduce((sum, skill) => sum + skill.currentLevel, 0) / skillLevels.length 
      : 0;
    const unlockedAchievements = achievements.filter(a => a.unlockedAt).length;
    const completedChallenges = challenges.filter(c => c.isCompleted).length;
    const earnedBadges = badges.filter(b => b.earnedAt).length;
    
    return {
      totalPoints,
      averageLevel: Math.round(averageLevel * 10) / 10,
      unlockedAchievements,
      completedChallenges,
      earnedBadges,
      overallProgress: Math.min(100, (totalPoints / 10000) * 100), // Assuming 10k points = 100%
    };
  }, [skillLevels, achievements, challenges, badges]);
  
  // Get user's rank and position
  const userRank = useMemo(() => {
    const userEntry = leaderboard.find(entry => entry.userId === userId);
    if (!userEntry) return { position: 0, total: leaderboard.length };
    
    return {
      position: userEntry.position,
      total: leaderboard.length,
      percentile: Math.round(((leaderboard.length - userEntry.position + 1) / leaderboard.length) * 100)
    };
  }, [leaderboard, userId]);
  
  // Get achievement by rarity
  const achievementsByRarity = useMemo(() => {
    const grouped = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.rarity]) acc[achievement.rarity] = [];
      acc[achievement.rarity].push(achievement);
      return acc;
    }, {} as Record<string, Achievement[]>);
    
    return grouped;
  }, [achievements]);
  
  // Get recent achievements
  const recentAchievements = useMemo(() => {
    return achievements
      .filter(a => a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 5);
  }, [achievements]);
  
  // Get active challenges
  const activeChallenges = useMemo(() => {
    return challenges.filter(c => c.isActive && !c.isCompleted);
  }, [challenges]);
  
  // Level up handler
  const handleLevelUp = useCallback((skill: string, newLevel: number) => {
    if (!settings.enableAnimations) return;
    
    // Trigger celebration animation
    const reward: MilestoneReward = {
      id: `level-${skill}-${newLevel}`,
      title: t('training.level_up'),
      title_fr: t('training.level_up'),
      description: t('training.reached_level', { level: newLevel, skill }),
      description_fr: t('training.reached_level', { level: newLevel, skill }),
      type: 'special',
      value: newLevel,
      rarity: newLevel >= 50 ? 'legendary' : newLevel >= 25 ? 'epic' : 'rare',
      animation: 'fireworks'
    };
    
    triggerCelebration(reward);
    onLevelUp?.(skill, newLevel);
  }, [settings.enableAnimations, onLevelUp, t]);
  
  // Achievement unlock handler
  const handleAchievementUnlock = useCallback((achievement: Achievement) => {
    if (!settings.enableAnimations) return;
    
    const reward: MilestoneReward = {
      id: achievement.id,
      title: locale === 'fr' ? achievement.name_fr : achievement.name,
      title_fr: achievement.name_fr,
      description: locale === 'fr' ? achievement.description_fr : achievement.description,
      description_fr: achievement.description_fr,
      type: 'achievement',
      value: achievement.points,
      rarity: achievement.rarity,
      animation: achievement.rarity === 'legendary' ? 'fireworks' : 'confetti'
    };
    
    triggerCelebration(reward);
    onAchievementUnlocked?.(achievement);
  }, [settings.enableAnimations, onAchievementUnlocked, locale]);
  
  // Trigger celebration animation
  const triggerCelebration = (reward: MilestoneReward) => {
    setCelebrationData(reward);
    setShowCelebration(true);
    
    // Play sound if enabled
    if (settings.enableSounds && soundRef.current) {
      soundRef.current.play().catch(() => {
        // Audio play failed, silently continue
      });
    }
    
    // Auto-hide after animation
    setTimeout(() => {
      setShowCelebration(false);
      setCelebrationData(null);
    }, 4000);
  };
  
  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 border-gray-300';
      case 'uncommon': return 'text-green-600 border-green-300';
      case 'rare': return 'text-blue-600 border-blue-300';
      case 'epic': return 'text-purple-600 border-purple-300';
      case 'legendary': return 'text-orange-600 border-orange-300';
      default: return 'text-gray-600 border-gray-300';
    }
  };
  
  // Get achievement icon
  const getAchievementIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      trophy: Trophy,
      star: Star,
      award: Award,
      medal: Medal,
      crown: Crown,
      gem: Gem,
      shield: Shield,
      zap: Zap,
      flame: Flame,
      target: Target,
      rocket: Rocket,
      mountain: Mountain
    };
    return iconMap[iconName] || Trophy;
  };
  
  // Render skill progress ring
  const renderSkillRing = (skill: SkillLevel) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const progress = (skill.currentXP / skill.xpToNext) * 100;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted-foreground/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-krong-red transition-all duration-500 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Level number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-krong-black">
              {skill.currentLevel}
            </div>
            <div className="text-xs text-muted-foreground">
              {skill.prestige > 0 && (
                <Star className="w-3 h-3 inline text-golden-saffron" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render overview section
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card className="bg-gradient-to-r from-krong-red/5 to-golden-saffron/5 border-krong-red/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-krong-black">
                {t('training.overall_progress')}
              </h3>
              <p className="text-muted-foreground">
                {t('training.keep_learning')}
              </p>
            </div>
            <div className="text-3xl font-bold text-krong-red">
              {Math.round(overallStats.overallProgress)}%
            </div>
          </div>
          
          <Progress value={overallStats.overallProgress} className="h-3 mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {overallStats.totalPoints.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('training.total_points')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {overallStats.averageLevel}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('training.avg_level')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {overallStats.unlockedAchievements}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('training.achievements')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {learningStreak?.current || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('training.day_streak')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Skill levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-krong-red" />
            {t('training.skill_levels')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillLevels.map((skill) => (
              <div key={skill.skill} className="text-center space-y-3">
                {renderSkillRing(skill)}
                
                <div>
                  <h4 className="font-semibold text-krong-black">
                    {locale === 'fr' ? skill.skill_fr : skill.skill}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'fr' ? skill.rank_fr : skill.rank}
                  </p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div>{skill.currentXP.toLocaleString()} / {skill.xpToNext.toLocaleString()} XP</div>
                  {skill.mastery > 0 && (
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      <Gem className="w-3 h-3 text-purple-500" />
                      <span>{skill.mastery}% {t('training.mastery')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-golden-saffron" />
              {t('training.recent_achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAchievements.map((achievement) => {
                const IconComponent = getAchievementIcon(achievement.icon);
                return (
                  <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    <div className={cn(
                      "p-2 rounded-lg border-2",
                      getRarityColor(achievement.rarity)
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1">
                      <h5 className="font-medium">
                        {locale === 'fr' ? achievement.name_fr : achievement.name}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        {locale === 'fr' ? achievement.description_fr : achievement.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {achievement.points} {t('training.points')}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs", getRarityColor(achievement.rarity))}>
                          {t(`training.rarity_${achievement.rarity}`)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {achievement.unlockedAt && new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
  
  // Render achievements section
  const renderAchievements = () => (
    <div className="space-y-6">
      {/* Achievement filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('training.filter_category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('training.all_categories')}</SelectItem>
              <SelectItem value="progress">{t('training.progress')}</SelectItem>
              <SelectItem value="streak">{t('training.streak')}</SelectItem>
              <SelectItem value="speed">{t('training.speed')}</SelectItem>
              <SelectItem value="accuracy">{t('training.accuracy')}</SelectItem>
              <SelectItem value="collaboration">{t('training.collaboration')}</SelectItem>
              <SelectItem value="milestone">{t('training.milestone')}</SelectItem>
              <SelectItem value="special">{t('training.special')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy as any}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="progress">{t('training.progress')}</SelectItem>
              <SelectItem value="rarity">{t('training.rarity')}</SelectItem>
              <SelectItem value="date">{t('training.date')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Achievement grid */}
      <div className={cn(
        "gap-4",
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"
      )}>
        {achievements
          .filter(a => filterCategory === 'all' || a.category === filterCategory)
          .sort((a, b) => {
            switch (sortBy) {
              case 'progress':
                return b.progress - a.progress;
              case 'rarity':
                const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
              case 'date':
                return (b.unlockedAt || '').localeCompare(a.unlockedAt || '');
              default:
                return 0;
            }
          })
          .map((achievement) => {
            const IconComponent = getAchievementIcon(achievement.icon);
            const isUnlocked = !!achievement.unlockedAt;
            
            return (
              <Card 
                key={achievement.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  isUnlocked 
                    ? cn("border-2", getRarityColor(achievement.rarity))
                    : "opacity-60 border-dashed",
                  viewMode === 'list' && "flex flex-row items-center p-0"
                )}
              >
                <CardContent className={cn(
                  "p-4",
                  viewMode === 'list' && "flex items-center space-x-4 flex-1"
                )}>
                  <div className={cn(
                    "text-center",
                    viewMode === 'list' && "text-left flex items-center space-x-4"
                  )}>
                    <div className={cn(
                      "p-3 rounded-xl border-2 mx-auto mb-3",
                      getRarityColor(achievement.rarity),
                      !isUnlocked && "grayscale",
                      viewMode === 'list' && "mx-0 mb-0"
                    )}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    
                    <div className={cn(viewMode === 'list' && "flex-1")}>
                      <h4 className="font-semibold mb-1">
                        {achievement.isSecret && !isUnlocked
                          ? t('training.secret_achievement')
                          : locale === 'fr' 
                            ? achievement.name_fr 
                            : achievement.name
                        }
                      </h4>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {achievement.isSecret && !isUnlocked
                          ? t('training.complete_requirements_to_unlock')
                          : locale === 'fr' 
                            ? achievement.description_fr 
                            : achievement.description
                        }
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>{t('training.progress')}</span>
                          <span>{Math.round(achievement.progress)}%</span>
                        </div>
                        <Progress value={achievement.progress} className="h-1" />
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className={cn("text-xs", getRarityColor(achievement.rarity))}>
                          {t(`training.rarity_${achievement.rarity}`)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {achievement.points} {t('training.points')}
                        </Badge>
                      </div>
                      
                      {isUnlocked && achievement.unlockedAt && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {t('training.unlocked_on')} {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
  
  // Render leaderboard section
  const renderLeaderboard = () => (
    <div className="space-y-6">
      {/* User rank card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                {t('training.your_rank')}
              </h3>
              <p className="text-blue-600">
                {t('training.department_ranking')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                #{userRank.position}
              </div>
              <div className="text-sm text-blue-500">
                {t('training.top_percentile', { percentile: userRank.percentile })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-golden-saffron" />
            {t('training.leaderboard')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div 
                key={entry.userId}
                className={cn(
                  "flex items-center space-x-4 p-3 rounded-lg transition-colors",
                  entry.userId === userId 
                    ? "bg-krong-red/10 border border-krong-red/20" 
                    : "hover:bg-muted/50",
                  index < 3 && "bg-gradient-to-r",
                  index === 0 && "from-yellow-50 to-yellow-100 border-yellow-200",
                  index === 1 && "from-gray-50 to-gray-100 border-gray-200",
                  index === 2 && "from-orange-50 to-orange-100 border-orange-200"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 && "bg-yellow-500 text-white",
                    index === 1 && "bg-gray-400 text-white",
                    index === 2 && "bg-orange-500 text-white",
                    index >= 3 && "bg-muted text-muted-foreground"
                  )}>
                    {index < 3 ? (
                      index === 0 ? <Crown className="w-4 h-4" /> :
                      index === 1 ? <Medal className="w-4 h-4" /> :
                      <Award className="w-4 h-4" />
                    ) : (
                      entry.position
                    )}
                  </div>
                  
                  {entry.avatar ? (
                    <img 
                      src={entry.avatar} 
                      alt={entry.userName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{entry.userName}</h4>
                    {entry.badge && (
                      <Badge variant="outline" className="text-xs">
                        {entry.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.department} • {t('training.level')} {entry.level}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold">
                    {entry.points.toLocaleString()} {t('training.pts')}
                  </div>
                  <div className="flex items-center space-x-1 text-xs">
                    {entry.change === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                    {entry.change === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                    <span className={cn(
                      entry.change === 'up' && "text-green-600",
                      entry.change === 'down' && "text-red-600",
                      entry.change === 'same' && "text-muted-foreground"
                    )}>
                      {entry.change === 'same' ? '-' : entry.changeAmount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render challenges section
  const renderChallenges = () => (
    <div className="space-y-6">
      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-krong-red" />
              {t('training.active_challenges')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeChallenges.map((challenge) => (
                <div key={challenge.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">
                        {locale === 'fr' ? challenge.name_fr : challenge.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'fr' ? challenge.description_fr : challenge.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        challenge.difficulty === 'extreme' ? 'destructive' :
                        challenge.difficulty === 'hard' ? 'default' :
                        'secondary'
                      }>
                        {t(`training.difficulty_${challenge.difficulty}`)}
                      </Badge>
                      <Badge variant="outline">
                        {t(`training.challenge_${challenge.type}`)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('training.progress')}</span>
                      <span>{challenge.progress} / {challenge.target}</span>
                    </div>
                    <Progress value={(challenge.progress / challenge.target) * 100} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{challenge.participants} {t('training.participants')}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Timer className="w-3 h-3" />
                        <span>{new Date(challenge.endDate).toLocaleDateString()}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-3 h-3 text-golden-saffron" />
                      <span>{challenge.rewards.points} {t('training.points')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Completed challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
            {t('training.completed_challenges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {challenges
              .filter(c => c.isCompleted)
              .slice(0, 5)
              .map((challenge) => (
                <div key={challenge.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <h5 className="font-medium">
                      {locale === 'fr' ? challenge.name_fr : challenge.name}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {t('training.completed_on')} {new Date(challenge.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      +{challenge.rewards.points} {t('training.pts')}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render celebration overlay
  const renderCelebration = () => {
    if (!showCelebration || !celebrationData) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div 
          ref={celebrationRef}
          className={cn(
            "relative p-8 bg-white rounded-2xl shadow-2xl max-w-md mx-4 text-center",
            "animate-in zoom-in-95 duration-500"
          )}
        >
          {/* Celebration animation */}
          {celebrationData.animation === 'confetti' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#E31B23', '#D4AF37', '#008B8B'][Math.floor(Math.random() * 3)],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Content */}
          <div className="relative z-10">
            <div className="mb-4">
              <PartyPopper className="w-16 h-16 mx-auto text-golden-saffron" />
            </div>
            
            <h2 className="text-2xl font-bold text-krong-black mb-2">
              {celebrationData.title}
            </h2>
            
            <p className="text-muted-foreground mb-6">
              {celebrationData.description}
            </p>
            
            <div className={cn(
              "inline-flex items-center px-4 py-2 rounded-full text-lg font-bold",
              celebrationData.rarity === 'legendary' && "bg-gradient-to-r from-orange-400 to-red-500 text-white",
              celebrationData.rarity === 'epic' && "bg-gradient-to-r from-purple-400 to-blue-500 text-white",
              celebrationData.rarity === 'rare' && "bg-gradient-to-r from-blue-400 to-green-500 text-white",
              celebrationData.rarity === 'common' && "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
            )}>
              {celebrationData.type === 'points' && '+'}
              {celebrationData.value}
              {celebrationData.type === 'points' && ` ${t('training.points')}`}
              {celebrationData.type === 'special' && ` ${t('training.level')}`}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Sparkles className="w-6 h-6 mr-3 text-golden-saffron" />
              {t('training.progress_achievements')}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t('training.track_your_journey')}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              {t('common.settings')}
            </Button>
            
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              {t('training.share_progress')}
            </Button>
          </div>
        </div>
        
        {/* Main content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('training.overview')}</TabsTrigger>
            <TabsTrigger value="achievements">{t('training.achievements')}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t('training.leaderboard')}</TabsTrigger>
            <TabsTrigger value="challenges">{t('training.challenges')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {renderOverview()}
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-6">
            {renderAchievements()}
          </TabsContent>
          
          <TabsContent value="leaderboard" className="space-y-6">
            {renderLeaderboard()}
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-6">
            {renderChallenges()}
          </TabsContent>
        </Tabs>
        
        {/* Celebration overlay */}
        {renderCelebration()}
        
        {/* Sound element */}
        <audio
          ref={soundRef}
          preload="auto"
          style={{ display: 'none' }}
        >
          <source src="/sounds/achievement.mp3" type="audio/mpeg" />
          <source src="/sounds/achievement.ogg" type="audio/ogg" />
        </audio>
      </div>
    </TooltipProvider>
  );
}

export default GamifiedProgressIndicators;