-- SOP System Seed Data and Sample Records
-- Restaurant Krong Thai SOP Management System
-- Created: 2025-07-28
-- Purpose: Sample data for testing and demonstration of the SOP workflow system

-- ===========================================
-- SAMPLE SOP DOCUMENTS
-- ===========================================

-- Insert sample SOP documents for different categories
INSERT INTO sop_documents (
    id,
    category_id,
    restaurant_id,
    title,
    title_th,
    content,
    content_th,
    steps,
    steps_th,
    tags,
    tags_th,
    version,
    status,
    priority,
    effective_date,
    review_date,
    created_by,
    is_active
) VALUES 
-- Food Safety SOP
(
    gen_random_uuid(),
    (SELECT id FROM sop_categories WHERE code = 'FOOD_SAFETY'),
    '550e8400-e29b-41d4-a716-446655440000',
    'Temperature Control for Cold Storage',
    'การควบคุมอุณหภูมิสำหรับการเก็บรักษาแบบเย็น',
    'Standard operating procedure for maintaining proper temperature control in cold storage areas to ensure food safety and prevent spoilage.',
    'ขั้นตอนมาตรฐานสำหรับการรักษาการควบคุมอุณหภูมิที่เหมาะสมในพื้นที่เก็บรักษาแบบเย็นเพื่อให้มั่นใจในความปลอดภัยของอาหารและป้องกันการเสื่อมเสีย',
    '[
        {"step": 1, "title": "Check refrigerator temperature", "description": "Verify temperature is between 32-40°F (0-4°C)", "duration": 2},
        {"step": 2, "title": "Record temperature log", "description": "Document temperature readings in log book", "duration": 3},
        {"step": 3, "title": "Check freezer temperature", "description": "Verify temperature is 0°F (-18°C) or below", "duration": 2},
        {"step": 4, "title": "Inspect food items", "description": "Check for signs of spoilage or temperature abuse", "duration": 5}
    ]',
    '[
        {"step": 1, "title": "ตรวจสอบอุณหภูมิตู้เย็น", "description": "ตรวจสอบอุณหภูมิระหว่าง 32-40°F (0-4°C)", "duration": 2},
        {"step": 2, "title": "บันทึกอุณหภูมิ", "description": "บันทึกการอ่านอุณหภูมิในสมุดบันทึก", "duration": 3},
        {"step": 3, "title": "ตรวจสอบอุณหภูมิช่องแช่แข็ง", "description": "ตรวจสอบอุณหภูมิ 0°F (-18°C) หรือต่ำกว่า", "duration": 2},
        {"step": 4, "title": "ตรวจสอบอาหาร", "description": "ตรวจหาสัญญาณของการเสื่อมเสียหรือการใช้อุณหภูมิไม่เหมาะสม", "duration": 5}
    ]',
    ARRAY['temperature', 'food safety', 'cold storage', 'HACCP'],
    ARRAY['อุณหภูมิ', 'ความปลอดภัยอาหาร', 'การเก็บรักษาแบบเย็น', 'HACCP'],
    1,
    'approved',
    'critical',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 months',
    '660e8400-e29b-41d4-a716-446655440000',
    true
),
-- Cleaning SOP
(
    gen_random_uuid(),
    (SELECT id FROM sop_categories WHERE code = 'CLEANING'),
    '550e8400-e29b-41d4-a716-446655440000',
    'Daily Kitchen Sanitization',
    'การฆ่าเชื้อครัวประจำวัน',
    'Complete sanitization procedure for kitchen surfaces, equipment, and utensils to maintain hygiene standards.',
    'ขั้นตอนการฆ่าเชื้อที่สมบูรณ์สำหรับพื้นผิวครัว อุปกรณ์ และเครื่องใช้เพื่อรักษามาตรฐานสุขอนามัย',
    '[
        {"step": 1, "title": "Clear and clean surfaces", "description": "Remove all items and clean with approved sanitizer", "duration": 10},
        {"step": 2, "title": "Sanitize cutting boards", "description": "Use chlorine solution and allow to air dry", "duration": 5},
        {"step": 3, "title": "Clean equipment", "description": "Sanitize all food preparation equipment", "duration": 15},
        {"step": 4, "title": "Replace sanitizer solution", "description": "Prepare fresh sanitizer for next use", "duration": 3}
    ]',
    '[
        {"step": 1, "title": "ทำความสะอาดพื้นผิว", "description": "นำของออกทั้งหมดและทำความสะอาดด้วยน้ำยาฆ่าเชื้อที่อนุมัติ", "duration": 10},
        {"step": 2, "title": "ฆ่าเชื้อเขียง", "description": "ใช้สารละลายคลอรีนและปล่อยให้แห้งในอากาศ", "duration": 5},
        {"step": 3, "title": "ทำความสะอาดอุปกรณ์", "description": "ฆ่าเชื้ออุปกรณ์เตรียมอาหารทั้งหมด", "duration": 15},
        {"step": 4, "title": "เปลี่ยนน้ำยาฆ่าเชื้อ", "description": "เตรียมน้ำยาฆ่าเชื้อใหม่สำหรับการใช้งานครั้งต่อไป", "duration": 3}
    ]',
    ARRAY['cleaning', 'sanitization', 'kitchen', 'hygiene'],
    ARRAY['การทำความสะอาด', 'การฆ่าเชื้อ', 'ครัว', 'สุขอนามัย'],
    1,
    'approved',
    'high',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 months',
    '660e8400-e29b-41d4-a716-446655440000',
    true
),
-- Customer Service SOP
(
    gen_random_uuid(),
    (SELECT id FROM sop_categories WHERE code = 'CUSTOMER_SERVICE'),
    '550e8400-e29b-41d4-a716-446655440000',
    'Guest Complaint Resolution',
    'การแก้ไขข้อร้องเรียนของแขก',
    'Standard procedure for handling guest complaints professionally and ensuring customer satisfaction.',
    'ขั้นตอนมาตรฐานสำหรับการจัดการข้อร้องเรียนของแขกอย่างมืออาชีพและให้มั่นใจในความพึงพอใจของลูกค้า',
    '[
        {"step": 1, "title": "Listen actively", "description": "Give full attention to the guest and let them explain", "duration": 5},
        {"step": 2, "title": "Acknowledge concern", "description": "Show empathy and understanding", "duration": 2},
        {"step": 3, "title": "Investigate issue", "description": "Gather facts and assess the situation", "duration": 5},
        {"step": 4, "title": "Propose solution", "description": "Offer appropriate resolution options", "duration": 3},
        {"step": 5, "title": "Follow up", "description": "Ensure guest satisfaction with resolution", "duration": 2}
    ]',
    '[
        {"step": 1, "title": "ฟังอย่างตั้งใจ", "description": "ให้ความสนใจเต็มที่กับแขกและให้พวกเขาอธิบาย", "duration": 5},
        {"step": 2, "title": "รับทราบความกังวล", "description": "แสดงความเห็นอกเห็นใจและความเข้าใจ", "duration": 2},
        {"step": 3, "title": "ตรวจสอบปัญหา", "description": "รวบรวมข้อเท็จจริงและประเมินสถานการณ์", "duration": 5},
        {"step": 4, "title": "เสนอวิธีแก้ไข", "description": "เสนอตัวเลือกการแก้ไขที่เหมาะสม", "duration": 3},
        {"step": 5, "title": "ติดตาม", "description": "ให้มั่นใจในความพึงพอใจของแขกกับการแก้ไข", "duration": 2}
    ]',
    ARRAY['customer service', 'complaints', 'resolution', 'satisfaction'],
    ARRAY['การบริการลูกค้า', 'ข้อร้องเรียน', 'การแก้ไข', 'ความพึงพอใจ'],
    1,
    'approved',
    'medium',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 months',
    '660e8400-e29b-41d4-a716-446655440000',
    true
);

