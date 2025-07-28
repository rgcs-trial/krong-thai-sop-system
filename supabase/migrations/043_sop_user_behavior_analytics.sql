-- Restaurant Krong Thai SOP Management System
-- SOP User Behavior Analytics Tables
-- Migration 043: Advanced user behavior tracking for business intelligence
-- Created: 2025-07-28

-- ===========================================
-- USER BEHAVIOR ANALYTICS ENUMS
-- ===========================================

-- User interaction types
CREATE TYPE user_interaction_type AS ENUM (
    'view', 'search', 'filter', 'bookmark', 'share', 'print', 'download',
    'comment', 'rating', 'completion', 'exit', 'idle', 'scroll', 'click',
    'voice_command', 'translation_toggle', 'category_browse', 'step_completion'
);

-- Engagement levels
CREATE TYPE engagement_level AS ENUM ('low', 'medium', 'high', 'very_high');

-- Session types
CREATE TYPE session_type AS ENUM (
    'work_shift', 'training', 'reference', 'emergency', 'audit', 'maintenance'
);

-- Device types
CREATE TYPE device_category AS ENUM (
    'tablet', 'smartphone', 'desktop', 'kiosk', 'smart_display', 'other'
);

-- User activity patterns
CREATE TYPE activity_pattern AS ENUM (
    'morning_peak', 'lunch_rush', 'evening_peak', 'late_night', 'weekend', 'holiday'
);

-- ===========================================
-- USER BEHAVIOR TRACKING TABLES
-- ===========================================

-- User interaction events with detailed context
CREATE TABLE IF NOT EXISTS sop_user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Interaction details
    interaction_type user_interaction_type NOT NULL,
    sop_document_id UUID,
    sop_category_id UUID,
    interaction_timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0,
    
    -- Context information
    page_url TEXT,
    referrer_url TEXT,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    screen_resolution VARCHAR(20),
    browser_language VARCHAR(10),
    
    -- Interaction specifics
    interaction_details JSONB DEFAULT '{}', -- Click coordinates, search terms, filters used, etc.
    element_clicked VARCHAR(255), -- CSS selector or element ID
    scroll_depth_percentage DECIMAL(5,2) DEFAULT 0,
    time_on_element_seconds INTEGER DEFAULT 0,
    
    -- SOP-specific context
    sop_step_number INTEGER,
    sop_completion_percentage DECIMAL(5,2) DEFAULT 0,
    translation_language CHAR(2), -- 'en' or 'fr'
    voice_command_used BOOLEAN DEFAULT false,
    
    -- User state
    user_role VARCHAR(50),
    shift_type VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'night'
    work_station VARCHAR(100),
    team_size INTEGER,
    
    -- Performance metrics
    page_load_time_ms INTEGER,
    response_time_ms INTEGER,
    error_occurred BOOLEAN DEFAULT false,
    error_details JSONB DEFAULT '{}',
    
    -- Behavioral indicators
    is_repeat_visit BOOLEAN DEFAULT false,
    visits_today INTEGER DEFAULT 1,
    time_since_last_visit_minutes INTEGER,
    
    -- Quality scores
    interaction_quality_score DECIMAL(4,2) DEFAULT 100, -- 0-100
    engagement_score DECIMAL(4,2) DEFAULT 50, -- 0-100
    attention_score DECIMAL(4,2) DEFAULT 50, -- 0-100
    
    CONSTRAINT fk_user_interaction_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_interaction_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_interaction_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT fk_user_interaction_category FOREIGN KEY (sop_category_id) REFERENCES sop_categories(id),
    CONSTRAINT valid_completion_percentage CHECK (sop_completion_percentage >= 0 AND sop_completion_percentage <= 100)
);

