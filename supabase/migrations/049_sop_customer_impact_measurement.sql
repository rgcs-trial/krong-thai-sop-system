-- Restaurant Krong Thai SOP Management System
-- SOP Customer Impact Measurement Tables
-- Migration 049: Customer impact measurement with satisfaction correlation
-- Created: 2025-07-28

-- ===========================================
-- CUSTOMER IMPACT ENUMS
-- ===========================================

-- Customer satisfaction levels
CREATE TYPE customer_satisfaction_level AS ENUM ('very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied');

-- Customer interaction types
CREATE TYPE customer_interaction_type AS ENUM (
    'dining_experience', 'service_interaction', 'order_taking', 'food_delivery', 
    'complaint_handling', 'special_request', 'payment_processing', 'reservation_handling'
);

-- Impact measurement methods
CREATE TYPE impact_measurement_method AS ENUM (
    'direct_survey', 'observation', 'feedback_analysis', 'wait_time_measurement', 
    'quality_assessment', 'behavioral_analysis', 'social_media_monitoring', 'mystery_shopper'
);

-- Customer touchpoint categories
CREATE TYPE customer_touchpoint AS ENUM (
    'entrance_greeting', 'seating_process', 'menu_presentation', 'order_taking', 
    'food_preparation_visibility', 'food_service', 'dining_ambiance', 'payment_process', 
    'departure_farewell', 'complaint_resolution', 'special_occasion_handling'
);

-- Business impact dimensions
CREATE TYPE business_impact_dimension AS ENUM (
    'revenue', 'customer_retention', 'word_of_mouth', 'brand_reputation', 
    'operational_efficiency', 'cost_reduction', 'market_share', 'competitive_advantage'
);

-- ===========================================
-- CUSTOMER IMPACT MEASUREMENT TABLES
-- ===========================================