-- ===========================================
-- SAMPLE SOP STEPS (Detailed)
-- ===========================================

-- Insert detailed steps for the first SOP (Temperature Control)
INSERT INTO sop_steps (
    sop_document_id,
    step_number,
    title,
    title_th,
    description,
    description_th,
    instructions,
    instructions_th,
    estimated_duration_minutes,
    requires_photo,
    requires_manager_approval,
    critical_control_point,
    safety_warnings,
    safety_warnings_th,
    equipment_required,
    sort_order
) 
SELECT 
    d.id,
    1,
    'Check Refrigerator Temperature',
    'ตรวจสอบอุณหภูมิตู้เย็น',
    'Use calibrated thermometer to verify refrigerator temperature is within safe range',
    'ใช้เทอร์โมมิเตอร์ที่ปรับเทียบแล้วเพื่อตรวจสอบอุณหภูมิตู้เย็นอยู่ในระดับที่ปลอดภัย',
    '{"steps": ["Locate thermometer in refrigerator", "Read temperature display", "Check against acceptable range", "Document any deviations"]}',
    '{"steps": ["หาเทอร์โมมิเตอร์ในตู้เย็น", "อ่านการแสดงอุณหภูมิ", "ตรวจสอบกับช่วงที่ยอมรับได้", "บันทึกความผิดปกติใดๆ"]}',
    2,
    true,
    false,
    true,
    'Ensure hands are clean before touching equipment',
    'ให้มั่นใจว่ามือสะอาดก่อนสัมผัสอุปกรณ์',
    ARRAY[]::UUID[],
    1