-- User behavior sessions with aggregated metrics
CREATE TABLE IF NOT EXISTS sop_user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    
    -- Session timing
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    duration_minutes INTEGER,
    active_time_minutes INTEGER, -- Time actually engaged
    idle_time_minutes INTEGER,
    
    -- Session context
    session_type session_type DEFAULT 'work_shift',
    device_category device_category DEFAULT 'tablet',
    device_model VARCHAR(100),
    operating_system VARCHAR(50),
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    
    -- Location and environment
    ip_address INET,
    location_coordinates POINT,
    work_area VARCHAR(100), -- Kitchen, bar, dining, etc.
    shift_start_time TIME,
    shift_end_time TIME,
    
    -- Session activity metrics
    total_interactions INTEGER DEFAULT 0,
    unique_sops_viewed INTEGER DEFAULT 0,
    sops_completed INTEGER DEFAULT 0,
    searches_performed INTEGER DEFAULT 0,
    bookmarks_created INTEGER DEFAULT 0,
    
    -- Engagement metrics
    average_time_per_sop_seconds DECIMAL(8,2) DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of single-interaction visits
    pages_per_session DECIMAL(5,2) DEFAULT 0,
    scroll_depth_average DECIMAL(5,2) DEFAULT 0,
    
    -- Language and accessibility
    primary_language CHAR(2) DEFAULT 'en',
    language_switches INTEGER DEFAULT 0,
    voice_commands_used INTEGER DEFAULT 0,
    accessibility_features JSONB DEFAULT '{}',
    
    -- Performance indicators
    average_page_load_time_ms DECIMAL(8,2) DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    network_latency_ms DECIMAL(8,2) DEFAULT 0,
    offline_periods_minutes INTEGER DEFAULT 0,
    
    -- Behavioral patterns
    activity_pattern activity_pattern,
    engagement_level engagement_level DEFAULT 'medium',
    focus_score DECIMAL(4,2) DEFAULT 50, -- 0-100
    efficiency_score DECIMAL(4,2) DEFAULT 50, -- 0-100
    
    -- Session outcomes
    goals_achieved INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    training_modules_finished INTEGER DEFAULT 0,
    certifications_earned INTEGER DEFAULT 0,
    
    -- Quality metrics
    session_satisfaction_score INTEGER, -- 1-5 rating if provided
    reported_issues INTEGER DEFAULT 0,
    feedback_provided BOOLEAN DEFAULT false,
    
    CONSTRAINT fk_user_session_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_session_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT valid_session_duration CHECK (session_end IS NULL OR session_end >= session_start),
    CONSTRAINT valid_active_time CHECK (active_time_minutes IS NULL OR active_time_minutes <= duration_minutes)
);

-- User behavior patterns and preferences
CREATE TABLE IF NOT EXISTS sop_user_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Pattern identification
    pattern_type VARCHAR(100) NOT NULL, -- 'usage_frequency', 'time_preference', 'content_preference', etc.
    pattern_name VARCHAR(255),
    pattern_description TEXT,
    confidence_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    -- Pattern data
    pattern_data JSONB NOT NULL, -- Flexible structure for different pattern types
    statistical_metrics JSONB DEFAULT '{}', -- Mean, median, std dev, etc.
    trend_direction VARCHAR(20), -- 'increasing', 'decreasing', 'stable', 'cyclical'
    
    -- Time-based patterns
    time_window_start TIMESTAMPTZ,
    time_window_end TIMESTAMPTZ,
    recurrence_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'seasonal'
    peak_hours INTEGER[], -- Array of hours (0-23) when user is most active
    
    -- Content preferences
    preferred_sop_categories UUID[], -- Array of category IDs
    preferred_language CHAR(2) DEFAULT 'en',
    preferred_content_format VARCHAR(50), -- 'text', 'video', 'audio', 'interactive'
    learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'reading'
    
    -- Usage patterns
    average_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
    typical_tasks_per_session INTEGER DEFAULT 0,
    preferred_device_type device_category DEFAULT 'tablet',
    most_active_time_of_day TIME,
    most_active_day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    
    -- Performance patterns
    completion_rate_trend DECIMAL(5,2) DEFAULT 0, -- Percentage change over time
    efficiency_improvement_rate DECIMAL(5,2) DEFAULT 0,
    error_frequency_trend DECIMAL(5,2) DEFAULT 0,
    help_seeking_frequency DECIMAL(5,2) DEFAULT 0,
    
    -- Behavioral indicators
    attention_span_minutes DECIMAL(8,2) DEFAULT 0,
    multitasking_tendency DECIMAL(4,2) DEFAULT 0, -- 0-100
    exploration_vs_efficiency_score DECIMAL(4,2) DEFAULT 50, -- 0=efficiency focused, 100=exploration focused
    social_interaction_preference DECIMAL(4,2) DEFAULT 50, -- 0-100
    
    -- Prediction and recommendations
    next_likely_actions JSONB DEFAULT '{}', -- Array of predicted actions with probabilities
    recommended_content UUID[], -- Array of SOP document IDs
    training_recommendations JSONB DEFAULT '{}',
    
    -- Pattern lifecycle
    first_observed_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    observation_count INTEGER DEFAULT 1,
    pattern_strength DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    -- Validation and quality
    is_validated BOOLEAN DEFAULT false,
    validation_method VARCHAR(100),
    false_positive_risk DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    CONSTRAINT fk_behavior_pattern_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_behavior_pattern_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_pattern_type UNIQUE (restaurant_id, user_id, pattern_type),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- User engagement analytics with time-series data