-- Customer satisfaction tracking linked to SOP execution
CREATE TABLE IF NOT EXISTS sop_customer_satisfaction_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Customer identification (anonymized for privacy)
    customer_session_id UUID NOT NULL, -- Anonymous session tracking
    customer_demographic_segment VARCHAR(100), -- age_group, dining_frequency, etc.
    party_size INTEGER DEFAULT 1,
    customer_type VARCHAR(50) DEFAULT 'walk_in', -- walk_in, reservation, delivery, takeout
    
    -- Visit context
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    day_of_week VARCHAR(10) GENERATED ALWAYS AS (
        TO_CHAR(visit_date, 'Day')
    ) STORED,
    is_peak_hour BOOLEAN DEFAULT false,
    is_weekend BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(DOW FROM visit_date) IN (0, 6)
    ) STORED,
    
    -- SOP correlation tracking
    relevant_sop_executions UUID[], -- Array of SOP executions that could impact this customer
    primary_service_sops UUID[], -- Main SOPs that directly served this customer
    background_operational_sops UUID[], -- SOPs running in background affecting experience
    sop_compliance_score DECIMAL(5,2) DEFAULT 100, -- How well SOPs were executed for this customer
    
    -- Satisfaction measurements
    overall_satisfaction_rating customer_satisfaction_level NOT NULL,
    overall_satisfaction_score DECIMAL(5,2) NOT NULL, -- 0-100 numeric score
    
    -- Detailed satisfaction dimensions
    service_speed_satisfaction DECIMAL(5,2) DEFAULT 50,
    service_quality_satisfaction DECIMAL(5,2) DEFAULT 50,
    food_quality_satisfaction DECIMAL(5,2) DEFAULT 50,
    staff_friendliness_satisfaction DECIMAL(5,2) DEFAULT 50,
    ambiance_satisfaction DECIMAL(5,2) DEFAULT 50,
    value_for_money_satisfaction DECIMAL(5,2) DEFAULT 50,
    cleanliness_satisfaction DECIMAL(5,2) DEFAULT 50,
    
    -- Specific touchpoint ratings
    greeting_satisfaction DECIMAL(5,2) DEFAULT 50,
    seating_satisfaction DECIMAL(5,2) DEFAULT 50,
    ordering_satisfaction DECIMAL(5,2) DEFAULT 50,
    food_delivery_satisfaction DECIMAL(5,2) DEFAULT 50,
    payment_satisfaction DECIMAL(5,2) DEFAULT 50,
    farewell_satisfaction DECIMAL(5,2) DEFAULT 50,
    
    -- Behavioral indicators
    wait_time_tolerance DECIMAL(5,2) DEFAULT 50, -- How well customer handled wait times
    complaint_satisfaction DECIMAL(5,2), -- If complaint was made, how satisfied with resolution
    special_request_satisfaction DECIMAL(5,2), -- If special request was made
    recommendation_likelihood DECIMAL(5,2) DEFAULT 50, -- Net Promoter Score equivalent
    return_intent DECIMAL(5,2) DEFAULT 50, -- Likelihood to return
    
    -- Experience quality metrics
    experience_exceeded_expectations BOOLEAN DEFAULT false,
    experience_met_expectations BOOLEAN DEFAULT true,
    experience_below_expectations BOOLEAN DEFAULT false,
    memorable_positive_moments TEXT[],
    areas_for_improvement TEXT[],
    specific_compliments TEXT[],
    specific_complaints TEXT[],
    
    -- Contextual factors affecting satisfaction
    weather_impact DECIMAL(5,2) DEFAULT 0, -- Weather effect on experience
    special_occasion BOOLEAN DEFAULT false, -- Birthday, anniversary, etc.
    first_time_customer BOOLEAN DEFAULT false,
    repeat_customer_frequency VARCHAR(50), -- weekly, monthly, occasionally
    comparison_with_competitors TEXT,
    
    -- Business impact indicators
    total_spend_amount DECIMAL(10,2) DEFAULT 0,
    tip_percentage DECIMAL(5,2) DEFAULT 15,
    additional_purchases BOOLEAN DEFAULT false, -- Dessert, drinks, etc.
    social_media_mention BOOLEAN DEFAULT false,
    referred_other_customers BOOLEAN DEFAULT false,
    
    -- Measurement metadata
    measurement_method impact_measurement_method NOT NULL,
    data_collection_timestamp TIMESTAMPTZ DEFAULT NOW(),
    survey_response_time_seconds INTEGER,
    response_completeness_percentage DECIMAL(5,2) DEFAULT 100,
    data_quality_score DECIMAL(5,2) DEFAULT 100,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_customer_satisfaction_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT valid_satisfaction_score CHECK (overall_satisfaction_score >= 0 AND overall_satisfaction_score <= 100),
    CONSTRAINT unique_customer_session UNIQUE (restaurant_id, customer_session_id, visit_date, visit_time)
);