FROM sop_documents d 
WHERE d.title = 'Temperature Control for Cold Storage';

-- Add more steps for the same SOP
INSERT INTO sop_steps (
    sop_document_id,
    step_number,
    title,
    title_th,
    description,
    description_th,
    instructions,
    instructions_th,
    estimated_duration_minutes,
    requires_photo,
    requires_manager_approval,
    critical_control_point,
    sort_order
) 
SELECT 
    d.id,
    2,
    'Record Temperature in Log',
    'บันทึกอุณหภูมิในสมุดบันทึก',
    'Document the temperature reading with date, time, and staff initials',
    'บันทึกการอ่านอุณหภูมิพร้อมวันที่ เวลา และตัวย่อของพนักงาน',
    '{"steps": ["Open temperature log book", "Write current date and time", "Record temperature reading", "Initial entry"]}',
    '{"steps": ["เปิดสมุดบันทึกอุณหภูมิ", "เขียนวันที่และเวลาปัจจุบัน", "บันทึกการอ่านอุณหภูมิ", "ลงชื่อตัวย่อ"]}',
    3,
    false,
    false,
    true,
    2
FROM sop_documents d 
WHERE d.title = 'Temperature Control for Cold Storage';

-- ===========================================
-- SAMPLE EQUIPMENT
-- ===========================================

-- Insert sample equipment
INSERT INTO sop_equipment (
    restaurant_id,
    name,
    name_th,
    description,
    description_th,
    category,
    status,
    location,
    responsible_person,
    maintenance_schedule,
    operating_instructions,
    operating_instructions_th,
    safety_notes,
    safety_notes_th,
    next_maintenance_date,
    is_critical,
    requires_training
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Digital Thermometer - Walk-in Cooler',
    'เทอร์โมมิเตอร์ดิจิทัล - ห้องเย็น',
    'High-precision digital thermometer for monitoring cold storage temperature',
    'เทอร์โมมิเตอร์ดิจิทัลความแม่นยำสูงสำหรับตรวจสอบอุณหภูมิห้องเย็น',
    'temperature_monitoring',
    'available',
    'Walk-in Cooler - Main Kitchen',
    '770e8400-e29b-41d4-a716-446655440000',
    '{"frequency": "monthly", "tasks": ["calibration", "battery_check", "sensor_cleaning"]}',
    'Check display readings every 2 hours. Replace batteries when low battery indicator appears.',
    'ตรวจสอบการแสดงผลทุก 2 ชั่วโมง เปลี่ยนแบตเตอรี่เมื่อตัวบ่งชี้แบตเตอรี่ต่ำปรากฏ',
    'Do not submerge in water. Handle with care to avoid damage to sensor.',
    'ห้ามจุ่มลงในน้ำ จับใช้อย่างระมัดระวังเพื่อหลีกเลี่ยงความเสียหายต่อเซ็นเซอร์',
    CURRENT_DATE + INTERVAL '15 days',
    true,
    false
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Commercial Sanitizer Dispenser',
    'เครื่องจ่ายน้ำยาฆ่าเชื้อเชิงพาณิชย์',
    'Automatic sanitizer dispenser for hand hygiene',
    'เครื่องจ่ายน้ำยาฆ่าเชื้ออัตโนมัติสำหรับสุขอนามัยมือ',
    'cleaning',
    'available',
    'Kitchen Entrance',
    '880e8400-e29b-41d4-a716-446655440000',
    '{"frequency": "weekly", "tasks": ["refill_sanitizer", "clean_dispenser", "check_sensor"]}',
    'Refill when level drops below 25%. Use only approved sanitizer solution.',
    'เติมเมื่อระดับลดลงต่ำกว่า 25% ใช้เฉพาะน้ำยาฆ่าเชื้อที่อนุมัติเท่านั้น',
    'Avoid direct contact with sanitizer concentrate. Wash hands after maintenance.',
    'หลีกเลี่ยงการสัมผัสโดยตรงกับน้ำยาฆ่าเชื้อเข้มข้น ล้างมือหลังการบำรุงรักษา',
    CURRENT_DATE + INTERVAL '3 days',
    false,
    false
);