CREATE TABLE IF NOT EXISTS sop_user_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Time window
    measurement_date DATE NOT NULL,
    measurement_hour INTEGER NOT NULL, -- 0-23
    measurement_interval VARCHAR(20) DEFAULT 'hourly', -- 'hourly', 'daily', 'weekly'
    
    -- Core engagement metrics
    total_interactions INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    total_session_time_minutes INTEGER DEFAULT 0,
    active_engagement_time_minutes INTEGER DEFAULT 0,
    
    -- Content engagement
    sops_viewed INTEGER DEFAULT 0,
    sops_completed INTEGER DEFAULT 0,
    content_depth_score DECIMAL(4,2) DEFAULT 0, -- How deeply users engage with content
    interaction_diversity_score DECIMAL(4,2) DEFAULT 0, -- Variety of interaction types
    
    -- User activity intensity
    clicks_per_minute DECIMAL(6,2) DEFAULT 0,
    scrolls_per_minute DECIMAL(6,2) DEFAULT 0,
    searches_per_session DECIMAL(6,2) DEFAULT 0,
    pages_per_session DECIMAL(6,2) DEFAULT 0,
    
    -- Quality indicators
    task_completion_rate DECIMAL(5,2) DEFAULT 0, -- 0-100
    error_rate DECIMAL(5,2) DEFAULT 0, -- 0-100
    help_request_rate DECIMAL(5,2) DEFAULT 0, -- 0-100
    satisfaction_indicators JSONB DEFAULT '{}',
    
    -- Attention and focus metrics
    average_attention_span_seconds DECIMAL(8,2) DEFAULT 0,
    distraction_events INTEGER DEFAULT 0,
    multitasking_detected INTEGER DEFAULT 0,
    focus_interruptions INTEGER DEFAULT 0,
    
    -- Learning and progression
    new_content_accessed INTEGER DEFAULT 0,
    repeat_content_accessed INTEGER DEFAULT 0,
    skill_progression_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    knowledge_retention_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    -- Social and collaborative metrics
    content_shared INTEGER DEFAULT 0,
    collaboration_events INTEGER DEFAULT 0,
    peer_interactions INTEGER DEFAULT 0,
    mentor_interactions INTEGER DEFAULT 0,
    
    -- Device and technical metrics
    device_switches INTEGER DEFAULT 0,
    offline_interactions INTEGER DEFAULT 0,
    sync_conflicts INTEGER DEFAULT 0,
    technical_issues INTEGER DEFAULT 0,
    
    -- Contextual factors
    work_environment_factors JSONB DEFAULT '{}', -- Noise level, lighting, crowding, etc.
    task_complexity_average DECIMAL(4,2) DEFAULT 0, -- 0-100
    stress_indicators JSONB DEFAULT '{}',
    interruption_frequency DECIMAL(6,2) DEFAULT 0,
    
    -- Calculated composite scores
    overall_engagement_score DECIMAL(4,2) DEFAULT 0, -- 0-100 composite score
    productivity_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    learning_effectiveness_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    user_experience_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    -- Trend indicators
    engagement_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
    performance_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_engagement_metrics_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_engagement_metrics_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_time_measurement UNIQUE (restaurant_id, user_id, measurement_date, measurement_hour),
    CONSTRAINT valid_hour_range CHECK (measurement_hour >= 0 AND measurement_hour <= 23)
);