-- SOP-Customer Impact Correlation Analysis
CREATE TABLE IF NOT EXISTS sop_customer_impact_correlation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    sop_document_id UUID NOT NULL,
    
    -- Analysis period
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly, monthly
    
    -- Customer impact metrics
    customers_affected_count INTEGER DEFAULT 0,
    customers_directly_served INTEGER DEFAULT 0,
    customers_indirectly_affected INTEGER DEFAULT 0,
    
    -- Satisfaction correlation
    average_satisfaction_score DECIMAL(5,2) DEFAULT 50,
    satisfaction_impact_coefficient DECIMAL(8,4) DEFAULT 0, -- Correlation coefficient
    satisfaction_significance_level DECIMAL(8,4) DEFAULT 1, -- P-value equivalent
    
    -- Specific impact dimensions
    service_speed_impact DECIMAL(8,4) DEFAULT 0,
    service_quality_impact DECIMAL(8,4) DEFAULT 0,
    food_quality_impact DECIMAL(8,4) DEFAULT 0,
    staff_interaction_impact DECIMAL(8,4) DEFAULT 0,
    
    -- Customer behavior impact
    recommendation_likelihood_impact DECIMAL(8,4) DEFAULT 0,
    return_intent_impact DECIMAL(8,4) DEFAULT 0,
    spend_amount_correlation DECIMAL(8,4) DEFAULT 0,
    tip_percentage_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Business value impact
    revenue_impact_per_execution DECIMAL(10,2) DEFAULT 0,
    customer_retention_impact DECIMAL(8,4) DEFAULT 0,
    word_of_mouth_impact_score DECIMAL(5,2) DEFAULT 0,
    brand_reputation_impact DECIMAL(5,2) DEFAULT 0,
    
    -- SOP execution quality correlation
    sop_compliance_correlation DECIMAL(8,4) DEFAULT 0,
    execution_time_impact DECIMAL(8,4) DEFAULT 0,
    quality_consistency_impact DECIMAL(8,4) DEFAULT 0,
    staff_performance_correlation DECIMAL(8,4) DEFAULT 0,
    
    -- Contextual analysis
    peak_hour_impact_difference DECIMAL(8,4) DEFAULT 0,
    weekend_impact_difference DECIMAL(8,4) DEFAULT 0,
    party_size_impact_correlation DECIMAL(8,4) DEFAULT 0,
    customer_type_impact_variation JSONB DEFAULT '{}',
    
    -- Competitive advantage analysis
    competitor_comparison_score DECIMAL(5,2) DEFAULT 50,
    unique_value_proposition_score DECIMAL(5,2) DEFAULT 50,
    differentiation_impact DECIMAL(5,2) DEFAULT 0,
    
    -- Long-term impact tracking
    customer_lifetime_value_impact DECIMAL(12,2) DEFAULT 0,
    retention_rate_contribution DECIMAL(8,4) DEFAULT 0,
    referral_generation_impact DECIMAL(8,4) DEFAULT 0,
    brand_loyalty_contribution DECIMAL(8,4) DEFAULT 0,
    
    -- Risk and opportunity assessment
    customer_dissatisfaction_risk DECIMAL(5,2) DEFAULT 0,
    improvement_opportunity_score DECIMAL(5,2) DEFAULT 0,
    impact_optimization_potential DECIMAL(5,2) DEFAULT 0,
    
    -- Statistical confidence
    sample_size INTEGER DEFAULT 0,
    confidence_interval_lower DECIMAL(8,4) DEFAULT 0,
    confidence_interval_upper DECIMAL(8,4) DEFAULT 0,
    statistical_significance BOOLEAN DEFAULT false,
    
    -- Seasonal and temporal patterns
    seasonal_impact_variation DECIMAL(8,4) DEFAULT 0,
    time_of_day_impact_pattern JSONB DEFAULT '{}',
    day_of_week_impact_pattern JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_customer_impact_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_impact_sop FOREIGN KEY (sop_document_id) REFERENCES sop_documents(id) ON DELETE CASCADE,
    CONSTRAINT unique_sop_customer_impact UNIQUE (restaurant_id, sop_document_id, analysis_date, analysis_period)
);