-- ===========================================
-- SAMPLE SCHEDULES
-- ===========================================

-- Insert sample recurring schedules
INSERT INTO sop_schedules (
    sop_document_id,
    restaurant_id,
    name,
    name_th,
    description,
    description_th,
    frequency,
    frequency_details,
    start_date,
    time_of_day,
    days_of_week,
    auto_assign,
    default_assigned_to,
    estimated_duration_minutes,
    priority,
    notification_settings,
    next_generation_at,
    created_by
) 
SELECT 
    d.id,
    '550e8400-e29b-41d4-a716-446655440000',
    'Daily Temperature Monitoring',
    'การตรวจสอบอุณหภูมิประจำวัน',
    'Automated daily assignment for temperature control checks',
    'การมอบหมายงานอัตโนมัติประจำวันสำหรับการตรวจสอบการควบคุมอุณหภูมิ',
    'daily',
    '{"times_per_day": 3, "intervals": [480, 720, 1080]}', -- 8:00, 12:00, 18:00 in minutes
    CURRENT_DATE,
    '08:00:00',
    ARRAY[1, 2, 3, 4, 5, 6, 7], -- All days
    true,
    '880e8400-e29b-41d4-a716-446655440000',
    15,
    'critical',
    '{"remind_before_minutes": 30, "escalate_after_hours": 2}',
    NOW() + INTERVAL '1 day',
    '770e8400-e29b-41d4-a716-446655440000'
FROM sop_documents d 
WHERE d.title = 'Temperature Control for Cold Storage';

INSERT INTO sop_schedules (
    sop_document_id,
    restaurant_id,
    name,
    name_th,
    description,
    description_th,
    frequency,
    frequency_details,
    start_date,
    time_of_day,
    days_of_week,
    auto_assign,
    default_assigned_to,
    estimated_duration_minutes,
    priority,
    notification_settings,
    next_generation_at,
    created_by
) 
SELECT 
    d.id,
    '550e8400-e29b-41d4-a716-446655440000',
    'Daily Kitchen Sanitization',
    'การฆ่าเชื้อครัวประจำวัน',
    'End-of-day kitchen cleaning and sanitization routine',
    'กิจวัตรการทำความสะอาดและฆ่าเชื้อครัวในตอนท้ายวัน',
    'daily',
    '{"end_of_shift": true}',
    CURRENT_DATE,
    '22:00:00',
    ARRAY[1, 2, 3, 4, 5, 6, 7], -- All days
    true,
    '880e8400-e29b-41d4-a716-446655440000',
    45,
    'high',
    '{"remind_before_minutes": 15, "escalate_after_hours": 1}',
    NOW() + INTERVAL '1 day',
    '770e8400-e29b-41d4-a716-446655440000'
