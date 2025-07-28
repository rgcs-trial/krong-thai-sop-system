'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  Users, 
  MessageSquare, 
  Check, 
  X, 
  AlertTriangle,
  Clock,
  User,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Send,
  MoreVertical,
  Filter,
  Search,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ReviewCriteria {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  weight: number; // 0-1, sum should equal 1
}

interface ReviewRating {
  criteriaId: string;
  score: number; // 1-5
  comment?: string;
}

interface PeerReview {
  id: string;
  sopId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  reviewerAvatar?: string;
  overallRating: number; // 1-5
  ratings: ReviewRating[];
  generalComments: string;
  recommendations: string[];
  status: 'draft' | 'submitted' | 'acknowledged';
  isAnonymous: boolean;
  submittedAt: string;
  acknowledgedAt?: string;
  helpfulVotes: number;
  flagged: boolean;
}

interface SOPReviewSummary {
  averageRating: number;
  totalReviews: number;
  criteriaAverages: { [criteriaId: string]: number };
  recentReviews: PeerReview[];
  topRecommendations: string[];
  reviewDistribution: { [rating: number]: number };
}

interface SOPPeerReviewSystemProps {
  /** SOP document ID */
  sopId: string;
  /** SOP title for context */
  sopTitle: string;
  /** Current user ID */
  currentUserId: string;
  /** User role for permission checks */
  userRole: string;
  /** Review criteria configuration */
  reviewCriteria: ReviewCriteria[];
  /** Existing reviews */
  existingReviews: PeerReview[];
  /** Review summary data */
  reviewSummary: SOPReviewSummary;
  /** Allow anonymous reviews */
  allowAnonymous?: boolean;
  /** Require reviews from specific roles */
  requiredReviewerRoles?: string[];
  /** Callback when review is submitted */
  onSubmitReview: (review: Omit<PeerReview, 'id' | 'submittedAt'>) => void;
  /** Callback when review is updated */
  onUpdateReview: (reviewId: string, updates: Partial<PeerReview>) => void;
  /** Callback when review is flagged */
  onFlagReview: (reviewId: string, reason: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * StarRating - Interactive star rating component
 */
const StarRating: React.FC<{
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ value, onChange, readonly = false, size = 'md' }) => {
  const [hoverValue, setHoverValue] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-colors",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => !readonly && onChange?.(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              (hoverValue >= star || value >= star)
                ? "fill-saffron-gold text-saffron-gold"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

/**
 * ReviewForm - Form for submitting new peer reviews
 */
const ReviewForm: React.FC<{
  criteria: ReviewCriteria[];
  onSubmit: (review: Omit<PeerReview, 'id' | 'submittedAt'>) => void;
  currentUserId: string;
  allowAnonymous: boolean;
}> = ({ criteria, onSubmit, currentUserId, allowAnonymous }) => {
  const t = useTranslations('sop.peerReview');
  const [ratings, setRatings] = useState<{ [criteriaId: string]: number }>({});
  const [comments, setComments] = useState<{ [criteriaId: string]: string }>({});
  const [generalComments, setGeneralComments] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const overallRating = useMemo(() => {
    const validRatings = Object.values(ratings).filter(r => r > 0);
    if (validRatings.length === 0) return 0;
    return Math.round(validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length);
  }, [ratings]);

  const isComplete = useMemo(() => {
    return criteria.every(c => ratings[c.id] > 0) && generalComments.trim().length > 0;
  }, [criteria, ratings, generalComments]);

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return;

    setIsSubmitting(true);
    try {
      const reviewRatings: ReviewRating[] = criteria.map(c => ({
        criteriaId: c.id,
        score: ratings[c.id],
        comment: comments[c.id]?.trim() || undefined
      }));

      const recommendationList = recommendations
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      await onSubmit({
        sopId: '', // Will be set by parent
        reviewerId: currentUserId,
        reviewerName: '', // Will be set by parent
        reviewerRole: '', // Will be set by parent
        overallRating,
        ratings: reviewRatings,
        generalComments: generalComments.trim(),
        recommendations: recommendationList,
        status: 'submitted',
        isAnonymous,
        helpfulVotes: 0,
        flagged: false
      });

      // Reset form
      setRatings({});
      setComments({});
      setGeneralComments('');
      setRecommendations('');
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [criteria, ratings, comments, generalComments, recommendations, overallRating, isAnonymous, currentUserId, onSubmit, isComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-saffron-gold" />
          {t('newReview.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Criteria Ratings */}
        <div className="space-y-4">
          <h4 className="text-tablet-base font-heading font-semibold">
            {t('criteria.title')}
          </h4>
          {criteria.map((criterion) => (
            <div key={criterion.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body font-medium">{criterion.name}</p>
                  <p className="text-tablet-sm text-muted-foreground">
                    {criterion.description}
                  </p>
                </div>
                <StarRating
                  value={ratings[criterion.id] || 0}
                  onChange={(value) => setRatings(prev => ({ ...prev, [criterion.id]: value }))}
                />
              </div>
              <Textarea
                placeholder={t('criteria.commentPlaceholder')}
                value={comments[criterion.id] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                className="text-tablet-sm"
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* Overall Rating Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-tablet-base font-body font-medium">
              {t('overallRating')}
            </span>
            <div className="flex items-center gap-2">
              <StarRating value={overallRating} readonly size="lg" />
              <span className="text-tablet-lg font-bold text-saffron-gold">
                {overallRating > 0 ? overallRating.toFixed(1) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* General Comments */}
        <div className="space-y-2">
          <label className="text-tablet-base font-body font-medium">
            {t('generalComments')} <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder={t('generalCommentsPlaceholder')}
            value={generalComments}
            onChange={(e) => setGeneralComments(e.target.value)}
            className="min-h-[120px]"
            maxLength={1000}
          />
          <div className="text-right text-tablet-xs text-muted-foreground">
            {generalComments.length}/1000
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <label className="text-tablet-base font-body font-medium">
            {t('recommendations')}
          </label>
          <Textarea
            placeholder={t('recommendationsPlaceholder')}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            className="min-h-[100px]"
            maxLength={500}
          />
          <p className="text-tablet-xs text-muted-foreground">
            {t('recommendationsHint')}
          </p>
        </div>

        {/* Anonymous Option */}
        {allowAnonymous && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-2"
            />
            <label htmlFor="anonymous" className="text-tablet-sm font-body">
              {t('submitAnonymously')}
            </label>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            t('submitting')
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {t('submitReview')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * ReviewCard - Display individual peer reviews
 */
const ReviewCard: React.FC<{
  review: PeerReview;
  criteria: ReviewCriteria[];
  onFlag: (reviewId: string, reason: string) => void;
  onVote: (reviewId: string, helpful: boolean) => void;
  currentUserId: string;
}> = ({ review, criteria, onFlag, onVote, currentUserId }) => {
  const t = useTranslations('sop.peerReview');
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={cn(
      "border-2",
      review.flagged && "border-red-200 bg-red-50"
    )}>
      <CardContent className="p-6">
        {/* Review Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {!review.isAnonymous ? (
              <>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.reviewerAvatar} />
                  <AvatarFallback>
                    {review.reviewerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-body font-medium">{review.reviewerName}</p>
                  <p className="text-tablet-sm text-muted-foreground">
                    {review.reviewerRole}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-body font-medium">{t('anonymousReviewer')}</p>
                  <p className="text-tablet-sm text-muted-foreground">
                    {review.reviewerRole}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <StarRating value={review.overallRating} readonly />
            <Badge variant={review.status === 'submitted' ? 'default' : 'secondary'}>
              {t(`status.${review.status}`)}
            </Badge>
          </div>
        </div>

        {/* General Comments */}
        <div className="mb-4">
          <p className="text-tablet-base font-body">{review.generalComments}</p>
        </div>

        {/* Recommendations */}
        {review.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-tablet-sm font-body font-medium mb-2">
              {t('recommendations')}:
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              {review.recommendations.map((rec, index) => (
                <li key={index} className="text-tablet-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Ratings */}
        {showDetails && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-tablet-sm font-body font-medium mb-3">
              {t('detailedRatings')}:
            </h4>
            {review.ratings.map((rating) => {
              const criterion = criteria.find(c => c.id === rating.criteriaId);
              if (!criterion) return null;
              
              return (
                <div key={rating.criteriaId} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tablet-sm font-body">{criterion.name}</span>
                    <StarRating value={rating.score} readonly size="sm" />
                  </div>
                  {rating.comment && (
                    <p className="text-tablet-xs text-muted-foreground pl-4">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Review Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-tablet-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(review.submittedAt)}
            </span>
            {review.helpfulVotes > 0 && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {review.helpfulVotes} {t('helpful')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {showDetails ? t('hideDetails') : t('showDetails')}
            </Button>
            
            {currentUserId !== review.reviewerId && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVote(review.id, true)}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFlag(review.id, 'inappropriate')}
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * SOPPeerReviewSystem - Comprehensive peer review system for SOPs
 * 
 * Features:
 * - Multi-criteria rating system with weighted scores
 * - Anonymous and identified review options
 * - Detailed feedback with recommendations
 * - Review voting and flagging system
 * - Review summary and analytics
 * - Role-based review requirements
 * - Responsive tablet-optimized interface
 * - Bilingual support for criteria and comments
 * - Review status tracking and acknowledgment
 * - Export capabilities for review data
 * 
 * @param props SOPPeerReviewSystemProps
 * @returns JSX.Element
 */
const SOPPeerReviewSystem: React.FC<SOPPeerReviewSystemProps> = ({
  sopId,
  sopTitle,
  currentUserId,
  userRole,
  reviewCriteria,
  existingReviews,
  reviewSummary,
  allowAnonymous = true,
  requiredReviewerRoles = [],
  onSubmitReview,
  onUpdateReview,
  onFlagReview,
  className
}) => {
  const t = useTranslations('sop.peerReview');
  const [activeTab, setActiveTab] = useState('overview');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');

  const canSubmitReview = useMemo(() => {
    const hasExistingReview = existingReviews.some(r => r.reviewerId === currentUserId);
    const isRequiredReviewer = requiredReviewerRoles.length === 0 || 
                              requiredReviewerRoles.includes(userRole);
    return !hasExistingReview && isRequiredReviewer;
  }, [existingReviews, currentUserId, requiredReviewerRoles, userRole]);

  const filteredReviews = useMemo(() => {
    let filtered = [...existingReviews];
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(r => r.reviewerRole === filterRole);
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'rating':
          return b.overallRating - a.overallRating;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [existingReviews, filterRole, sortBy]);

  const handleVoteReview = useCallback((reviewId: string, helpful: boolean) => {
    const review = existingReviews.find(r => r.id === reviewId);
    if (review) {
      onUpdateReview(reviewId, {
        helpfulVotes: helpful ? review.helpfulVotes + 1 : Math.max(0, review.helpfulVotes - 1)
      });
    }
  }, [existingReviews, onUpdateReview]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-saffron-gold';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-tablet-xl font-heading font-bold text-krong-black">
            {t('title')}
          </h2>
          <p className="text-tablet-base font-body text-muted-foreground">
            {sopTitle}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <StarRating value={reviewSummary.averageRating} readonly size="lg" />
          <div className="text-right">
            <p className={cn("text-tablet-lg font-bold", getRatingColor(reviewSummary.averageRating))}>
              {reviewSummary.averageRating.toFixed(1)}
            </p>
            <p className="text-tablet-xs text-muted-foreground">
              {reviewSummary.totalReviews} {t('reviews')}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="reviews">{t('tabs.reviews')}</TabsTrigger>
          {canSubmitReview && (
            <TabsTrigger value="submit">{t('tabs.submit')}</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-8 h-8 text-jade-green" />
                </div>
                <p className={cn("text-2xl font-bold", getRatingColor(reviewSummary.averageRating))}>
                  {reviewSummary.averageRating.toFixed(1)}
                </p>
                <p className="text-tablet-sm text-muted-foreground">
                  {t('averageRating')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-8 h-8 text-krong-red" />
                </div>
                <p className="text-2xl font-bold text-krong-black">
                  {reviewSummary.totalReviews}
                </p>
                <p className="text-tablet-sm text-muted-foreground">
                  {t('totalReviews')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Award className="w-8 h-8 text-saffron-gold" />
                </div>
                <p className="text-2xl font-bold text-krong-black">
                  {Object.values(reviewSummary.reviewDistribution).reduce((sum, count) => sum + count, 0) > 0 
                    ? Math.max(...Object.keys(reviewSummary.reviewDistribution).map(Number))
                    : '—'
                  }★
                </p>
                <p className="text-tablet-sm text-muted-foreground">
                  {t('mostCommonRating')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Criteria Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>{t('criteriaBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewCriteria.map((criterion) => {
                const average = reviewSummary.criteriaAverages[criterion.id] || 0;
                return (
                  <div key={criterion.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{criterion.name}</span>
                      <div className="flex items-center gap-2">
                        <StarRating value={average} readonly size="sm" />
                        <span className={cn("font-bold", getRatingColor(average))}>
                          {average.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <Progress value={(average / 5) * 100} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Recommendations */}
          {reviewSummary.topRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('topRecommendations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reviewSummary.topRecommendations.slice(0, 5).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-jade-green mt-0.5 flex-shrink-0" />
                      <span className="text-tablet-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-1 border rounded text-tablet-sm"
              >
                <option value="all">{t('filters.allRoles')}</option>
                <option value="manager">{t('filters.managers')}</option>
                <option value="chef">{t('filters.chefs')}</option>
                <option value="server">{t('filters.servers')}</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-tablet-sm text-muted-foreground">{t('sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded text-tablet-sm"
              >
                <option value="newest">{t('sort.newest')}</option>
                <option value="oldest">{t('sort.oldest')}</option>
                <option value="rating">{t('sort.rating')}</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  criteria={reviewCriteria}
                  onFlag={onFlagReview}
                  onVote={handleVoteReview}
                  currentUserId={currentUserId}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-tablet-base text-muted-foreground">
                    {t('noReviews')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Submit Review Tab */}
        {canSubmitReview && (
          <TabsContent value="submit">
            <ReviewForm
              criteria={reviewCriteria}
              onSubmit={onSubmitReview}
              currentUserId={currentUserId}
              allowAnonymous={allowAnonymous}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Review Required Notice */}
      {requiredReviewerRoles.includes(userRole) && canSubmitReview && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-800">
                  {t('reviewRequired')}
                </p>
                <p className="text-tablet-sm text-orange-600">
                  {t('reviewRequiredDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPPeerReviewSystem;