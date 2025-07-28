-- Restaurant Krong Thai Task Management System
-- Seed Data for Task Management Tables
-- Created: 2025-07-28
-- Populates task management tables with sample data

-- ===========================================
-- STAFF SKILLS SEED DATA
-- ===========================================

-- Insert staff skills for existing users
INSERT INTO staff_skills (user_id, skill_name, skill_category, proficiency_level, certified, certification_date) VALUES
-- Admin skills
('660e8400-e29b-41d4-a716-446655440000', 'Task Management', 'Management', 5, true, CURRENT_DATE - INTERVAL '1 year'),
('660e8400-e29b-41d4-a716-446655440000', 'Staff Training', 'Training', 5, true, CURRENT_DATE - INTERVAL '1 year'),
('660e8400-e29b-41d4-a716-446655440000', 'Quality Control', 'Quality', 5, true, CURRENT_DATE - INTERVAL '1 year'),
('660e8400-e29b-41d4-a716-446655440000', 'SOP Development', 'Documentation', 5, true, CURRENT_DATE - INTERVAL '1 year'),

-- Manager skills
('770e8400-e29b-41d4-a716-446655440000', 'Kitchen Operations', 'Kitchen', 4, true, CURRENT_DATE - INTERVAL '6 months'),
('770e8400-e29b-41d4-a716-446655440000', 'Food Safety', 'Safety', 5, true, CURRENT_DATE - INTERVAL '3 months'),
('770e8400-e29b-41d4-a716-446655440000', 'Inventory Management', 'Inventory', 4, true, CURRENT_DATE - INTERVAL '6 months'),
('770e8400-e29b-41d4-a716-446655440000', 'Staff Supervision', 'Management', 4, false, NULL),
('770e8400-e29b-41d4-a716-446655440000', 'Customer Service', 'Service', 4, true, CURRENT_DATE - INTERVAL '1 year'),

-- Staff skills
('880e8400-e29b-41d4-a716-446655440000', 'Food Service', 'Service', 3, true, CURRENT_DATE - INTERVAL '3 months'),
('880e8400-e29b-41d4-a716-446655440000', 'Customer Service', 'Service', 4, true, CURRENT_DATE - INTERVAL '6 months'),
('880e8400-e29b-41d4-a716-446655440000', 'Cleaning', 'Maintenance', 3, false, NULL),
('880e8400-e29b-41d4-a716-446655440000', 'Cash Handling', 'Financial', 3, true, CURRENT_DATE - INTERVAL '8 months');

-- ===========================================
-- STAFF AVAILABILITY SEED DATA
-- ===========================================

-- Insert current week availability for all users
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 days',
    INTERVAL '1 day'
  )::date AS date
)
INSERT INTO staff_availability (user_id, restaurant_id, date, shift_start, shift_end, is_available, max_concurrent_tasks, current_workload_percentage)
SELECT 
  u.id,
  u.restaurant_id,
  ds.date,
  CASE 
    WHEN u.role = 'admin' THEN '08:00'
    WHEN u.role = 'manager' THEN '09:00'
    ELSE '10:00'
  END as shift_start,
  CASE 
    WHEN u.role = 'admin' THEN '18:00'
    WHEN u.role = 'manager' THEN '19:00'
    ELSE '18:00'
  END as shift_end,
  CASE 
    WHEN EXTRACT(dow FROM ds.date) IN (0, 6) AND u.role = 'staff' THEN false -- Staff off on weekends
    ELSE true
  END as is_available,
  CASE 
    WHEN u.role = 'admin' THEN 8
    WHEN u.role = 'manager' THEN 6
    ELSE 3
  END as max_concurrent_tasks,
  0 as current_workload_percentage
FROM auth_users u
CROSS JOIN date_series ds
WHERE u.is_active = true;

-- ===========================================
-- TASK TEMPLATES SEED DATA
-- ===========================================