-- User journey mapping and flow analysis
CREATE TABLE IF NOT EXISTS sop_user_journey_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Journey identification
    journey_name VARCHAR(255), -- 'sop_completion', 'training_path', 'problem_resolution'
    journey_type VARCHAR(100) NOT NULL,
    journey_start_timestamp TIMESTAMPTZ NOT NULL,
    journey_end_timestamp TIMESTAMPTZ,
    
    -- Journey structure
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 1,
    step_sequence INTEGER[] DEFAULT '{}', -- Array of step IDs in order
    
    -- Journey flow data
    flow_path JSONB NOT NULL, -- Detailed path with timestamps and actions
    decision_points JSONB DEFAULT '{}', -- Points where user made choices
    backtrack_events INTEGER DEFAULT 0,
    loops_detected INTEGER DEFAULT 0,
    
    -- Time analysis
    total_journey_time_minutes INTEGER DEFAULT 0,
    active_time_minutes INTEGER DEFAULT 0,
    idle_time_minutes INTEGER DEFAULT 0,
    time_per_step_average_seconds DECIMAL(8,2) DEFAULT 0,
    
    -- Journey outcomes
    completion_status VARCHAR(50) DEFAULT 'in_progress', -- 'completed', 'abandoned', 'in_progress'
    abandonment_point INTEGER, -- Step number where user left
    abandonment_reason VARCHAR(255),
    success_metrics JSONB DEFAULT '{}',
    
    -- Efficiency metrics
    optimal_path_deviation_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    efficiency_score DECIMAL(4,2) DEFAULT 0, -- 0-100
    help_requests_during_journey INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    
    -- Contextual factors
    interruptions_during_journey INTEGER DEFAULT 0,
    device_changes INTEGER DEFAULT 0,
    network_issues INTEGER DEFAULT 0,
    concurrent_tasks INTEGER DEFAULT 0,
    
    -- Learning and adaptation
    previous_journey_count INTEGER DEFAULT 0,
    improvement_from_previous DECIMAL(5,2) DEFAULT 0, -- Percentage improvement
    learning_curve_position DECIMAL(4,2) DEFAULT 0, -- 0-100
    
    -- Journey quality
    user_frustration_indicators JSONB DEFAULT '{}',
    satisfaction_rating INTEGER, -- 1-5 if provided
    difficulty_rating INTEGER, -- 1-5 if provided
    clarity_rating INTEGER, -- 1-5 if provided
    
    CONSTRAINT fk_journey_flow_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_journey_flow_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    CONSTRAINT valid_journey_duration CHECK (journey_end_timestamp IS NULL OR journey_end_timestamp >= journey_start_timestamp),
    CONSTRAINT valid_step_counts CHECK (completed_steps <= total_steps)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- User interactions indexes
CREATE INDEX idx_user_interactions_restaurant_user ON sop_user_interactions(restaurant_id, user_id);
CREATE INDEX idx_user_interactions_timestamp ON sop_user_interactions(interaction_timestamp);
CREATE INDEX idx_user_interactions_session ON sop_user_interactions(session_id);
CREATE INDEX idx_user_interactions_sop ON sop_user_interactions(sop_document_id);
CREATE INDEX idx_user_interactions_type ON sop_user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_device ON sop_user_interactions USING GIN(device_info);

-- User sessions indexes
CREATE INDEX idx_user_sessions_restaurant_user ON sop_user_sessions(restaurant_id, user_id);
CREATE INDEX idx_user_sessions_start_time ON sop_user_sessions(session_start);
CREATE INDEX idx_user_sessions_duration ON sop_user_sessions(duration_minutes);
CREATE INDEX idx_user_sessions_type ON sop_user_sessions(session_type);
CREATE INDEX idx_user_sessions_engagement ON sop_user_sessions(engagement_level);
CREATE INDEX idx_user_sessions_device ON sop_user_sessions(device_category);

-- Behavior patterns indexes
CREATE INDEX idx_behavior_patterns_restaurant_user ON sop_user_behavior_patterns(restaurant_id, user_id);
CREATE INDEX idx_behavior_patterns_type ON sop_user_behavior_patterns(pattern_type);
CREATE INDEX idx_behavior_patterns_confidence ON sop_user_behavior_patterns(confidence_score);
CREATE INDEX idx_behavior_patterns_updated ON sop_user_behavior_patterns(last_updated_at);
CREATE INDEX idx_behavior_patterns_data ON sop_user_behavior_patterns USING GIN(pattern_data);

