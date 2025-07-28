-- ================================================
-- MULTI-LOCATION STAFF SCHEDULING SYSTEM
-- Migration: 075_multi_location_scheduling.sql
-- Created: 2025-07-28
-- Purpose: Advanced staff scheduling and optimization across multiple restaurant locations
-- ================================================

-- Enable required extensions for scheduling optimization
CREATE EXTENSION IF NOT EXISTS "hstore";

-- ===========================================
-- SCHEDULING ENUMS AND TYPES
-- ===========================================

-- Shift status enum
CREATE TYPE shift_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Shift type enum
CREATE TYPE shift_type AS ENUM (
    'regular', 'overtime', 'double_time', 'split', 'on_call', 'training', 'coverage', 'holiday'
);

-- Staff availability status enum
CREATE TYPE availability_status AS ENUM ('available', 'unavailable', 'preferred', 'limited');

-- Time off request status enum
CREATE TYPE time_off_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');

-- Time off type enum
CREATE TYPE time_off_type AS ENUM (
    'vacation', 'sick_leave', 'personal', 'family_emergency', 'bereavement', 
    'jury_duty', 'military', 'maternity', 'paternity', 'unpaid'
);

-- Skill level enum
CREATE TYPE skill_level AS ENUM ('trainee', 'basic', 'intermediate', 'advanced', 'expert', 'trainer');

-- Schedule optimization priority enum
CREATE TYPE optimization_priority AS ENUM ('cost', 'coverage', 'fairness', 'preference', 'compliance');

-- Labor law compliance status enum
CREATE TYPE compliance_status AS ENUM ('compliant', 'warning', 'violation', 'exempt');

-- ===========================================
-- STAFF PROFILE AND SKILLS
-- ===========================================

-- Enhanced staff profiles for scheduling
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    hire_date DATE NOT NULL,
    employment_type VARCHAR(50) DEFAULT 'full_time', -- full_time, part_time, contractor, temporary
    hourly_rate DECIMAL(8,2),
    overtime_rate DECIMAL(8,2),
    holiday_rate DECIMAL(8,2),
    max_hours_per_week INTEGER DEFAULT 40,
    max_hours_per_day INTEGER DEFAULT 8,
    max_consecutive_days INTEGER DEFAULT 6,
    min_hours_between_shifts INTEGER DEFAULT 8,
    preferred_hours_per_week INTEGER,
    minimum_hours_per_week INTEGER DEFAULT 0,
    work_locations UUID[] DEFAULT '{}', -- restaurant IDs where can work
    transportation_method VARCHAR(50),
    travel_time_between_locations JSONB DEFAULT '{}', -- location_id -> minutes
    emergency_contact JSONB DEFAULT '{}',
    certifications JSONB DEFAULT '[]',
    languages VARCHAR(10)[] DEFAULT '{}',
    uniform_size JSONB DEFAULT '{}',
    dietary_restrictions TEXT,
    medical_restrictions TEXT,
    availability_notes TEXT,
    availability_notes_th TEXT,
    is_supervisor BOOLEAN DEFAULT false,
    can_open_store BOOLEAN DEFAULT false,
    can_close_store BOOLEAN DEFAULT false,
    requires_supervision BOOLEAN DEFAULT false,
    active_from DATE DEFAULT CURRENT_DATE,
    active_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id)
);

-- Staff skills and competencies
CREATE TABLE staff_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    skill_code VARCHAR(50) NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    skill_name_th VARCHAR(255) NOT NULL,
    skill_category VARCHAR(100), -- 'kitchen', 'service', 'management', 'safety', 'technical'
    description TEXT,
    description_th TEXT,
    required_for_positions VARCHAR(100)[] DEFAULT '{}',
    certification_required BOOLEAN DEFAULT false,
    training_hours_required INTEGER DEFAULT 0,
    assessment_frequency_months INTEGER, -- how often to reassess
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(chain_id, skill_code)
);

-- Staff skill assignments and levels
CREATE TABLE staff_skill_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES staff_skills(id) ON DELETE CASCADE,
    skill_level skill_level NOT NULL,
    certified_date DATE,
    certification_expires DATE,
    last_assessment_date DATE,
    next_assessment_date DATE,
    assessment_score DECIMAL(5,2), -- 0-100 score
    trainer_id UUID REFERENCES staff_profiles(id),
    notes TEXT,
    notes_th TEXT,
    is_primary_skill BOOLEAN DEFAULT false,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(staff_profile_id, skill_id)
);

-- ===========================================
-- SCHEDULING TEMPLATES AND PATTERNS
-- ===========================================

-- Schedule templates for different restaurant needs
CREATE TABLE schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_name_th VARCHAR(255),
    restaurant_type VARCHAR(100), -- 'quick_service', 'casual_dining', 'fine_dining'
    applicable_locations UUID[] DEFAULT '{}', -- specific restaurant IDs
    weekly_pattern JSONB NOT NULL, -- day-by-day shift requirements
    seasonal_adjustments JSONB DEFAULT '{}',
    holiday_adjustments JSONB DEFAULT '{}',
    minimum_staff_levels JSONB NOT NULL, -- by hour and position
    optimal_staff_levels JSONB NOT NULL,
    skill_requirements JSONB DEFAULT '{}', -- required skills by position/time
    labor_cost_budget DECIMAL(12,2),
    labor_percentage_target DECIMAL(5,2), -- target labor cost as % of sales
    created_by UUID REFERENCES auth_users(id),
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff availability patterns
CREATE TABLE staff_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    availability_status availability_status DEFAULT 'available',
    location_preferences UUID[] DEFAULT '{}', -- preferred restaurant locations
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    recurring BOOLEAN DEFAULT true,
    notes TEXT,
    notes_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time off requests and approvals