-- Insert comprehensive task templates
INSERT INTO task_templates (
  id, restaurant_id, name, name_fr, description, description_fr, category, task_type,
  estimated_duration_minutes, priority, required_skills, equipment_needed, location_specific,
  locations, checklist_items, checklist_items_fr, sop_document_id, is_recurring, 
  recurrence_pattern, auto_assign_rules, approval_required, tags, created_by
) VALUES
-- Daily Cleaning Tasks
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Daily Kitchen Deep Clean',
  'Nettoyage approfondi quotidien de la cuisine',
  'Comprehensive daily cleaning of kitchen areas including equipment sanitization',
  'Nettoyage quotidien complet des zones de cuisine y compris la désinfection des équipements',
  'Daily Operations',
  'cleaning',
  45,
  'medium',
  '["Cleaning", "Food Safety"]',
  '["Sanitizer", "Cleaning Cloths", "Gloves"]',
  true,
  '["Kitchen", "Prep Area", "Storage"]',
  '[
    {"id": "1", "text": "Clean and sanitize all prep surfaces", "required": true, "estimated_minutes": 10, "order": 1},
    {"id": "2", "text": "Deep clean cooking equipment", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Sanitize refrigeration units", "required": true, "estimated_minutes": 10, "order": 3},
    {"id": "4", "text": "Clean floors and drains", "required": true, "estimated_minutes": 10, "order": 4}
  ]',
  '[
    {"id": "1", "text": "Nettoyer et désinfecter toutes les surfaces de préparation", "required": true, "estimated_minutes": 10, "order": 1},
    {"id": "2", "text": "Nettoyage en profondeur des équipements de cuisson", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Désinfecter les unités de réfrigération", "required": true, "estimated_minutes": 10, "order": 3},
    {"id": "4", "text": "Nettoyer les sols et les évacuations", "required": true, "estimated_minutes": 10, "order": 4}
  ]',
  NULL,
  true,
  '{
    "type": "daily",
    "interval": 1,
    "hour": 20,
    "minute": 0,
    "timezone": "Asia/Bangkok"
  }',
  '{
    "enabled": true,
    "required_skills": ["Cleaning", "Food Safety"],
    "skill_weight": 0.5,
    "availability_weight": 0.3,
    "workload_weight": 0.2,
    "location_weight": 0.0
  }',
  false,
  '["cleaning", "daily", "kitchen", "sanitization"]',
  '660e8400-e29b-41d4-a716-446655440000'
),

-- Food Safety Audit
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Food Safety Temperature Check',
  'Contrôle de température de sécurité alimentaire',
  'Systematic temperature monitoring of all food storage and preparation areas',
  'Surveillance systématique de la température de toutes les zones de stockage et de préparation des aliments',
  'Food Safety',
  'audit',
  20,
  'high',
  '["Food Safety", "Quality Control"]',
  '["Thermometer", "Log Sheet"]',
  true,
  '["Kitchen", "Storage", "Refrigeration"]',
  '[
    {"id": "1", "text": "Check refrigerator temperatures (≤4°C)", "required": true, "estimated_minutes": 5, "order": 1},
    {"id": "2", "text": "Check freezer temperatures (≤-18°C)", "required": true, "estimated_minutes": 5, "order": 2},
    {"id": "3", "text": "Verify hot holding temperatures (≥60°C)", "required": true, "estimated_minutes": 5, "order": 3},
    {"id": "4", "text": "Record all readings in log", "required": true, "estimated_minutes": 5, "order": 4}
  ]',
  '[
    {"id": "1", "text": "Vérifier les températures du réfrigérateur (≤4°C)", "required": true, "estimated_minutes": 5, "order": 1},
    {"id": "2", "text": "Vérifier les températures du congélateur (≤-18°C)", "required": true, "estimated_minutes": 5, "order": 2},
    {"id": "3", "text": "Vérifier les températures de maintien au chaud (≥60°C)", "required": true, "estimated_minutes": 5, "order": 3},
    {"id": "4", "text": "Enregistrer toutes les lectures dans le journal", "required": true, "estimated_minutes": 5, "order": 4}
  ]',
  NULL,
  true,
  '{
    "type": "daily",
    "interval": 1,
    "hour": 8,
    "minute": 0,
    "timezone": "Asia/Bangkok"
  }',
  '{
    "enabled": true,
    "required_skills": ["Food Safety"],
    "skill_weight": 0.6,
    "availability_weight": 0.3,
    "workload_weight": 0.1,
    "location_weight": 0.0
  }',
  true,
  '["food-safety", "temperature", "audit", "daily"]',
  '770e8400-e29b-41d4-a716-446655440000'
),