-- Customer Journey SOP Touchpoint Mapping
CREATE TABLE IF NOT EXISTS sop_customer_journey_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Journey identification
    journey_name VARCHAR(255) NOT NULL,
    journey_type VARCHAR(100), -- 'dine_in', 'takeout', 'delivery', 'special_event'
    customer_segment VARCHAR(100),
    
    -- Journey phases and touchpoints
    journey_phase VARCHAR(100) NOT NULL, -- 'pre_arrival', 'arrival', 'ordering', 'dining', 'payment', 'departure'
    touchpoint_name customer_touchpoint NOT NULL,
    touchpoint_sequence INTEGER NOT NULL, -- Order in journey
    
    -- SOP associations
    primary_sop_document_id UUID, -- Main SOP for this touchpoint
    supporting_sop_documents UUID[], -- Additional SOPs that support this touchpoint
    sop_execution_criticality VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Customer experience impact
    touchpoint_importance DECIMAL(5,2) DEFAULT 50, -- How important this touchpoint is to overall experience
    satisfaction_sensitivity DECIMAL(5,2) DEFAULT 50, -- How much satisfaction is affected by this touchpoint
    failure_impact_severity DECIMAL(5,2) DEFAULT 50, -- Impact if this touchpoint fails
    
    -- Performance expectations
    expected_execution_time_seconds INTEGER DEFAULT 60,
    quality_threshold DECIMAL(5,2) DEFAULT 80,
    customer_wait_tolerance_seconds INTEGER DEFAULT 300,
    
    -- Measurement and tracking
    measurable_outcomes TEXT[], -- What can be measured at this touchpoint
    success_indicators TEXT[], -- How to determine success
    failure_indicators TEXT[], -- How to identify failure
    recovery_procedures TEXT[], -- What to do if touchpoint fails
    
    -- Business impact
    revenue_influence DECIMAL(8,4) DEFAULT 0, -- How much this touchpoint influences revenue
    cost_per_touchpoint DECIMAL(8,2) DEFAULT 0,
    efficiency_optimization_potential DECIMAL(5,2) DEFAULT 0,
    
    -- Customer feedback integration
    common_positive_feedback TEXT[],
    common_negative_feedback TEXT[],
    improvement_suggestions TEXT[],
    
    -- Optimization opportunities
    automation_potential DECIMAL(5,2) DEFAULT 0,
    personalization_opportunities TEXT[],
    technology_enhancement_options TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_journey_mapping_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_journey_mapping_sop FOREIGN KEY (primary_sop_document_id) REFERENCES sop_documents(id),
    CONSTRAINT unique_journey_touchpoint UNIQUE (restaurant_id, journey_name, touchpoint_name, touchpoint_sequence)
);

-- Customer Feedback SOP Attribution
CREATE TABLE IF NOT EXISTS sop_customer_feedback_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Feedback identification
    feedback_id UUID NOT NULL, -- Link to external feedback system
    feedback_date DATE NOT NULL,
    feedback_source VARCHAR(100), -- 'in_person', 'online_review', 'survey', 'social_media', 'email'
    feedback_type VARCHAR(50), -- 'complaint', 'compliment', 'suggestion', 'neutral_comment'
    
    -- Customer context
    customer_session_id UUID, -- Link to satisfaction tracking
    visit_context VARCHAR(100),
    service_period VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'late_night'
    
    -- Feedback content analysis
    feedback_text TEXT,
    sentiment_score DECIMAL(5,2) DEFAULT 0, -- -100 to +100
    emotion_indicators TEXT[], -- 'frustrated', 'delighted', 'confused', 'impressed'
    specific_mentions TEXT[], -- Specific items, staff, processes mentioned
    
    -- SOP attribution analysis
    attributed_sop_documents UUID[], -- SOPs that this feedback relates to
    attribution_confidence DECIMAL(5,2) DEFAULT 0, -- 0-100
    attribution_method VARCHAR(100), -- 'keyword_match', 'timing_correlation', 'manual_analysis'
    
    -- Impact assessment per SOP
    sop_impact_scores JSONB DEFAULT '{}', -- SOP ID -> impact score mapping
    primary_causative_sop UUID, -- SOP most responsible for this feedback
    secondary_contributing_sops UUID[], -- SOPs that contributed to the experience
    
    -- Feedback categorization
    operational_category VARCHAR(100), -- 'food_quality', 'service_speed', 'staff_behavior', 'cleanliness'
    urgency_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    actionability_score DECIMAL(5,2) DEFAULT 50, -- How actionable is this feedback
    
    -- Response and resolution tracking
    response_required BOOLEAN DEFAULT false,
    response_provided BOOLEAN DEFAULT false,
    response_date DATE,
    resolution_actions TEXT[],
    customer_satisfaction_with_response DECIMAL(5,2),
    
    -- Learning and improvement
    lessons_learned TEXT[],
    process_improvements_identified TEXT[],
    training_needs_identified TEXT[],
    sop_updates_suggested TEXT[],
    
    -- Business impact
    estimated_revenue_impact DECIMAL(10,2) DEFAULT 0,
    customer_retention_risk DECIMAL(5,2) DEFAULT 0,
    brand_reputation_impact DECIMAL(5,2) DEFAULT 0,
    viral_potential_score DECIMAL(5,2) DEFAULT 0, -- Likelihood to be shared widely
    
    -- Follow-up and monitoring
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_date DATE,
    trend_monitoring_flag BOOLEAN DEFAULT false, -- Flag for ongoing monitoring
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_feedback_attribution_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_attribution_sop FOREIGN KEY (primary_causative_sop) REFERENCES sop_documents(id),
    CONSTRAINT fk_feedback_attribution_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id)
);

