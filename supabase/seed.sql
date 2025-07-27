-- Restaurant Krong Thai SOP Management System
-- Seed Data for Development and Testing
-- This file contains additional seed data beyond the basic migration

-- ===========================================
-- SAMPLE SOP DOCUMENTS
-- ===========================================

-- Sample Food Safety SOP
INSERT INTO sop_documents (
    id, category_id, restaurant_id, title, title_fr, 
    content, content_fr, steps, steps_fr,
    tags, tags_fr, status, priority, created_by
) VALUES (
    '990e8400-e29b-41d4-a716-446655440000',
    (SELECT id FROM sop_categories WHERE code = 'FOOD_SAFETY'),
    '550e8400-e29b-41d4-a716-446655440000',
    'Hand Washing Procedure',
    'Procédure de Lavage des Mains',
    'Proper hand washing is essential for food safety. This procedure must be followed by all kitchen and service staff before handling food, after using the restroom, and when switching between tasks.',
    'Le lavage correct des mains est essentiel pour la sécurité alimentaire. Cette procédure doit être suivie par tout le personnel de cuisine et de service avant de manipuler les aliments, après être allé aux toilettes, et lors du changement de tâches.',
    '[
        {"step": 1, "action": "Remove jewelry and roll up sleeves", "duration": "5 seconds"},
        {"step": 2, "action": "Wet hands with warm water", "duration": "5 seconds"},
        {"step": 3, "action": "Apply soap and lather for 20 seconds", "duration": "20 seconds"},
        {"step": 4, "action": "Scrub between fingers and under nails", "duration": "10 seconds"},
        {"step": 5, "action": "Rinse thoroughly with warm water", "duration": "10 seconds"},
        {"step": 6, "action": "Dry with clean paper towel", "duration": "5 seconds"},
        {"step": 7, "action": "Use towel to turn off faucet", "duration": "2 seconds"}
    ]'::JSONB,
    '[
        {"step": 1, "action": "Retirer les bijoux et retrousser les manches", "duration": "5 secondes"},
        {"step": 2, "action": "Mouiller les mains avec de l''eau tiède", "duration": "5 secondes"},
        {"step": 3, "action": "Appliquer du savon et faire mousser pendant 20 secondes", "duration": "20 secondes"},
        {"step": 4, "action": "Frotter entre les doigts et sous les ongles", "duration": "10 secondes"},
        {"step": 5, "action": "Rincer abondamment à l''eau tiède", "duration": "10 secondes"},
        {"step": 6, "action": "Sécher avec une serviette en papier propre", "duration": "5 secondes"},
        {"step": 7, "action": "Utiliser la serviette pour fermer le robinet", "duration": "2 secondes"}
    ]'::JSONB,
    ARRAY['hygiene', 'food safety', 'handwashing', 'sanitization'],
    ARRAY['hygiène', 'sécurité alimentaire', 'lavage des mains', 'désinfection'],
    'approved',
    'high',
    '660e8400-e29b-41d4-a716-446655440000'
);

-- Sample Customer Service SOP
INSERT INTO sop_documents (
    id, category_id, restaurant_id, title, title_fr,
    content, content_fr, steps, steps_fr,
    tags, tags_fr, status, priority, created_by
) VALUES (
    '991e8400-e29b-41d4-a716-446655440000',
    (SELECT id FROM sop_categories WHERE code = 'CUSTOMER_SERVICE'),
    '550e8400-e29b-41d4-a716-446655440000',
    'Greeting and Seating Guests',
    'Accueil et Installation des Clients',
    'First impressions matter. This procedure ensures all guests receive a warm, professional welcome that reflects our Thai hospitality values.',
    'Les premières impressions comptent. Cette procédure garantit que tous les clients reçoivent un accueil chaleureux et professionnel qui reflète nos valeurs d''hospitalité thaïlandaise.',
    '[
        {"step": 1, "action": "Greet within 30 seconds with smile and wai", "note": "Use traditional Thai greeting"},
        {"step": 2, "action": "Ask about reservation or party size", "note": "Be prepared with seating options"},
        {"step": 3, "action": "Guide to appropriate table", "note": "Consider guest preferences and accessibility"},
        {"step": 4, "action": "Present menus and explain specials", "note": "Highlight popular Thai dishes"},
        {"step": 5, "action": "Offer water and ask about drinks", "note": "Suggest traditional Thai beverages"}
    ]'::JSONB,
    '[
        {"step": 1, "action": "Saluer dans les 30 secondes avec un sourire et un wai", "note": "Utiliser la salutation traditionnelle thaïlandaise"},
        {"step": 2, "action": "Demander s''il y a une réservation ou la taille du groupe", "note": "Être prêt avec les options de places"},
        {"step": 3, "action": "Accompagner à la table appropriée", "note": "Considérer les préférences des clients et l''accessibilité"},
        {"step": 4, "action": "Présenter les menus et expliquer les spécialités", "note": "Mettre en avant les plats thaïlandais populaires"},
        {"step": 5, "action": "Offrir de l''eau et demander pour les boissons", "note": "Suggérer des boissons traditionnelles thaïlandaises"}
    ]'::JSONB,
    ARRAY['customer service', 'greeting', 'hospitality', 'thai culture'],
    ARRAY['service client', 'accueil', 'hospitalité', 'culture thaïlandaise'],
    'approved',
    'medium',
    '770e8400-e29b-41d4-a716-446655440000'
);