-- Inventory Management
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Weekly Inventory Count',
  'Inventaire hebdomadaire',
  'Complete weekly inventory count and stock level assessment',
  'Inventaire hebdomadaire complet et évaluation des niveaux de stock',
  'Inventory',
  'inventory',
  60,
  'medium',
  '["Inventory Management"]',
  '["Scanner", "Inventory Sheets", "Calculator"]',
  true,
  '["Storage", "Dry Goods", "Refrigeration"]',
  '[
    {"id": "1", "text": "Count dry goods inventory", "required": true, "estimated_minutes": 20, "order": 1},
    {"id": "2", "text": "Count refrigerated items", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Count frozen items", "required": true, "estimated_minutes": 10, "order": 3},
    {"id": "4", "text": "Update inventory system", "required": true, "estimated_minutes": 10, "order": 4},
    {"id": "5", "text": "Generate reorder report", "required": true, "estimated_minutes": 5, "order": 5}
  ]',
  '[
    {"id": "1", "text": "Compter l''inventaire des produits secs", "required": true, "estimated_minutes": 20, "order": 1},
    {"id": "2", "text": "Compter les articles réfrigérés", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Compter les articles congelés", "required": true, "estimated_minutes": 10, "order": 3},
    {"id": "4", "text": "Mettre à jour le système d''inventaire", "required": true, "estimated_minutes": 10, "order": 4},
    {"id": "5", "text": "Générer un rapport de réapprovisionnement", "required": true, "estimated_minutes": 5, "order": 5}
  ]',
  NULL,
  true,
  '{
    "type": "weekly",
    "interval": 1,
    "days_of_week": [1],
    "hour": 9,
    "minute": 0,
    "timezone": "Asia/Bangkok"
  }',
  '{
    "enabled": true,
    "required_skills": ["Inventory Management"],
    "skill_weight": 0.7,
    "availability_weight": 0.2,
    "workload_weight": 0.1,
    "location_weight": 0.0
  }',
  true,
  '["inventory", "weekly", "stock", "management"]',
  '770e8400-e29b-41d4-a716-446655440000'
),

-- Customer Service Training
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'New Staff Customer Service Orientation',
  'Orientation service client nouveau personnel',
  'Comprehensive customer service training for new staff members',
  'Formation complète au service client pour les nouveaux membres du personnel',
  'Training',
  'training',
  90,
  'high',
  '["Staff Training", "Customer Service"]',
  '["Training Materials", "Assessment Forms"]',
  false,
  '[]',
  '[
    {"id": "1", "text": "Review customer service standards", "required": true, "estimated_minutes": 20, "order": 1},
    {"id": "2", "text": "Practice greeting procedures", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Learn complaint handling process", "required": true, "estimated_minutes": 25, "order": 3},
    {"id": "4", "text": "Practice order taking", "required": true, "estimated_minutes": 20, "order": 4},
    {"id": "5", "text": "Complete assessment test", "required": true, "estimated_minutes": 10, "order": 5}
  ]',
  '[
    {"id": "1", "text": "Réviser les normes de service client", "required": true, "estimated_minutes": 20, "order": 1},
    {"id": "2", "text": "Pratiquer les procédures d''accueil", "required": true, "estimated_minutes": 15, "order": 2},
    {"id": "3", "text": "Apprendre le processus de traitement des plaintes", "required": true, "estimated_minutes": 25, "order": 3},
    {"id": "4", "text": "Pratiquer la prise de commande", "required": true, "estimated_minutes": 20, "order": 4},
    {"id": "5", "text": "Compléter le test d''évaluation", "required": true, "estimated_minutes": 10, "order": 5}
  ]',
  NULL,
  false,
  NULL,
  '{
    "enabled": false,
    "skill_weight": 0.4,
    "availability_weight": 0.3,
    "workload_weight": 0.2,
    "location_weight": 0.1
  }',
  true,
  '["training", "customer-service", "orientation", "new-staff"]',
  '660e8400-e29b-41d4-a716-446655440000'
),