CREATE TABLE time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    request_type time_off_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME, -- for partial day requests
    end_time TIME, -- for partial day requests
    total_hours DECIMAL(6,2),
    reason TEXT,
    reason_th TEXT,
    supporting_documents JSONB DEFAULT '[]',
    requested_by UUID NOT NULL REFERENCES auth_users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth_users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    review_notes_th TEXT,
    status time_off_status DEFAULT 'pending',
    impact_assessment JSONB DEFAULT '{}', -- affected shifts, coverage needed
    replacement_staff_id UUID REFERENCES staff_profiles(id),
    is_paid BOOLEAN DEFAULT true,
    pay_rate_override DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SHIFT SCHEDULING
-- ===========================================

-- Master shift schedules
CREATE TABLE shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    shift_duration_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600
    ) STORED,
    position VARCHAR(100) NOT NULL,
    shift_type shift_type DEFAULT 'regular',
    status shift_status DEFAULT 'scheduled',
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    break_duration_minutes INTEGER DEFAULT 30,
    hourly_rate DECIMAL(8,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    regular_hours DECIMAL(4,2),
    total_pay DECIMAL(10,2),
    required_skills UUID[] DEFAULT '{}', -- skill IDs needed for this shift
    assigned_stations VARCHAR(100)[] DEFAULT '{}',
    special_instructions TEXT,
    special_instructions_th TEXT,
    template_id UUID REFERENCES schedule_templates(id),
    created_by UUID REFERENCES auth_users(id),
    confirmed_by UUID REFERENCES auth_users(id),
    confirmed_at TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    actual_break_duration INTEGER,
    no_show_reason TEXT,
    shift_notes TEXT,
    shift_notes_th TEXT,
    performance_rating DECIMAL(3,2), -- 1-5 rating for the shift
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_shift_times CHECK (shift_end > shift_start),
    CONSTRAINT valid_break_times CHECK (break_start IS NULL OR break_end IS NULL OR break_end > break_start)
);

-- Shift coverage requests and swaps
CREATE TABLE shift_coverage_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_shift_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
    requesting_staff_id UUID NOT NULL REFERENCES staff_profiles(id),
    coverage_type VARCHAR(50) NOT NULL, -- 'swap', 'pickup', 'temporary_coverage'
    reason TEXT NOT NULL,
    reason_th TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    urgency_level INTEGER DEFAULT 1 CHECK (urgency_level BETWEEN 1 AND 5),
    incentive_pay DECIMAL(8,2) DEFAULT 0, -- extra pay offered
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'accepted', 'completed', 'cancelled'
    accepted_by UUID REFERENCES staff_profiles(id),
    accepted_at TIMESTAMPTZ,
    completion_notes TEXT,
    completion_notes_th TEXT,
    manager_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth_users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift swap proposals
CREATE TABLE shift_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coverage_request_id UUID NOT NULL REFERENCES shift_coverage_requests(id) ON DELETE CASCADE,
    offering_shift_id UUID NOT NULL REFERENCES shift_schedules(id),
    offering_staff_id UUID NOT NULL REFERENCES staff_profiles(id),
    proposed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'accepted', 'rejected', 'expired'
    expires_at TIMESTAMPTZ,
    notes TEXT,
    notes_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SCHEDULING OPTIMIZATION
-- ===========================================

-- Scheduling constraints and preferences
CREATE TABLE scheduling_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    constraint_name VARCHAR(255) NOT NULL,
    constraint_name_th VARCHAR(255),
    constraint_type VARCHAR(100) NOT NULL, -- 'hard', 'soft', 'preference'
    constraint_category VARCHAR(100), -- 'labor_law', 'business_rule', 'staff_preference', 'operational'
    constraint_sql TEXT NOT NULL, -- SQL condition that must be satisfied
    weight INTEGER DEFAULT 100, -- importance weight for soft constraints
    penalty_cost DECIMAL(10,2) DEFAULT 0, -- cost of violating this constraint
    applies_to_positions VARCHAR(100)[] DEFAULT '{}',
    applies_to_staff UUID[] DEFAULT '{}',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule optimization results
CREATE TABLE schedule_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    optimization_date DATE NOT NULL,
    schedule_period_start DATE NOT NULL,
    schedule_period_end DATE NOT NULL,
    optimization_priority optimization_priority NOT NULL,
    template_id UUID REFERENCES schedule_templates(id),
    input_parameters JSONB NOT NULL,
    constraints_considered JSONB NOT NULL,
    optimization_results JSONB NOT NULL,
    total_labor_cost DECIMAL(12,2),
    labor_cost_percentage DECIMAL(5,2),
    coverage_score DECIMAL(5,2), -- how well demand is covered
    fairness_score DECIMAL(5,2), -- how fairly hours are distributed
    preference_score DECIMAL(5,2), -- how well staff preferences are met
    compliance_score DECIMAL(5,2), -- adherence to labor laws
    overall_score DECIMAL(5,2),
    violations_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    algorithm_version VARCHAR(50),
    created_by UUID REFERENCES auth_users(id),
    approved_by UUID REFERENCES auth_users(id),
    approved_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Labor law compliance tracking