FROM sop_documents d 
WHERE d.title = 'Daily Kitchen Sanitization';

-- ===========================================
-- SAMPLE ASSIGNMENTS
-- ===========================================

-- Insert some sample assignments
INSERT INTO sop_assignments (
    sop_document_id,
    restaurant_id,
    assigned_to,
    assigned_by,
    status,
    priority,
    due_date,
    scheduled_start,
    estimated_duration_minutes,
    assignment_notes,
    assignment_notes_th
) 
SELECT 
    d.id,
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440000',
    'assigned',
    'critical',
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '1 hour',
    15,
    'Priority temperature check - health inspector visit tomorrow',
    'การตรวจสอบอุณหภูมิเร่งด่วน - เจ้าหน้าที่สาธารณสุขมาตรวจพรุ่งนี้'
FROM sop_documents d 
WHERE d.title = 'Temperature Control for Cold Storage';

-- ===========================================
-- SAMPLE COMPLETIONS
-- ===========================================

-- Insert a sample completion
INSERT INTO sop_completions (
    sop_document_id,
    restaurant_id,
    completed_by,
    status,
    started_at,
    completed_at,
    duration_minutes,
    notes,
    notes_th,
    compliance_score,
    quality_rating,
    temperature_reading,
    location
) 
SELECT 
    d.id,
    '550e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    'completed',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '15 minutes',
    15,
    'All temperatures within acceptable range. Refrigerator: 38°F, Freezer: -5°F',
    'อุณหภูมิทั้งหมดอยู่ในช่วงที่ยอมรับได้ ตู้เย็น: 38°F ตู้แช่แข็ง: -5°F',
    0.95,
    5,
    38.0,
    'Main Kitchen - Walk-in Cooler'
FROM sop_documents d 
WHERE d.title = 'Temperature Control for Cold Storage';

-- ===========================================
-- ANALYTICS DATA GENERATION
-- ===========================================

-- Generate analytics data for today
INSERT INTO sop_analytics (
    sop_document_id,
    restaurant_id,
    date_recorded,
    total_assignments,
    completed_assignments,
    overdue_assignments,
    avg_completion_time_minutes,
    avg_quality_rating,
    avg_compliance_score,
    completion_rate,
    on_time_completion_rate
)
SELECT 
    d.id,
    d.restaurant_id,
    CURRENT_DATE,
    5, -- total assignments
    4, -- completed
    0, -- overdue
    18.5, -- avg completion time
    4.2, -- avg quality
    0.91, -- avg compliance
    80.0, -- completion rate
    85.0 -- on-time rate
FROM sop_documents d 
WHERE d.status = 'approved'
LIMIT 3;

-- ===========================================
-- VERIFICATION AND STATS UPDATE
-- ===========================================

-- Update table statistics for better performance
ANALYZE sop_documents;
ANALYZE sop_steps;
ANALYZE sop_completions;
ANALYZE sop_assignments;
ANALYZE sop_photos;
ANALYZE sop_schedules;
ANALYZE sop_approvals;
ANALYZE sop_versions;
ANALYZE sop_analytics;
ANALYZE sop_equipment;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE sop_documents IS 'Sample SOPs cover critical restaurant operations: food safety, cleaning, and customer service';
COMMENT ON TABLE sop_steps IS 'Detailed step-by-step procedures with bilingual support and safety requirements';
COMMENT ON TABLE sop_equipment IS 'Equipment tracking for temperature monitoring and sanitization equipment';
COMMENT ON TABLE sop_schedules IS 'Automated recurring schedules for daily temperature checks and cleaning';
COMMENT ON TABLE sop_assignments IS 'Sample assignment shows priority workflow for health inspection preparation';
COMMENT ON TABLE sop_completions IS 'Completed temperature check with full compliance documentation';
COMMENT ON TABLE sop_analytics IS 'Performance metrics showing high compliance and quality scores';

-- Sample data summary
COMMENT ON SCHEMA public IS 'SOP system includes 3 sample SOPs, 2 detailed step procedures, 2 equipment items, 2 recurring schedules, and sample completion data for testing workflow';