-- Equipment Maintenance
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Monthly Equipment Maintenance',
  'Maintenance mensuelle des équipements',
  'Preventive maintenance check for all kitchen equipment',
  'Contrôle de maintenance préventive pour tous les équipements de cuisine',
  'Maintenance',
  'maintenance',
  120,
  'medium',
  '["Equipment Maintenance", "Safety"]',
  '["Tools", "Maintenance Log", "Safety Equipment"]',
  true,
  '["Kitchen", "Equipment Room"]',
  '[
    {"id": "1", "text": "Inspect oven and heating elements", "required": true, "estimated_minutes": 30, "order": 1},
    {"id": "2", "text": "Check refrigeration systems", "required": true, "estimated_minutes": 25, "order": 2},
    {"id": "3", "text": "Test ventilation and exhaust", "required": true, "estimated_minutes": 20, "order": 3},
    {"id": "4", "text": "Calibrate thermostats", "required": true, "estimated_minutes": 15, "order": 4},
    {"id": "5", "text": "Update maintenance records", "required": true, "estimated_minutes": 10, "order": 5},
    {"id": "6", "text": "Schedule any needed repairs", "required": false, "estimated_minutes": 20, "order": 6}
  ]',
  '[
    {"id": "1", "text": "Inspecter le four et les éléments chauffants", "required": true, "estimated_minutes": 30, "order": 1},
    {"id": "2", "text": "Vérifier les systèmes de réfrigération", "required": true, "estimated_minutes": 25, "order": 2},
    {"id": "3", "text": "Tester la ventilation et l''extraction", "required": true, "estimated_minutes": 20, "order": 3},
    {"id": "4", "text": "Calibrer les thermostats", "required": true, "estimated_minutes": 15, "order": 4},
    {"id": "5", "text": "Mettre à jour les dossiers de maintenance", "required": true, "estimated_minutes": 10, "order": 5},
    {"id": "6", "text": "Programmer les réparations nécessaires", "required": false, "estimated_minutes": 20, "order": 6}
  ]',
  NULL,
  true,
  '{
    "type": "monthly",
    "interval": 1,
    "day_of_month": 1,
    "hour": 14,
    "minute": 0,
    "timezone": "Asia/Bangkok"
  }',
  '{
    "enabled": true,
    "required_skills": ["Equipment Maintenance"],
    "preferred_skills": ["Safety"],
    "skill_weight": 0.6,
    "availability_weight": 0.3,
    "workload_weight": 0.1,
    "location_weight": 0.0
  }',
  true,
  '["maintenance", "equipment", "monthly", "preventive"]',
  '770e8400-e29b-41d4-a716-446655440000'
);

-- ===========================================
-- SAMPLE TASKS SEED DATA
-- ===========================================

-- Get template IDs for creating sample tasks
DO $$
DECLARE
    cleaning_template_id UUID;
    audit_template_id UUID;
    restaurant_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    admin_id UUID := '660e8400-e29b-41d4-a716-446655440000';
    manager_id UUID := '770e8400-e29b-41d4-a716-446655440000';
    staff_id UUID := '880e8400-e29b-41d4-a716-446655440000';