CREATE TABLE labor_compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_period_start DATE NOT NULL,
    check_period_end DATE NOT NULL,
    compliance_category VARCHAR(100) NOT NULL, -- 'overtime', 'rest_periods', 'max_hours', 'min_wage'
    rule_description TEXT NOT NULL,
    rule_description_th TEXT,
    actual_value DECIMAL(10,2),
    required_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    compliance_status compliance_status NOT NULL,
    violation_severity INTEGER, -- 1-5 scale
    potential_penalty DECIMAL(10,2),
    corrective_action_required TEXT,
    corrective_action_required_th TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth_users(id),
    resolution_notes TEXT,
    resolution_notes_th TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PERFORMANCE AND ANALYTICS
-- ===========================================

-- Staff scheduling performance metrics
CREATE TABLE staff_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shifts_scheduled INTEGER DEFAULT 0,
    shifts_completed INTEGER DEFAULT 0,
    shifts_no_show INTEGER DEFAULT 0,
    shifts_late INTEGER DEFAULT 0,
    shifts_early_departure INTEGER DEFAULT 0,
    total_hours_scheduled DECIMAL(8,2) DEFAULT 0,
    total_hours_worked DECIMAL(8,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    average_shift_rating DECIMAL(3,2),
    punctuality_score DECIMAL(5,2), -- percentage on-time arrival
    reliability_score DECIMAL(5,2), -- percentage of shifts completed as scheduled
    flexibility_score DECIMAL(5,2), -- willingness to pick up extra shifts
    skills_utilization JSONB DEFAULT '{}', -- which skills were used and how often
    cross_training_hours DECIMAL(6,2) DEFAULT 0,
    customer_service_ratings JSONB DEFAULT '{}',
    productivity_metrics JSONB DEFAULT '{}',
    labor_cost DECIMAL(10,2) DEFAULT 0,
    cost_per_hour DECIMAL(8,2),
    revenue_per_hour DECIMAL(10,2), -- if trackable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(staff_profile_id, restaurant_id, metric_date)
);