-- ===========================================
-- SAMPLE FORM TEMPLATES
-- ===========================================

-- Daily Food Safety Checklist Template
INSERT INTO form_templates (
    id, restaurant_id, name, name_th, description, description_th,
    category, schema, schema_th, validation_rules, created_by
) VALUES (
    '992e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'Daily Food Safety Checklist',
    'รายการตรวจสอบความปลอดภัยอาหารประจำวัน',
    'Daily checklist to ensure food safety standards compliance',
    'รายการตรวจสอบประจำวันเพื่อให้แน่ใจว่าปฏิบัติตามมาตรฐานความปลอดภัยอาหาร',
    'food_safety',
    '{
        "fields": [
            {
                "id": "refrigerator_temp",
                "type": "number",
                "label": "Refrigerator Temperature (°C)",
                "required": true,
                "min": 0,
                "max": 5
            },
            {
                "id": "freezer_temp", 
                "type": "number",
                "label": "Freezer Temperature (°C)",
                "required": true,
                "min": -20,
                "max": -15
            },
            {
                "id": "hand_wash_stations",
                "type": "checkbox",
                "label": "Hand wash stations stocked",
                "required": true
            },
            {
                "id": "sanitizer_levels",
                "type": "select",
                "label": "Sanitizer levels",
                "options": ["Full", "Half", "Low", "Empty"],
                "required": true
            },
            {
                "id": "food_storage_check",
                "type": "checkbox",
                "label": "Food storage areas clean and organized",
                "required": true
            },
            {
                "id": "notes",
                "type": "textarea",
                "label": "Additional Notes",
                "required": false
            }
        ]
    }'::JSONB,
    '{
        "fields": [
            {
                "id": "refrigerator_temp",
                "type": "number", 
                "label": "อุณหภูมิตู้เย็น (°C)",
                "required": true,
                "min": 0,
                "max": 5
            },
            {
                "id": "freezer_temp",
                "type": "number",
                "label": "อุณหภูมิตู้แช่แข็ง (°C)", 
                "required": true,
                "min": -20,
                "max": -15
            },
            {
                "id": "hand_wash_stations",
                "type": "checkbox",
                "label": "จุดล้างมือมีสิ่งของครบ",
                "required": true
            },
            {
                "id": "sanitizer_levels",
                "type": "select",
                "label": "ระดับน้ำยาฆ่าเชื้อ",
                "options": ["เต็ม", "ครึ่ง", "น้อย", "หมด"],
                "required": true
            },
            {
                "id": "food_storage_check",
                "type": "checkbox", 
                "label": "พื้นที่เก็บอาหารสะอาดและเป็นระเบียบ",
                "required": true
            },
            {
                "id": "notes",
                "type": "textarea",
                "label": "หมายเหตุเพิ่มเติม",
                "required": false
            }
        ]
    }'::JSONB,
    '{
        "required_fields": ["refrigerator_temp", "freezer_temp", "hand_wash_stations", "sanitizer_levels", "food_storage_check"],
        "temperature_ranges": {
            "refrigerator": {"min": 0, "max": 5},
            "freezer": {"min": -20, "max": -15}
        }
    }'::JSONB,
    '660e8400-e29b-41d4-a716-446655440000'
);

-- ===========================================
-- SAMPLE FORM SUBMISSIONS
-- ===========================================

-- Sample form submission for today
INSERT INTO form_submissions (
    id, template_id, restaurant_id, submitted_by, data,
    location, submission_date, status
) VALUES (
    '993e8400-e29b-41d4-a716-446655440000',
    '992e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    '{
        "refrigerator_temp": 3,
        "freezer_temp": -18,
        "hand_wash_stations": true,
        "sanitizer_levels": "Full",
        "food_storage_check": true,
        "notes": "All temperatures within acceptable range. Restocked soap at station 2.",
        "submitted_at": "2025-07-26T07:30:00Z",
        "shift": "morning"
    }'::JSONB,
    'Kitchen',
    CURRENT_DATE,
    'submitted'
);

-- ===========================================
-- AUDIT LOG SAMPLES
-- ===========================================