-- Customer Impact Business Intelligence Aggregations
CREATE TABLE IF NOT EXISTS sop_customer_impact_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    
    -- Aggregation metadata
    aggregation_date DATE NOT NULL,
    aggregation_level VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    aggregation_scope VARCHAR(50) DEFAULT 'restaurant', -- 'restaurant', 'department', 'sop_category'
    scope_identifier UUID, -- Restaurant, department, or category ID
    
    -- Customer satisfaction aggregations
    total_customer_interactions INTEGER DEFAULT 0,
    average_satisfaction_score DECIMAL(5,2) DEFAULT 50,
    satisfaction_score_trend DECIMAL(8,4) DEFAULT 0, -- Week-over-week or month-over-month change
    customer_satisfaction_distribution JSONB DEFAULT '{}', -- Score ranges -> count mapping
    
    -- SOP impact aggregations
    sops_with_positive_impact INTEGER DEFAULT 0,
    sops_with_negative_impact INTEGER DEFAULT 0,
    sops_with_neutral_impact INTEGER DEFAULT 0,
    top_performing_sops UUID[], -- SOPs with highest customer satisfaction correlation
    underperforming_sops UUID[], -- SOPs with negative customer impact
    
    -- Business value aggregations
    total_revenue_from_satisfied_customers DECIMAL(12,2) DEFAULT 0,
    revenue_per_satisfied_customer DECIMAL(8,2) DEFAULT 0,
    customer_retention_rate DECIMAL(5,2) DEFAULT 100,
    referral_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Operational efficiency aggregations
    average_service_time DECIMAL(8,2) DEFAULT 0,
    sop_execution_efficiency_score DECIMAL(5,2) DEFAULT 100,
    customer_wait_time_satisfaction DECIMAL(5,2) DEFAULT 50,
    operational_cost_per_satisfied_customer DECIMAL(8,2) DEFAULT 0,
    
    -- Quality and consistency aggregations
    service_quality_consistency_score DECIMAL(5,2) DEFAULT 100,
    experience_standardization_score DECIMAL(5,2) DEFAULT 100,
    brand_promise_delivery_score DECIMAL(5,2) DEFAULT 100,
    
    -- Risk and opportunity aggregations
    customer_dissatisfaction_incidents INTEGER DEFAULT 0,
    high_risk_touchpoints UUID[], -- Touchpoints with frequent negative feedback
    improvement_opportunity_value DECIMAL(12,2) DEFAULT 0,
    competitive_advantage_score DECIMAL(5,2) DEFAULT 50,
    
    -- Trend analysis
    satisfaction_volatility DECIMAL(8,4) DEFAULT 0, -- How much satisfaction varies
    seasonal_impact_patterns JSONB DEFAULT '{}',
    peak_performance_conditions JSONB DEFAULT '{}',
    performance_decline_indicators JSONB DEFAULT '{}',
    
    -- Predictive indicators
    customer_churn_risk_score DECIMAL(5,2) DEFAULT 0,
    revenue_growth_potential DECIMAL(8,4) DEFAULT 0,
    operational_optimization_score DECIMAL(5,2) DEFAULT 50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_customer_impact_agg_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    CONSTRAINT unique_customer_impact_aggregation UNIQUE (restaurant_id, aggregation_date, aggregation_level, aggregation_scope, scope_identifier)
);