-- Chain-wide scheduling analytics
CREATE TABLE chain_scheduling_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES restaurant_chains(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_locations INTEGER,
    total_staff INTEGER,
    total_shifts_scheduled INTEGER,
    total_labor_hours DECIMAL(12,2),
    total_labor_cost DECIMAL(15,2),
    average_labor_percentage DECIMAL(5,2),
    schedule_optimization_score DECIMAL(5,2),
    staff_satisfaction_score DECIMAL(5,2),
    manager_efficiency_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    turnover_rate DECIMAL(5,2),
    overtime_percentage DECIMAL(5,2),
    coverage_gaps INTEGER DEFAULT 0,
    unfilled_shifts INTEGER DEFAULT 0,
    last_minute_changes INTEGER DEFAULT 0,
    cross_location_transfers INTEGER DEFAULT 0,
    training_hours_completed DECIMAL(10,2),
    skills_development_progress JSONB DEFAULT '{}',
    location_performance_comparison JSONB DEFAULT '{}',
    seasonal_trends JSONB DEFAULT '{}',
    optimization_opportunities JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ADVANCED INDEXING
-- ===========================================

-- Staff profiles indexes
CREATE INDEX idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_employee_id ON staff_profiles(employee_id);
CREATE INDEX idx_staff_profiles_hire_date ON staff_profiles(hire_date);
CREATE INDEX idx_staff_profiles_employment_type ON staff_profiles(employment_type);
CREATE INDEX idx_staff_profiles_work_locations ON staff_profiles USING GIN(work_locations);
CREATE INDEX idx_staff_profiles_active_period ON staff_profiles(active_from, active_to);

-- Staff skills indexes
CREATE INDEX idx_staff_skills_chain_id ON staff_skills(chain_id);
CREATE INDEX idx_staff_skills_category ON staff_skills(skill_category);
CREATE INDEX idx_staff_skills_code ON staff_skills(skill_code);

-- Staff skill assignments indexes
CREATE INDEX idx_staff_skill_assignments_staff ON staff_skill_assignments(staff_profile_id);
CREATE INDEX idx_staff_skill_assignments_skill ON staff_skill_assignments(skill_id);
CREATE INDEX idx_staff_skill_assignments_level ON staff_skill_assignments(skill_level);
CREATE INDEX idx_staff_skill_assignments_primary ON staff_skill_assignments(is_primary_skill);

-- Schedule templates indexes
CREATE INDEX idx_schedule_templates_chain_id ON schedule_templates(chain_id);
CREATE INDEX idx_schedule_templates_locations ON schedule_templates USING GIN(applicable_locations);
CREATE INDEX idx_schedule_templates_effective ON schedule_templates(effective_from, effective_to);

-- Staff availability indexes
CREATE INDEX idx_staff_availability_staff ON staff_availability(staff_profile_id);
CREATE INDEX idx_staff_availability_day ON staff_availability(day_of_week);
CREATE INDEX idx_staff_availability_time ON staff_availability(start_time, end_time);
CREATE INDEX idx_staff_availability_effective ON staff_availability(effective_from, effective_to);

-- Shift schedules indexes
CREATE INDEX idx_shift_schedules_restaurant_date ON shift_schedules(restaurant_id, schedule_date);
CREATE INDEX idx_shift_schedules_staff_date ON shift_schedules(staff_profile_id, schedule_date);
CREATE INDEX idx_shift_schedules_status ON shift_schedules(status);
CREATE INDEX idx_shift_schedules_position ON shift_schedules(position);
CREATE INDEX idx_shift_schedules_shift_time ON shift_schedules(shift_start, shift_end);
CREATE INDEX idx_shift_schedules_skills ON shift_schedules USING GIN(required_skills);

-- Time off requests indexes
CREATE INDEX idx_time_off_requests_staff ON time_off_requests(staff_profile_id);
CREATE INDEX idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX idx_time_off_requests_type ON time_off_requests(request_type);

-- Coverage requests indexes
CREATE INDEX idx_shift_coverage_requests_shift ON shift_coverage_requests(original_shift_id);
CREATE INDEX idx_shift_coverage_requests_staff ON shift_coverage_requests(requesting_staff_id);
CREATE INDEX idx_shift_coverage_requests_status ON shift_coverage_requests(status);
CREATE INDEX idx_shift_coverage_requests_urgency ON shift_coverage_requests(urgency_level);

-- Performance metrics indexes
CREATE INDEX idx_staff_performance_staff_date ON staff_performance_metrics(staff_profile_id, metric_date);
CREATE INDEX idx_staff_performance_restaurant_date ON staff_performance_metrics(restaurant_id, metric_date);
CREATE INDEX idx_staff_performance_reliability ON staff_performance_metrics(reliability_score);

-- ===========================================
-- SCHEDULING OPTIMIZATION FUNCTIONS
-- ===========================================

-- Function to calculate staff workload balance
CREATE OR REPLACE FUNCTION calculate_workload_balance(
    p_restaurant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    staff_profile_id UUID,
    employee_name VARCHAR,
    total_hours DECIMAL,
    avg_hours_per_day DECIMAL,
    overtime_hours DECIMAL,
    workload_variance DECIMAL,
    balance_score DECIMAL
) AS $$
DECLARE
    avg_hours_chain DECIMAL;
BEGIN
    -- Calculate chain average hours per person
    SELECT AVG(shift_duration_hours) INTO avg_hours_chain
    FROM shift_schedules ss
    JOIN restaurants r ON r.id = ss.restaurant_id
    WHERE r.id = p_restaurant_id
    AND ss.schedule_date BETWEEN p_start_date AND p_end_date
    AND ss.status IN ('scheduled', 'confirmed', 'completed');
    
    RETURN QUERY
    SELECT 
        sp.id,
        au.full_name,
        COALESCE(SUM(ss.shift_duration_hours), 0) as total_hours,
        COALESCE(AVG(ss.shift_duration_hours), 0) as avg_hours_per_day,
        COALESCE(SUM(ss.overtime_hours), 0) as overtime_hours,
        COALESCE(STDDEV(ss.shift_duration_hours), 0) as workload_variance,
        CASE 
            WHEN COALESCE(AVG(ss.shift_duration_hours), 0) = 0 THEN 0
            ELSE ROUND(100 - ABS((COALESCE(AVG(ss.shift_duration_hours), 0) - avg_hours_chain) / NULLIF(avg_hours_chain, 0) * 100), 2)
        END as balance_score
    FROM staff_profiles sp
    JOIN auth_users au ON au.id = sp.user_id
    LEFT JOIN shift_schedules ss ON ss.staff_profile_id = sp.id
        AND ss.restaurant_id = p_restaurant_id
        AND ss.schedule_date BETWEEN p_start_date AND p_end_date
        AND ss.status IN ('scheduled', 'confirmed', 'completed')
    WHERE p_restaurant_id = ANY(sp.work_locations)
    GROUP BY sp.id, au.full_name
    ORDER BY balance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify scheduling conflicts
CREATE OR REPLACE FUNCTION identify_scheduling_conflicts(
    p_restaurant_id UUID,
    p_date DATE
)
RETURNS TABLE(
    conflict_type VARCHAR,
    staff_profile_id UUID,
    staff_name VARCHAR,
    shift_id UUID,
    conflict_description TEXT,
    severity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- Double bookings
    SELECT 
        'double_booking'::VARCHAR,
        ss1.staff_profile_id,
        au.full_name,
        ss1.id,
        format('Staff member scheduled for overlapping shifts: %s-%s and %s-%s', 
            ss1.shift_start::TIME, ss1.shift_end::TIME, 
            ss2.shift_start::TIME, ss2.shift_end::TIME),
        4
    FROM shift_schedules ss1
    JOIN shift_schedules ss2 ON ss2.staff_profile_id = ss1.staff_profile_id 
        AND ss2.id != ss1.id
        AND ss2.schedule_date = ss1.schedule_date
    JOIN auth_users au ON au.id = (SELECT user_id FROM staff_profiles WHERE id = ss1.staff_profile_id)
    WHERE ss1.restaurant_id = p_restaurant_id
    AND ss1.schedule_date = p_date
    AND ss1.status IN ('scheduled', 'confirmed')
    AND ss2.status IN ('scheduled', 'confirmed')
    AND (ss1.shift_start, ss1.shift_end) OVERLAPS (ss2.shift_start, ss2.shift_end)
    
    UNION ALL
    
    -- Insufficient rest between shifts
    SELECT 
        'insufficient_rest'::VARCHAR,
        ss1.staff_profile_id,
        au.full_name,
        ss1.id,
        format('Less than %s hours between shifts ending %s and starting %s', 
            sp.min_hours_between_shifts,
            ss_prev.shift_end::TIME, 
            ss1.shift_start::TIME),
        3
    FROM shift_schedules ss1
    JOIN staff_profiles sp ON sp.id = ss1.staff_profile_id
    JOIN shift_schedules ss_prev ON ss_prev.staff_profile_id = ss1.staff_profile_id
        AND ss_prev.schedule_date = ss1.schedule_date - INTERVAL '1 day'
    JOIN auth_users au ON au.id = sp.user_id
    WHERE ss1.restaurant_id = p_restaurant_id
    AND ss1.schedule_date = p_date
    AND ss1.status IN ('scheduled', 'confirmed')
    AND ss_prev.status IN ('scheduled', 'confirmed')
    AND EXTRACT(EPOCH FROM (ss1.shift_start - ss_prev.shift_end)) / 3600 < sp.min_hours_between_shifts
    
    UNION ALL
    
    -- Time off conflicts
    SELECT 
        'time_off_conflict'::VARCHAR,
        ss.staff_profile_id,
        au.full_name,
        ss.id,
        format('Shift scheduled during approved time off: %s - %s', 
            tor.start_date, tor.end_date),
        5
    FROM shift_schedules ss
    JOIN staff_profiles sp ON sp.id = ss.staff_profile_id
    JOIN auth_users au ON au.id = sp.user_id
    JOIN time_off_requests tor ON tor.staff_profile_id = ss.staff_profile_id
    WHERE ss.restaurant_id = p_restaurant_id
    AND ss.schedule_date = p_date
    AND ss.status IN ('scheduled', 'confirmed')
    AND tor.status = 'approved'
    AND ss.schedule_date BETWEEN tor.start_date AND tor.end_date
    
    UNION ALL
    
    -- Skill requirement not met
    SELECT 
        'skill_requirement'::VARCHAR,
        ss.staff_profile_id,
        au.full_name,
        ss.id,
        format('Staff member lacks required skills for position %s', ss.position),
        2
    FROM shift_schedules ss
    JOIN staff_profiles sp ON sp.id = ss.staff_profile_id
    JOIN auth_users au ON au.id = sp.user_id
    WHERE ss.restaurant_id = p_restaurant_id
    AND ss.schedule_date = p_date
    AND ss.status IN ('scheduled', 'confirmed')
    AND array_length(ss.required_skills, 1) > 0
    AND NOT EXISTS (
        SELECT 1 FROM staff_skill_assignments ssa
        WHERE ssa.staff_profile_id = ss.staff_profile_id
        AND ssa.skill_id = ANY(ss.required_skills)
        AND ssa.skill_level IN ('intermediate', 'advanced', 'expert', 'trainer')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to suggest optimal staff assignments
CREATE OR REPLACE FUNCTION suggest_optimal_assignments(
    p_restaurant_id UUID,
    p_date DATE,
    p_optimization_priority optimization_priority DEFAULT 'coverage'
)
RETURNS TABLE(
    position VARCHAR,
    shift_start TIME,
    shift_end TIME,
    suggested_staff_id UUID,
    staff_name VARCHAR,
    fit_score DECIMAL,
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH shift_requirements AS (
        SELECT DISTINCT
            ss.position,
            ss.shift_start::TIME as start_time,
            ss.shift_end::TIME as end_time,
            ss.required_skills,
            COUNT(*) as positions_needed
        FROM shift_schedules ss
        WHERE ss.restaurant_id = p_restaurant_id
        AND ss.schedule_date = p_date
        AND ss.status = 'scheduled'
        AND ss.staff_profile_id IS NULL -- unassigned shifts
        GROUP BY ss.position, ss.shift_start::TIME, ss.shift_end::TIME, ss.required_skills
    ),
    staff_fitness AS (
        SELECT 
            sr.position,
            sr.start_time,
            sr.end_time,
            sp.id as staff_id,
            au.full_name,
            -- Calculate fitness score based on multiple factors
            (
                -- Availability score (40%)
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM staff_availability sa 
                        WHERE sa.staff_profile_id = sp.id
                        AND EXTRACT(DOW FROM p_date) = sa.day_of_week
                        AND sa.start_time <= sr.start_time 
                        AND sa.end_time >= sr.end_time
                        AND sa.availability_status = 'available'
                    ) THEN 40
                    WHEN EXISTS (
                        SELECT 1 FROM staff_availability sa 
                        WHERE sa.staff_profile_id = sp.id
                        AND EXTRACT(DOW FROM p_date) = sa.day_of_week
                        AND sa.availability_status = 'preferred'
                    ) THEN 30
                    ELSE 10
                END +
                -- Skill match score (30%)
                CASE 
                    WHEN array_length(sr.required_skills, 1) IS NULL THEN 30
                    WHEN (
                        SELECT COUNT(*)
                        FROM staff_skill_assignments ssa
                        WHERE ssa.staff_profile_id = sp.id
                        AND ssa.skill_id = ANY(sr.required_skills)
                        AND ssa.skill_level IN ('advanced', 'expert', 'trainer')
                    ) = array_length(sr.required_skills, 1) THEN 30
                    WHEN (
                        SELECT COUNT(*)
                        FROM staff_skill_assignments ssa
                        WHERE ssa.staff_profile_id = sp.id
                        AND ssa.skill_id = ANY(sr.required_skills)
                        AND ssa.skill_level IN ('intermediate', 'advanced', 'expert', 'trainer')
                    ) >= array_length(sr.required_skills, 1) / 2 THEN 20
                    ELSE 5
                END +
                -- Experience and performance score (20%)
                COALESCE((
                    SELECT AVG(spm.reliability_score)
                    FROM staff_performance_metrics spm
                    WHERE spm.staff_profile_id = sp.id
                    AND spm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
                ), 15) * 0.2 +
                -- Workload balance score (10%) - prefer staff with fewer hours
                CASE 
                    WHEN (
                        SELECT COUNT(*)
                        FROM shift_schedules ss_count
                        WHERE ss_count.staff_profile_id = sp.id
                        AND ss_count.schedule_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
                        AND ss_count.status IN ('scheduled', 'confirmed')
                    ) < 5 THEN 10
                    WHEN (
                        SELECT COUNT(*)
                        FROM shift_schedules ss_count
                        WHERE ss_count.staff_profile_id = sp.id
                        AND ss_count.schedule_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
                        AND ss_count.status IN ('scheduled', 'confirmed')
                    ) < 7 THEN 5
                    ELSE 0
                END
            ) as fitness_score,
            -- Generate reasoning
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM staff_availability sa 
                    WHERE sa.staff_profile_id = sp.id
                    AND EXTRACT(DOW FROM p_date) = sa.day_of_week
                    AND sa.availability_status = 'preferred'
                ) THEN 'Preferred time slot, '
                ELSE ''
            END ||
            CASE 
                WHEN array_length(sr.required_skills, 1) > 0 AND (
                    SELECT COUNT(*)
                    FROM staff_skill_assignments ssa
                    WHERE ssa.staff_profile_id = sp.id
                    AND ssa.skill_id = ANY(sr.required_skills)
                    AND ssa.skill_level IN ('advanced', 'expert', 'trainer')
                ) = array_length(sr.required_skills, 1) THEN 'All required skills at advanced level, '
                WHEN array_length(sr.required_skills, 1) > 0 THEN 'Some required skills, '
                ELSE ''
            END ||
            'Good performance history' as reasoning
        FROM shift_requirements sr
        CROSS JOIN staff_profiles sp
        JOIN auth_users au ON au.id = sp.user_id
        WHERE p_restaurant_id = ANY(sp.work_locations)
        AND sp.active_from <= p_date
        AND (sp.active_to IS NULL OR sp.active_to >= p_date)
        -- Check no conflicting shifts
        AND NOT EXISTS (
            SELECT 1 FROM shift_schedules ss_conflict
            WHERE ss_conflict.staff_profile_id = sp.id
            AND ss_conflict.schedule_date = p_date
            AND ss_conflict.status IN ('scheduled', 'confirmed')
            AND (ss_conflict.shift_start::TIME, ss_conflict.shift_end::TIME) OVERLAPS (sr.start_time, sr.end_time)
        )
        -- Check no approved time off
        AND NOT EXISTS (
            SELECT 1 FROM time_off_requests tor
            WHERE tor.staff_profile_id = sp.id
            AND tor.status = 'approved'
            AND p_date BETWEEN tor.start_date AND tor.end_date
        )
    )
    SELECT 
        sf.position,
        sf.start_time,
        sf.end_time,
        sf.staff_id,
        sf.full_name,
        sf.fitness_score,
        sf.reasoning
    FROM staff_fitness sf
    WHERE sf.fitness_score > 50 -- Only suggest reasonably good matches
    ORDER BY sf.position, sf.start_time, sf.fitness_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check labor law compliance
CREATE OR REPLACE FUNCTION check_labor_compliance(
    p_restaurant_id UUID,
    p_staff_profile_id UUID,
    p_check_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    violation_count INTEGER := 0;
    weekly_hours DECIMAL;
    daily_hours DECIMAL;
    consecutive_days INTEGER;
    min_rest_hours INTEGER;
    staff_info RECORD;
BEGIN
    -- Get staff information
    SELECT * INTO staff_info
    FROM staff_profiles
    WHERE id = p_staff_profile_id;
    
    -- Check weekly hours limit
    SELECT COALESCE(SUM(shift_duration_hours), 0) INTO weekly_hours
    FROM shift_schedules
    WHERE staff_profile_id = p_staff_profile_id
    AND restaurant_id = p_restaurant_id
    AND schedule_date BETWEEN p_check_date - INTERVAL '6 days' AND p_check_date
    AND status IN ('scheduled', 'confirmed', 'completed');
    
    IF weekly_hours > staff_info.max_hours_per_week THEN
        INSERT INTO labor_compliance_checks (
            restaurant_id, staff_profile_id, check_date, check_period_start, check_period_end,
            compliance_category, rule_description, actual_value, required_value,
            compliance_status, violation_severity
        ) VALUES (
            p_restaurant_id, p_staff_profile_id, p_check_date,
            p_check_date - INTERVAL '6 days', p_check_date,
            'overtime', 'Maximum weekly hours exceeded',
            weekly_hours, staff_info.max_hours_per_week,
            'violation', 3
        );
        violation_count := violation_count + 1;
    END IF;
    
    -- Check daily hours limit
    SELECT COALESCE(SUM(shift_duration_hours), 0) INTO daily_hours
    FROM shift_schedules
    WHERE staff_profile_id = p_staff_profile_id
    AND restaurant_id = p_restaurant_id
    AND schedule_date = p_check_date
    AND status IN ('scheduled', 'confirmed', 'completed');
    
    IF daily_hours > staff_info.max_hours_per_day THEN
        INSERT INTO labor_compliance_checks (
            restaurant_id, staff_profile_id, check_date, check_period_start, check_period_end,
            compliance_category, rule_description, actual_value, required_value,
            compliance_status, violation_severity
        ) VALUES (
            p_restaurant_id, p_staff_profile_id, p_check_date,
            p_check_date, p_check_date,
            'max_hours', 'Maximum daily hours exceeded',
            daily_hours, staff_info.max_hours_per_day,
            'violation', 4
        );
        violation_count := violation_count + 1;
    END IF;
    
    -- Check consecutive days limit (simplified)
    SELECT COUNT(*) INTO consecutive_days
    FROM generate_series(p_check_date - INTERVAL '6 days', p_check_date, '1 day'::INTERVAL) AS date_range(day)
    WHERE EXISTS (
        SELECT 1 FROM shift_schedules ss
        WHERE ss.staff_profile_id = p_staff_profile_id
        AND ss.restaurant_id = p_restaurant_id
        AND ss.schedule_date = date_range.day::DATE
        AND ss.status IN ('scheduled', 'confirmed', 'completed')
    );
    
    IF consecutive_days > staff_info.max_consecutive_days THEN
        INSERT INTO labor_compliance_checks (
            restaurant_id, staff_profile_id, check_date, check_period_start, check_period_end,
            compliance_category, rule_description, actual_value, required_value,
            compliance_status, violation_severity
        ) VALUES (
            p_restaurant_id, p_staff_profile_id, p_check_date,
            p_check_date - INTERVAL '6 days', p_check_date,
            'rest_periods', 'Maximum consecutive days exceeded',
            consecutive_days, staff_info.max_consecutive_days,
            'violation', 2
        );
        violation_count := violation_count + 1;
    END IF;
    
    RETURN violation_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS FOR SCHEDULING AUTOMATION
-- ===========================================

-- Trigger to update performance metrics when shifts are completed
CREATE OR REPLACE FUNCTION trigger_update_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance metrics when shift status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO staff_performance_metrics (
            staff_profile_id, restaurant_id, metric_date,
            shifts_scheduled, shifts_completed, total_hours_scheduled, total_hours_worked,
            punctuality_score, labor_cost
        ) VALUES (
            NEW.staff_profile_id, NEW.restaurant_id, NEW.schedule_date,
            1, 1, NEW.shift_duration_hours,
            COALESCE(EXTRACT(EPOCH FROM (NEW.actual_end - NEW.actual_start)) / 3600, NEW.shift_duration_hours),
            CASE 
                WHEN NEW.actual_start IS NULL OR NEW.actual_start <= NEW.shift_start THEN 100
                WHEN NEW.actual_start <= NEW.shift_start + INTERVAL '5 minutes' THEN 90
                WHEN NEW.actual_start <= NEW.shift_start + INTERVAL '15 minutes' THEN 75
                ELSE 50
            END,
            NEW.total_pay
        )
        ON CONFLICT (staff_profile_id, restaurant_id, metric_date) DO UPDATE SET
            shifts_scheduled = staff_performance_metrics.shifts_scheduled + 1,
            shifts_completed = staff_performance_metrics.shifts_completed + 1,
            total_hours_scheduled = staff_performance_metrics.total_hours_scheduled + NEW.shift_duration_hours,
            total_hours_worked = staff_performance_metrics.total_hours_worked + 
                COALESCE(EXTRACT(EPOCH FROM (NEW.actual_end - NEW.actual_start)) / 3600, NEW.shift_duration_hours),
            punctuality_score = (staff_performance_metrics.punctuality_score + 
                CASE 
                    WHEN NEW.actual_start IS NULL OR NEW.actual_start <= NEW.shift_start THEN 100
                    WHEN NEW.actual_start <= NEW.shift_start + INTERVAL '5 minutes' THEN 90
                    WHEN NEW.actual_start <= NEW.shift_start + INTERVAL '15 minutes' THEN 75
                    ELSE 50
                END) / 2,
            labor_cost = staff_performance_metrics.labor_cost + NEW.total_pay;
    END IF;
    
    -- Update no-show metrics
    IF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
        INSERT INTO staff_performance_metrics (
            staff_profile_id, restaurant_id, metric_date,
            shifts_scheduled, shifts_no_show
        ) VALUES (
            NEW.staff_profile_id, NEW.restaurant_id, NEW.schedule_date, 1, 1
        )
        ON CONFLICT (staff_profile_id, restaurant_id, metric_date) DO UPDATE SET
            shifts_no_show = staff_performance_metrics.shifts_no_show + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shift_schedules_performance
    AFTER UPDATE ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION trigger_update_performance_metrics();

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all new tables
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_skill_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_coverage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_scheduling_analytics ENABLE ROW LEVEL SECURITY;

-- Staff profiles - access to own profile and managers can see their staff
CREATE POLICY "Staff profiles access policy"
ON staff_profiles FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IN (
        SELECT u.id FROM auth_users u
        JOIN restaurants r ON r.id = u.restaurant_id
        WHERE u.role IN ('admin', 'manager')
        AND r.id = ANY(work_locations)
    )
);

-- Shift schedules - restaurant and staff access
CREATE POLICY "Shift schedules access policy"
ON shift_schedules FOR ALL
TO authenticated
USING (
    restaurant_id IN (
        SELECT r.id FROM restaurants r
        JOIN auth_users u ON u.restaurant_id = r.id
        WHERE u.id = auth.uid()
        OR (u.role IN ('admin', 'manager') AND r.chain_id IN (
            SELECT r2.chain_id FROM restaurants r2
            JOIN auth_users u2 ON u2.restaurant_id = r2.id
            WHERE u2.id = auth.uid()
        ))
    )
    OR staff_profile_id IN (
        SELECT sp.id FROM staff_profiles sp
        WHERE sp.user_id = auth.uid()
    )
);

-- Time off requests - staff can see own requests, managers can see all
CREATE POLICY "Time off requests access policy"
ON time_off_requests FOR ALL
TO authenticated
USING (
    requested_by = auth.uid()
    OR staff_profile_id IN (
        SELECT sp.id FROM staff_profiles sp
        WHERE sp.user_id = auth.uid()
    )
    OR auth.uid() IN (
        SELECT u.id FROM auth_users u
        JOIN staff_profiles sp ON sp.user_id = auth.uid()
        JOIN restaurants r ON r.id = ANY(sp.work_locations)
        WHERE u.restaurant_id = r.id
        AND u.role IN ('admin', 'manager')
    )
);

-- ===========================================
-- SAMPLE SCHEDULING DATA
-- ===========================================

-- Insert sample staff skills
INSERT INTO staff_skills (chain_id, skill_code, skill_name, skill_name_th, skill_category) VALUES
('11111111-1111-1111-1111-111111111111', 'FOOD_PREP', 'Food Preparation', 'การเตรียมอาหาร', 'kitchen'),
('11111111-1111-1111-1111-111111111111', 'CUSTOMER_SERVICE', 'Customer Service', 'การบริการลูกค้า', 'service'),
('11111111-1111-1111-1111-111111111111', 'CASH_HANDLING', 'Cash Handling', 'การจัดการเงิน', 'service'),
('11111111-1111-1111-1111-111111111111', 'COOKING', 'Cooking', 'การทำอาหาร', 'kitchen'),
('11111111-1111-1111-1111-111111111111', 'CLEANING', 'Cleaning & Sanitation', 'การทำความสะอาด', 'maintenance');

-- Insert sample staff profile (for existing admin user)
INSERT INTO staff_profiles (
    user_id, employee_id, hire_date, employment_type, hourly_rate,
    max_hours_per_week, work_locations, is_supervisor, can_open_store, can_close_store
) VALUES (
    '660e8400-e29b-41d4-a716-446655440000', -- admin user ID
    'EMP001',
    '2024-01-15',
    'full_time',
    250.00, -- THB per hour
    40,
    ARRAY['550e8400-e29b-41d4-a716-446655440000']::UUID[],
    true,
    true,
    true
);

-- Insert sample staff availability
INSERT INTO staff_availability (
    staff_profile_id, day_of_week, start_time, end_time, availability_status
)
SELECT 
    sp.id,
    dow,
    '08:00'::TIME,
    '18:00'::TIME,
    'available'::availability_status
FROM staff_profiles sp
CROSS JOIN generate_series(1, 5) AS dow -- Monday to Friday
WHERE sp.employee_id = 'EMP001';

-- Insert sample skill assignments
INSERT INTO staff_skill_assignments (
    staff_profile_id, skill_id, skill_level, certified_date
)
SELECT 
    sp.id,
    ss.id,
    'expert'::skill_level,
    CURRENT_DATE
FROM staff_profiles sp
CROSS JOIN staff_skills ss
WHERE sp.employee_id = 'EMP001'
AND ss.skill_code IN ('CUSTOMER_SERVICE', 'CASH_HANDLING', 'CLEANING');

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_staff_profiles_updated_at 
    BEFORE UPDATE ON staff_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_skills_updated_at 
    BEFORE UPDATE ON staff_skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_skill_assignments_updated_at 
    BEFORE UPDATE ON staff_skill_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_templates_updated_at 
    BEFORE UPDATE ON schedule_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_availability_updated_at 
    BEFORE UPDATE ON staff_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at 
    BEFORE UPDATE ON time_off_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_schedules_updated_at 
    BEFORE UPDATE ON shift_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_coverage_requests_updated_at 
    BEFORE UPDATE ON shift_coverage_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_constraints_updated_at 
    BEFORE UPDATE ON scheduling_constraints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PERFORMANCE OPTIMIZATIONS
-- ===========================================

-- Analyze new tables for query optimization
ANALYZE staff_profiles;
ANALYZE staff_skills;
ANALYZE staff_skill_assignments;
ANALYZE schedule_templates;
ANALYZE staff_availability;
ANALYZE time_off_requests;
ANALYZE shift_schedules;
ANALYZE staff_performance_metrics;

-- Set statistics targets for better performance
ALTER TABLE staff_profiles ALTER COLUMN work_locations SET STATISTICS 1000;
ALTER TABLE shift_schedules ALTER COLUMN required_skills SET STATISTICS 1000;
ALTER TABLE schedule_templates ALTER COLUMN weekly_pattern SET STATISTICS 1000;

COMMENT ON MIGRATION IS 'Multi-location staff scheduling system with optimization algorithms, labor law compliance, and comprehensive performance analytics for enterprise restaurant chains';