BEGIN
    -- Get template IDs
    SELECT id INTO cleaning_template_id FROM task_templates WHERE name = 'Daily Kitchen Deep Clean' LIMIT 1;
    SELECT id INTO audit_template_id FROM task_templates WHERE name = 'Food Safety Temperature Check' LIMIT 1;
    
    -- Insert sample tasks
    INSERT INTO tasks (
        restaurant_id, template_id, title, title_fr, description, description_fr,
        task_type, status, priority, scheduled_for, due_date, estimated_duration_minutes,
        location, required_skills, equipment_needed, checklist_items, checklist_items_fr,
        checklist_progress, assigned_to, assigned_by, assigned_at, created_by, tags
    ) VALUES
    -- Completed cleaning task from yesterday
    (
        restaurant_id,
        cleaning_template_id,
        'Daily Kitchen Deep Clean - ' || (CURRENT_DATE - INTERVAL '1 day')::text,
        'Nettoyage approfondi quotidien de la cuisine - ' || (CURRENT_DATE - INTERVAL '1 day')::text,
        'Yesterday''s kitchen cleaning task',
        'Tâche de nettoyage de cuisine d''hier',
        'cleaning',
        'completed',
        'medium',
        (CURRENT_DATE - INTERVAL '1 day') + TIME '20:00',
        (CURRENT_DATE - INTERVAL '1 day') + TIME '21:00',
        45,
        'Kitchen',
        '["Cleaning", "Food Safety"]',
        '["Sanitizer", "Cleaning Cloths", "Gloves"]',
        '[
            {"id": "1", "text": "Clean and sanitize all prep surfaces", "required": true, "estimated_minutes": 10, "order": 1},
            {"id": "2", "text": "Deep clean cooking equipment", "required": true, "estimated_minutes": 15, "order": 2},
            {"id": "3", "text": "Sanitize refrigeration units", "required": true, "estimated_minutes": 10, "order": 3},
            {"id": "4", "text": "Clean floors and drains", "required": true, "estimated_minutes": 10, "order": 4}
        ]',
        '[
            {"id": "1", "text": "Nettoyer et désinfecter toutes les surfaces de préparation", "required": true, "estimated_minutes": 10, "order": 1},
            {"id": "2", "text": "Nettoyage en profondeur des équipements de cuisson", "required": true, "estimated_minutes": 15, "order": 2},
            {"id": "3", "text": "Désinfecter les unités de réfrigération", "required": true, "estimated_minutes": 10, "order": 3},
            {"id": "4", "text": "Nettoyer les sols et les évacuations", "required": true, "estimated_minutes": 10, "order": 4}
        ]',
        '{"1": true, "2": true, "3": true, "4": true}',
        staff_id,
        manager_id,
        (CURRENT_DATE - INTERVAL '1 day') + TIME '19:30',
        manager_id,
        '["cleaning", "daily", "completed"]'
    ),
    
    -- Current food safety audit (in progress)
    (
        restaurant_id,
        audit_template_id,
        'Food Safety Temperature Check - ' || CURRENT_DATE::text,
        'Contrôle de température de sécurité alimentaire - ' || CURRENT_DATE::text,
        'Today''s temperature monitoring task',
        'Tâche de surveillance de température d''aujourd''hui',
        'audit',
        'in_progress',
        'high',
        CURRENT_DATE + TIME '08:00',
        CURRENT_DATE + TIME '09:00',
        20,
        'Kitchen',
        '["Food Safety", "Quality Control"]',
        '["Thermometer", "Log Sheet"]',
        '[
            {"id": "1", "text": "Check refrigerator temperatures (≤4°C)", "required": true, "estimated_minutes": 5, "order": 1},
            {"id": "2", "text": "Check freezer temperatures (≤-18°C)", "required": true, "estimated_minutes": 5, "order": 2},
            {"id": "3", "text": "Verify hot holding temperatures (≥60°C)", "required": true, "estimated_minutes": 5, "order": 3},
            {"id": "4", "text": "Record all readings in log", "required": true, "estimated_minutes": 5, "order": 4}
        ]',
        '[
            {"id": "1", "text": "Vérifier les températures du réfrigérateur (≤4°C)", "required": true, "estimated_minutes": 5, "order": 1},
            {"id": "2", "text": "Vérifier les températures du congélateur (≤-18°C)", "required": true, "estimated_minutes": 5, "order": 2},
            {"id": "3", "text": "Vérifier les températures de maintien au chaud (≥60°C)", "required": true, "estimated_minutes": 5, "order": 3},
            {"id": "4", "text": "Enregistrer toutes les lectures dans le journal", "required": true, "estimated_minutes": 5, "order": 4}
        ]',
        '{"1": true, "2": true, "3": false, "4": false}',
        manager_id,
        admin_id,
        CURRENT_DATE + TIME '07:45',
        admin_id,
        '["food-safety", "temperature", "in-progress"]'
    ),
    
    -- Pending cleaning task for tonight
    (
        restaurant_id,
        cleaning_template_id,
        'Daily Kitchen Deep Clean - ' || CURRENT_DATE::text,
        'Nettoyage approfondi quotidien de la cuisine - ' || CURRENT_DATE::text,
        'Tonight''s kitchen cleaning task',
        'Tâche de nettoyage de cuisine de ce soir',
        'cleaning',
        'assigned',
        'medium',
        CURRENT_DATE + TIME '20:00',
        CURRENT_DATE + TIME '21:00',
        45,
        'Kitchen',
        '["Cleaning", "Food Safety"]',
        '["Sanitizer", "Cleaning Cloths", "Gloves"]',
        '[
            {"id": "1", "text": "Clean and sanitize all prep surfaces", "required": true, "estimated_minutes": 10, "order": 1},
            {"id": "2", "text": "Deep clean cooking equipment", "required": true, "estimated_minutes": 15, "order": 2},
            {"id": "3", "text": "Sanitize refrigeration units", "required": true, "estimated_minutes": 10, "order": 3},
            {"id": "4", "text": "Clean floors and drains", "required": true, "estimated_minutes": 10, "order": 4}
        ]',
        '[
            {"id": "1", "text": "Nettoyer et désinfecter toutes les surfaces de préparation", "required": true, "estimated_minutes": 10, "order": 1},
            {"id": "2", "text": "Nettoyage en profondeur des équipements de cuisson", "required": true, "estimated_minutes": 15, "order": 2},
            {"id": "3", "text": "Désinfecter les unités de réfrigération", "required": true, "estimated_minutes": 10, "order": 3},
            {"id": "4", "text": "Nettoyer les sols et les évacuations", "required": true, "estimated_minutes": 10, "order": 4}
        ]',
        '{}',
        staff_id,
        manager_id,
        CURRENT_DATE + TIME '10:00',
        manager_id,
        '["cleaning", "daily", "scheduled"]'
    );