-- ===========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===========================================

-- Customer satisfaction tracking indexes
CREATE INDEX idx_customer_satisfaction_restaurant ON sop_customer_satisfaction_tracking(restaurant_id);
CREATE INDEX idx_customer_satisfaction_date ON sop_customer_satisfaction_tracking(visit_date);
CREATE INDEX idx_customer_satisfaction_rating ON sop_customer_satisfaction_tracking(overall_satisfaction_score);
CREATE INDEX idx_customer_satisfaction_sop_executions ON sop_customer_satisfaction_tracking USING GIN(relevant_sop_executions);

-- Customer impact correlation indexes
CREATE INDEX idx_customer_impact_correlation_restaurant_sop ON sop_customer_impact_correlation(restaurant_id, sop_document_id);
CREATE INDEX idx_customer_impact_correlation_date ON sop_customer_impact_correlation(analysis_date);
CREATE INDEX idx_customer_impact_correlation_coefficient ON sop_customer_impact_correlation(satisfaction_impact_coefficient);

-- Journey mapping indexes
CREATE INDEX idx_journey_mapping_restaurant ON sop_customer_journey_mapping(restaurant_id);
CREATE INDEX idx_journey_mapping_touchpoint ON sop_customer_journey_mapping(touchpoint_name);
CREATE INDEX idx_journey_mapping_sop ON sop_customer_journey_mapping(primary_sop_document_id);

-- Feedback attribution indexes
CREATE INDEX idx_feedback_attribution_restaurant ON sop_customer_feedback_attribution(restaurant_id);
CREATE INDEX idx_feedback_attribution_date ON sop_customer_feedback_attribution(feedback_date);
CREATE INDEX idx_feedback_attribution_sop ON sop_customer_feedback_attribution(primary_causative_sop);
CREATE INDEX idx_feedback_attribution_sops ON sop_customer_feedback_attribution USING GIN(attributed_sop_documents);

-- Impact aggregations indexes
CREATE INDEX idx_customer_impact_agg_restaurant_date ON sop_customer_impact_aggregations(restaurant_id, aggregation_date);
CREATE INDEX idx_customer_impact_agg_level ON sop_customer_impact_aggregations(aggregation_level);
CREATE INDEX idx_customer_impact_agg_satisfaction ON sop_customer_impact_aggregations(average_satisfaction_score);

-- Composite indexes for analytics
CREATE INDEX idx_customer_satisfaction_analytics ON sop_customer_satisfaction_tracking(restaurant_id, visit_date, overall_satisfaction_score, is_peak_hour);
CREATE INDEX idx_customer_impact_analytics ON sop_customer_impact_correlation(restaurant_id, analysis_date, satisfaction_impact_coefficient, customers_affected_count);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on customer impact tables
ALTER TABLE sop_customer_satisfaction_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_customer_impact_correlation ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_customer_journey_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_customer_feedback_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_customer_impact_aggregations ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant isolation
CREATE POLICY "Customer satisfaction restaurant access"
ON sop_customer_satisfaction_tracking FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Customer impact correlation restaurant access"
ON sop_customer_impact_correlation FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Journey mapping restaurant access"
ON sop_customer_journey_mapping FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Feedback attribution restaurant access"
ON sop_customer_feedback_attribution FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

CREATE POLICY "Customer impact aggregations restaurant access"
ON sop_customer_impact_aggregations FOR ALL TO authenticated
USING (restaurant_id = (SELECT restaurant_id FROM auth_users WHERE id = auth.uid()));

-- ===========================================
-- TRIGGERS AND AUTOMATION
-- ===========================================