-- Log the form submission
SELECT log_audit_event(
    '550e8400-e29b-41d4-a716-446655440000'::UUID, -- restaurant_id
    '880e8400-e29b-41d4-a716-446655440000'::UUID, -- user_id  
    'CREATE'::audit_action,                        -- action
    'form_submissions',                            -- resource_type
    '993e8400-e29b-41d4-a716-446655440000'::UUID, -- resource_id
    NULL,                                          -- old_values
    '{"form_type": "food_safety_checklist", "shift": "morning"}'::JSONB, -- new_values
    '{"source": "tablet", "location": "kitchen"}'::JSONB -- metadata
);

-- Log SOP document creation
SELECT log_audit_event(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    '660e8400-e29b-41d4-a716-446655440000'::UUID,
    'CREATE'::audit_action,
    'sop_documents',
    '990e8400-e29b-41d4-a716-446655440000'::UUID,
    NULL,
    '{"title": "Hand Washing Procedure", "category": "FOOD_SAFETY", "status": "approved"}'::JSONB,
    '{"source": "admin_panel", "created_by_role": "admin"}'::JSONB
);

-- ===========================================
-- PERFORMANCE TEST DATA
-- ===========================================

-- Create additional sample users for testing
INSERT INTO auth_users (email, pin_hash, role, full_name, full_name_th, position, position_th, restaurant_id, is_active) VALUES
('chef@krongthai.com', crypt('2468', gen_salt('bf')), 'staff', 'Narong Chomchai', 'ณรงค์ โฉมฉาย', 'Head Chef', 'หัวหน้าเชฟ', '550e8400-e29b-41d4-a716-446655440000', true),
('server1@krongthai.com', crypt('1357', gen_salt('bf')), 'staff', 'Siriporn Thanakit', 'ศิริพร ธนกิจ', 'Senior Server', 'พนักงานเสิร์ฟอาวุโส', '550e8400-e29b-41d4-a716-446655440000', true),
('server2@krongthai.com', crypt('3579', gen_salt('bf')), 'staff', 'Kamon Jittra', 'กมล จิตรา', 'Server', 'พนักงานเสิร์ฟ', '550e8400-e29b-41d4-a716-446655440000', true),
('cashier@krongthai.com', crypt('4680', gen_salt('bf')), 'staff', 'Pensiri Moonsom', 'เพ็ญศิริ มูลส้ม', 'Cashier', 'แคชเชียร์', '550e8400-e29b-41d4-a716-446655440000', true);

-- Create sample SOP documents for other categories
INSERT INTO sop_documents (
    category_id, restaurant_id, title, title_th,
    content, content_th, status, priority, created_by
) VALUES
-- Cleaning SOP
((SELECT id FROM sop_categories WHERE code = 'CLEANING'), '550e8400-e29b-41d4-a716-446655440000',
 'End of Day Cleaning Checklist', 'รายการทำความสะอาดปิดวัน',
 'Comprehensive cleaning procedures to be completed at the end of each service day.',
 'ขั้นตอนการทำความสะอาดครบถ้วนที่ต้องทำเมื่อสิ้นสุดการบริการแต่ละวัน',
 'approved', 'high', '770e8400-e29b-41d4-a716-446655440000'),

-- Kitchen Operations SOP  
((SELECT id FROM sop_categories WHERE code = 'KITCHEN_OPS'), '550e8400-e29b-41d4-a716-446655440000',
 'Pad Thai Preparation Standard', 'มาตรฐานการทำผัดไทย',
 'Step-by-step guide for preparing authentic Pad Thai according to restaurant standards.',
 'คู่มือทำผัดไทยแท้ตามมาตรฐานร้านอาหารทีละขั้นตอน',
 'approved', 'medium', '660e8400-e29b-41d4-a716-446655440000'),

-- Cash Handling SOP
((SELECT id FROM sop_categories WHERE code = 'CASH_HANDLING'), '550e8400-e29b-41d4-a716-446655440000',
 'Point of Sale System Operation', 'การใช้งานระบบขายหน้าร้าน',
 'Complete guide for operating the POS system including payment processing and reporting.',
 'คู่มือการใช้งานระบบ POS รวมถึงการประมวลผลการชำระเงินและการรายงาน',
 'approved', 'medium', '770e8400-e29b-41d4-a716-446655440000');

COMMENT ON TABLE restaurants IS 'Multi-tenant restaurant information with bilingual support';
COMMENT ON TABLE auth_users IS 'PIN-based authentication system for restaurant staff';  
COMMENT ON TABLE sop_categories IS '16 standard categories covering all restaurant operations';
COMMENT ON TABLE sop_documents IS 'Bilingual SOP documents with structured content and full-text search';
COMMENT ON TABLE form_templates IS 'Dynamic form templates for data collection and compliance';
COMMENT ON TABLE form_submissions IS 'User-submitted form data with audit trail';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for all system operations';

-- Refresh materialized views and update statistics
ANALYZE;