END $$;

-- ===========================================
-- TASK RECURRENCE SCHEDULES
-- ===========================================

-- Insert recurrence schedules for recurring templates
INSERT INTO task_recurrence (template_id, restaurant_id, name, recurrence_pattern, timezone, next_run_at, is_active, created_by)
SELECT 
    t.id,
    t.restaurant_id,
    t.name || ' - Auto Schedule',
    t.recurrence_pattern,
    COALESCE(t.recurrence_pattern->>'timezone', 'Asia/Bangkok'),
    CASE 
        WHEN t.recurrence_pattern->>'type' = 'daily' THEN 
            (CURRENT_DATE + INTERVAL '1 day' + TIME '20:00')::timestamptz
        WHEN t.recurrence_pattern->>'type' = 'weekly' THEN 
            (CURRENT_DATE + INTERVAL '7 days' + TIME '09:00')::timestamptz
        WHEN t.recurrence_pattern->>'type' = 'monthly' THEN 
            (CURRENT_DATE + INTERVAL '1 month' + TIME '14:00')::timestamptz
        ELSE 
            (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00')::timestamptz
    END,
    true,
    t.created_by
FROM task_templates t
WHERE t.is_recurring = true;

-- ===========================================
-- PERFORMANCE METRICS SEED DATA
-- ===========================================

-- Insert sample performance metrics for the last 7 days
INSERT INTO task_performance_metrics (
    restaurant_id, metric_date, total_tasks, completed_tasks, cancelled_tasks, overdue_tasks,
    avg_completion_time_minutes, on_time_completion_rate, avg_quality_score
)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date,
    (random() * 10 + 5)::integer, -- 5-15 total tasks per day
    (random() * 8 + 3)::integer,  -- 3-11 completed tasks per day
    (random() * 2)::integer,      -- 0-2 cancelled tasks per day
    (random() * 2)::integer,      -- 0-2 overdue tasks per day
    (random() * 30 + 20)::decimal(10,2), -- 20-50 minutes average completion time
    (random() * 20 + 80)::decimal(5,2),  -- 80-100% on-time completion rate
    (random() * 1 + 4)::decimal(3,2)     -- 4-5 average quality score
;

-- Update calculated metrics
UPDATE task_performance_metrics SET
    utilization_rate = (completed_tasks::decimal / NULLIF(total_tasks, 0)) * 100,
    productivity_score = CASE 
        WHEN avg_completion_time_minutes > 0 THEN 
            LEAST(100, (30.0 / avg_completion_time_minutes) * 100)
        ELSE 0 
    END,
    efficiency_trend = (on_time_completion_rate - 85) * 0.5; -- Relative to 85% baseline

-- ===========================================
-- FINAL ANALYTICS AND FUNCTIONS
-- ===========================================

-- Create a function to get scheduling statistics
CREATE OR REPLACE FUNCTION get_scheduling_stats(p_restaurant_id UUID)
RETURNS TABLE(
    total_recurring INTEGER,
    active_recurring INTEGER,
    scheduled_today INTEGER,
    scheduled_this_week INTEGER,
    overdue_tasks INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            (SELECT COUNT(*) FROM task_recurrence WHERE restaurant_id = p_restaurant_id) as total_rec,
            (SELECT COUNT(*) FROM task_recurrence WHERE restaurant_id = p_restaurant_id AND is_active = true) as active_rec,
            (SELECT COUNT(*) FROM tasks WHERE restaurant_id = p_restaurant_id AND DATE(scheduled_for) = CURRENT_DATE) as today,
            (SELECT COUNT(*) FROM tasks WHERE restaurant_id = p_restaurant_id AND scheduled_for BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as this_week,
            (SELECT COUNT(*) FROM tasks WHERE restaurant_id = p_restaurant_id AND due_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue
    )
    SELECT 
        stats.total_rec::INTEGER,
        stats.active_rec::INTEGER,
        stats.today::INTEGER,
        stats.this_week::INTEGER,
        stats.overdue::INTEGER
    FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Analyze all new tables for optimal performance
ANALYZE task_templates;
ANALYZE tasks;
ANALYZE staff_skills;
ANALYZE staff_availability;
ANALYZE task_assignments;
ANALYZE task_workflows;
ANALYZE workflow_executions;
ANALYZE task_recurrence;
ANALYZE task_notifications;
ANALYZE task_performance_metrics;

COMMENT ON SCHEMA public IS 'Task Management Seed Data - Comprehensive sample data for Restaurant Krong Thai task management system with templates, tasks, skills, schedules, and performance metrics';