-- Update triggers
CREATE TRIGGER update_sop_customer_journey_mapping_updated_at 
    BEFORE UPDATE ON sop_customer_journey_mapping 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_customer_feedback_attribution_updated_at 
    BEFORE UPDATE ON sop_customer_feedback_attribution 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- CUSTOMER IMPACT ANALYTICS FUNCTIONS
-- ===========================================

-- Function to calculate SOP customer satisfaction correlation
CREATE OR REPLACE FUNCTION calculate_sop_customer_satisfaction_correlation(
    p_restaurant_id UUID,
    p_sop_document_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    correlation_coefficient DECIMAL,
    significance_level DECIMAL,
    sample_size INTEGER,
    average_satisfaction DECIMAL,
    impact_assessment TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sop_customer_data AS (
        SELECT 
            sct.overall_satisfaction_score,
            CASE WHEN p_sop_document_id = ANY(sct.relevant_sop_executions) THEN 1 ELSE 0 END as sop_exposure
        FROM sop_customer_satisfaction_tracking sct
        WHERE sct.restaurant_id = p_restaurant_id
          AND sct.visit_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
          AND array_length(sct.relevant_sop_executions, 1) > 0
    ),
    correlation_calc AS (
        SELECT 
            COALESCE(CORR(scd.sop_exposure::DECIMAL, scd.overall_satisfaction_score), 0) as corr_coeff,
            COUNT(*) as sample_count,
            AVG(CASE WHEN scd.sop_exposure = 1 THEN scd.overall_satisfaction_score END) as avg_satisfaction_with_sop,
            AVG(CASE WHEN scd.sop_exposure = 0 THEN scd.overall_satisfaction_score END) as avg_satisfaction_without_sop
        FROM sop_customer_data scd
    )
    SELECT 
        cc.corr_coeff as correlation_coefficient,
        CASE WHEN cc.sample_count >= 30 THEN 0.05 ELSE 0.10 END as significance_level,
        cc.sample_count::INTEGER as sample_size,
        COALESCE(cc.avg_satisfaction_with_sop, 0) as average_satisfaction,
        CASE 
            WHEN cc.corr_coeff > 0.3 THEN 'Strong positive impact on customer satisfaction'
            WHEN cc.corr_coeff > 0.1 THEN 'Positive impact on customer satisfaction'
            WHEN cc.corr_coeff > -0.1 THEN 'Neutral impact on customer satisfaction'
            WHEN cc.corr_coeff > -0.3 THEN 'Negative impact on customer satisfaction'
            ELSE 'Strong negative impact on customer satisfaction'
        END as impact_assessment
    FROM correlation_calc cc;
END;
$$ LANGUAGE plpgsql;

-- Function to identify customer satisfaction improvement opportunities
CREATE OR REPLACE FUNCTION identify_customer_satisfaction_opportunities(
    p_restaurant_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    sop_document_id UUID,
    sop_title TEXT,
    current_satisfaction_impact DECIMAL,
    improvement_potential DECIMAL,
    customers_affected INTEGER,
    estimated_revenue_impact DECIMAL,
    priority_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH sop_impact_analysis AS (
        SELECT 
            sic.sop_document_id,
            sd.title as sop_title,
            sic.satisfaction_impact_coefficient as current_impact,
            (100 - sic.average_satisfaction_score) as improvement_potential,
            sic.customers_affected_count,
            sic.revenue_impact_per_execution * sic.customers_affected_count as estimated_revenue,
            -- Priority score based on impact, potential, and volume
            (ABS(sic.satisfaction_impact_coefficient) * 0.4 + 
             (100 - sic.average_satisfaction_score) * 0.3 + 
             LEAST(sic.customers_affected_count / 100.0, 1) * 100 * 0.3) as priority
        FROM sop_customer_impact_correlation sic
        JOIN sop_documents sd ON sic.sop_document_id = sd.id
        WHERE sic.restaurant_id = p_restaurant_id
          AND sic.analysis_date >= CURRENT_DATE - INTERVAL '30 days'
          AND sic.customers_affected_count > 0
    )
    SELECT 
        sia.sop_document_id,
        sia.sop_title,
        sia.current_impact,
        sia.improvement_potential,
        sia.customers_affected_count,
        sia.estimated_revenue,
        sia.priority
    FROM sop_impact_analysis sia
    ORDER BY sia.priority DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze customer journey performance
CREATE OR REPLACE FUNCTION analyze_customer_journey_performance(
    p_restaurant_id UUID,
    p_journey_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    journey_phase VARCHAR,
    touchpoint_name customer_touchpoint,
    average_satisfaction DECIMAL,
    performance_score DECIMAL,
    improvement_priority DECIMAL,
    recommendations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH journey_performance AS (
        SELECT 
            sjm.journey_phase,
            sjm.touchpoint_name,
            AVG(sct.overall_satisfaction_score) as avg_satisfaction,
            sjm.touchpoint_importance,
            sjm.satisfaction_sensitivity,
            sjm.failure_impact_severity,
            -- Performance score based on satisfaction and importance
            (AVG(sct.overall_satisfaction_score) * sjm.touchpoint_importance / 100) as performance,
            -- Priority for improvement based on low performance but high importance
            CASE 
                WHEN AVG(sct.overall_satisfaction_score) < 70 AND sjm.touchpoint_importance > 70 THEN 100
                WHEN AVG(sct.overall_satisfaction_score) < 80 AND sjm.touchpoint_importance > 50 THEN 80
                ELSE (100 - AVG(sct.overall_satisfaction_score)) * (sjm.touchpoint_importance / 100)
            END as improvement_priority
        FROM sop_customer_journey_mapping sjm
        LEFT JOIN sop_customer_satisfaction_tracking sct ON 
            sct.restaurant_id = sjm.restaurant_id AND
            sjm.primary_sop_document_id = ANY(sct.relevant_sop_executions)
        WHERE sjm.restaurant_id = p_restaurant_id
          AND (p_journey_type IS NULL OR sjm.journey_type = p_journey_type)
          AND sct.visit_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY sjm.journey_phase, sjm.touchpoint_name, sjm.touchpoint_importance, 
                 sjm.satisfaction_sensitivity, sjm.failure_impact_severity
    )
    SELECT 
        jp.journey_phase,
        jp.touchpoint_name,
        COALESCE(jp.avg_satisfaction, 50) as average_satisfaction,
        jp.performance as performance_score,
        jp.improvement_priority,
        ARRAY[
            CASE WHEN jp.avg_satisfaction < 70 THEN 'Focus on execution quality improvement' END,
            CASE WHEN jp.avg_satisfaction < 80 THEN 'Implement staff training for this touchpoint' END,
            CASE WHEN jp.improvement_priority > 80 THEN 'High priority for process optimization' END,
            CASE WHEN jp.touchpoint_importance > 80 THEN 'Critical touchpoint - monitor closely' END
        ]::TEXT[] as recommendations
    FROM journey_performance jp
    ORDER BY jp.improvement_priority DESC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS AND DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_customer_satisfaction_tracking IS 'Customer satisfaction measurements linked to SOP executions for impact correlation analysis';
COMMENT ON TABLE sop_customer_impact_correlation IS 'Statistical correlation analysis between SOP performance and customer satisfaction metrics';
COMMENT ON TABLE sop_customer_journey_mapping IS 'Mapping of customer journey touchpoints to SOPs with performance expectations and impact assessment';
COMMENT ON TABLE sop_customer_feedback_attribution IS 'Attribution of customer feedback to specific SOPs with sentiment analysis and actionable insights';
COMMENT ON TABLE sop_customer_impact_aggregations IS 'Pre-aggregated customer impact metrics for business intelligence reporting and trend analysis';

-- Performance optimization
ANALYZE sop_customer_satisfaction_tracking;
ANALYZE sop_customer_impact_correlation;
ANALYZE sop_customer_journey_mapping;
ANALYZE sop_customer_feedback_attribution;
ANALYZE sop_customer_impact_aggregations;