-- Engagement metrics indexes
CREATE INDEX idx_engagement_metrics_restaurant_user ON sop_user_engagement_metrics(restaurant_id, user_id);
CREATE INDEX idx_engagement_metrics_date ON sop_user_engagement_metrics(measurement_date, measurement_hour);
CREATE INDEX idx_engagement_metrics_score ON sop_user_engagement_metrics(overall_engagement_score);
CREATE INDEX idx_engagement_metrics_trend ON sop_user_engagement_metrics(engagement_trend);

-- Journey flows indexes
CREATE INDEX idx_journey_flows_restaurant_user ON sop_user_journey_flows(restaurant_id, user_id);
CREATE INDEX idx_journey_flows_session ON sop_user_journey_flows(session_id);
CREATE INDEX idx_journey_flows_type ON sop_user_journey_flows(journey_type);
CREATE INDEX idx_journey_flows_status ON sop_user_journey_flows(completion_status);
CREATE INDEX idx_journey_flows_start_time ON sop_user_journey_flows(journey_start_timestamp);

-- Composite indexes for analytics queries
CREATE INDEX idx_user_behavior_analytics_composite ON sop_user_interactions(restaurant_id, interaction_timestamp, interaction_type, user_id);
CREATE INDEX idx_user_engagement_time_series ON sop_user_engagement_metrics(restaurant_id, measurement_date, measurement_hour, user_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on user behavior analytics tables
ALTER TABLE sop_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_user_journey_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "User interactions restaurant access"
ON sop_user_interactions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "User sessions restaurant access"
ON sop_user_sessions FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Behavior patterns restaurant access"
ON sop_user_behavior_patterns FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Engagement metrics restaurant access"
ON sop_user_engagement_metrics FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Journey flows restaurant access"
ON sop_user_journey_flows FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Function to update user behavior patterns automatically
CREATE OR REPLACE FUNCTION update_user_behavior_patterns()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user behavior patterns based on new interactions
    INSERT INTO sop_user_behavior_patterns (
        restaurant_id,
        user_id,
        pattern_type,
        pattern_name,
        pattern_data,
        confidence_score,
        last_updated_at
    )
    SELECT 
        NEW.restaurant_id,
        NEW.user_id,
        'interaction_frequency',
        'Daily Interaction Pattern',
        jsonb_build_object(
            'interactions_today', COUNT(*),
            'most_common_type', mode() WITHIN GROUP (ORDER BY interaction_type),
            'average_duration', AVG(duration_seconds),
            'last_interaction', NOW()
        ),
        LEAST(100, COUNT(*) * 10), -- Simple confidence calculation
        NOW()
    FROM sop_user_interactions
    WHERE restaurant_id = NEW.restaurant_id 
      AND user_id = NEW.user_id
      AND interaction_timestamp >= CURRENT_DATE
    GROUP BY restaurant_id, user_id
    ON CONFLICT (restaurant_id, user_id, pattern_type)
    DO UPDATE SET
        pattern_data = EXCLUDED.pattern_data,
        confidence_score = EXCLUDED.confidence_score,
        last_updated_at = NOW(),
        observation_count = sop_user_behavior_patterns.observation_count + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update patterns on new interactions
CREATE TRIGGER update_behavior_patterns_on_interaction
    AFTER INSERT ON sop_user_interactions
    FOR EACH ROW EXECUTE FUNCTION update_user_behavior_patterns();

-- Function to calculate engagement scores
CREATE OR REPLACE FUNCTION calculate_user_engagement_score(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_date DATE,
    p_hour INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    engagement_score DECIMAL DEFAULT 0;
    interaction_score DECIMAL DEFAULT 0;
    completion_score DECIMAL DEFAULT 0;
    time_score DECIMAL DEFAULT 0;
    quality_score DECIMAL DEFAULT 0;
BEGIN
    -- Calculate interaction-based score (0-25 points)
    SELECT LEAST(25, COUNT(*) * 2) INTO interaction_score
    FROM sop_user_interactions
    WHERE restaurant_id = p_restaurant_id
      AND user_id = p_user_id
      AND interaction_timestamp::date = p_date
      AND EXTRACT(hour FROM interaction_timestamp) = p_hour;
    
    -- Calculate completion-based score (0-25 points)
    SELECT LEAST(25, COUNT(*) * 5) INTO completion_score
    FROM sop_user_interactions
    WHERE restaurant_id = p_restaurant_id
      AND user_id = p_user_id
      AND interaction_timestamp::date = p_date
      AND EXTRACT(hour FROM interaction_timestamp) = p_hour
      AND interaction_type = 'completion';
    
    -- Calculate time-based score (0-25 points)
    SELECT LEAST(25, AVG(duration_seconds) / 60) INTO time_score
    FROM sop_user_interactions
    WHERE restaurant_id = p_restaurant_id
      AND user_id = p_user_id
      AND interaction_timestamp::date = p_date
      AND EXTRACT(hour FROM interaction_timestamp) = p_hour
      AND duration_seconds > 0;
    
    -- Calculate quality-based score (0-25 points)
    SELECT LEAST(25, AVG(COALESCE(interaction_quality_score, 100)) / 4) INTO quality_score
    FROM sop_user_interactions
    WHERE restaurant_id = p_restaurant_id
      AND user_id = p_user_id
      AND interaction_timestamp::date = p_date
      AND EXTRACT(hour FROM interaction_timestamp) = p_hour;
    
    engagement_score := COALESCE(interaction_score, 0) + 
                       COALESCE(completion_score, 0) + 
                       COALESCE(time_score, 0) + 
                       COALESCE(quality_score, 0);
    
    RETURN LEAST(100, engagement_score);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ANALYTICS FUNCTIONS
-- ===========================================

-- Function to get user behavior summary
CREATE OR REPLACE FUNCTION get_user_behavior_summary(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_interactions BIGINT,
    unique_sessions BIGINT,
    avg_session_duration DECIMAL,
    top_interaction_type TEXT,
    engagement_trend TEXT,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH interaction_stats AS (
        SELECT 
            COUNT(*) as interactions,
            COUNT(DISTINCT session_id) as sessions,
            AVG(EXTRACT(epoch FROM (
                SELECT MAX(interaction_timestamp) - MIN(interaction_timestamp)
                FROM sop_user_interactions ui2
                WHERE ui2.session_id = ui.session_id
            )) / 60) as avg_duration,
            mode() WITHIN GROUP (ORDER BY interaction_type) as top_type
        FROM sop_user_interactions ui
        WHERE restaurant_id = p_restaurant_id
          AND user_id = p_user_id
          AND interaction_timestamp >= NOW() - INTERVAL '1 day' * p_days_back
    ),
    completion_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE interaction_type = 'completion')::DECIMAL / 
            NULLIF(COUNT(*) FILTER (WHERE interaction_type = 'view'), 0) * 100 as comp_rate
        FROM sop_user_interactions
        WHERE restaurant_id = p_restaurant_id
          AND user_id = p_user_id
          AND interaction_timestamp >= NOW() - INTERVAL '1 day' * p_days_back
    ),
    trend_stats AS (
        SELECT 
            CASE 
                WHEN COUNT(*) > LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', interaction_timestamp))
                THEN 'increasing'
                WHEN COUNT(*) < LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', interaction_timestamp))
                THEN 'decreasing'
                ELSE 'stable'
            END as trend
        FROM sop_user_interactions
        WHERE restaurant_id = p_restaurant_id
          AND user_id = p_user_id
          AND interaction_timestamp >= NOW() - INTERVAL '1 day' * p_days_back
        GROUP BY DATE_TRUNC('day', interaction_timestamp)
        ORDER BY DATE_TRUNC('day', interaction_timestamp) DESC
        LIMIT 1
    )
    SELECT 
        i.interactions,
        i.sessions,
        i.avg_duration,
        i.top_type,
        COALESCE(t.trend, 'stable'),
        COALESCE(c.comp_rate, 0)
    FROM interaction_stats i
    CROSS JOIN completion_stats c
    CROSS JOIN trend_stats t;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_user_interactions IS 'Detailed user interaction events with context for behavioral analysis';
COMMENT ON TABLE sop_user_sessions IS 'Aggregated user session metrics with engagement and performance indicators';
COMMENT ON TABLE sop_user_behavior_patterns IS 'Identified user behavior patterns and preferences for personalization';
COMMENT ON TABLE sop_user_engagement_metrics IS 'Time-series engagement metrics for trend analysis and reporting';
COMMENT ON TABLE sop_user_journey_flows IS 'User journey mapping and flow analysis for UX optimization';

-- Performance optimization
ANALYZE sop_user_interactions;
ANALYZE sop_user_sessions;
ANALYZE sop_user_behavior_patterns;
ANALYZE sop_user_engagement_metrics;
ANALYZE sop_user_journey_flows;