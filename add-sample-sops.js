#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addSampleSOPs() {
  console.log('📝 Adding sample SOP documents...');
  
  // Get restaurant and user IDs
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .limit(1)
    .single();
  
  const { data: admin } = await supabase
    .from('auth_users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();
  
  const { data: categories } = await supabase
    .from('sop_categories')
    .select('id, code');
  
  if (!restaurant || !admin || !categories) {
    console.error('❌ Failed to get required data');
    return;
  }
  
  const categoryMap = categories.reduce((map, cat) => {
    map[cat.code] = cat.id;
    return map;
  }, {});
  
  const sampleSOPs = [
    {
      category_code: 'CUSTOMER_SERVICE',
      title: 'Greeting and Seating Guests',
      title_th: 'การทักทายและจัดที่นั่งแขก',
      content: 'First impressions matter. This procedure ensures all guests receive a warm, professional welcome that reflects our Thai hospitality values. Staff should greet guests within 30 seconds of arrival with a genuine smile and traditional wai gesture.',
      content_th: 'ความประทับใจแรกเป็นสิ่งสำคัญ ขั้นตอนนี้ทำให้แขกทุกคนได้รับการต้อนรับที่อบอุ่นและเป็นมืออาชีพที่สะท้อนค่านิยมการต้อนรับแบบไทย พนักงานควรทักทายแขกภายใน 30 วินาทีหลังจากมาถึงด้วยรอยยิ้มจริงใจและท่าไหว้แบบไทย',
      steps: JSON.stringify([
        {"step": 1, "action": "Greet within 30 seconds with smile and wai", "note": "Use traditional Thai greeting"},
        {"step": 2, "action": "Ask about reservation or party size", "note": "Be prepared with seating options"},
        {"step": 3, "action": "Guide to appropriate table", "note": "Consider guest preferences and accessibility"},
        {"step": 4, "action": "Present menus and explain specials", "note": "Highlight popular Thai dishes"},
        {"step": 5, "action": "Offer water and ask about drinks", "note": "Suggest traditional Thai beverages"}
      ]),
      steps_th: JSON.stringify([
        {"step": 1, "action": "ทักทายภายใน 30 วินาทีด้วยรอยยิ้มและไหว้", "note": "ใช้การทักทายแบบไทยดั้งเดิม"},
        {"step": 2, "action": "สอบถามเรื่องการจองหรือจำนวนคน", "note": "เตรียมตัวเลือกที่นั่ง"},
        {"step": 3, "action": "นำไปยังโต๊ะที่เหมาะสม", "note": "พิจารณาความต้องการและการเข้าถึงของแขก"},
        {"step": 4, "action": "เสนอเมนูและอธิบายเมนูพิเศษ", "note": "เน้นอาหารไทยยอดนิยม"},
        {"step": 5, "action": "เสนอน้ำและสอบถามเรื่องเครื่องดื่ม", "note": "แนะนำเครื่องดื่มไทยดั้งเดิม"}
      ]),
      tags: ['customer service', 'greeting', 'hospitality', 'thai culture'],
      tags_th: ['บริการลูกค้า', 'การทักทาย', 'การต้อนรับ', 'วัฒนธรรมไทย']
    },
    {
      category_code: 'CLEANING',
      title: 'End of Day Cleaning Checklist',
      title_th: 'รายการทำความสะอาดปิดวัน',
      content: 'Comprehensive cleaning procedures to be completed at the end of each service day. This ensures a clean, sanitized environment for the next day\'s operations and maintains health standards.',
      content_th: 'ขั้นตอนการทำความสะอาดครบถ้วนที่ต้องทำเมื่อสิ้นสุดการบริการแต่ละวัน เพื่อให้แน่ใจว่าสภาพแวดล้อมสะอาดและฆ่าเชื้อโรคสำหรับการดำเนินงานในวันถัดไป และรักษามาตรฐานสุขภาพ',
      steps: JSON.stringify([
        {"step": 1, "action": "Clear and sanitize all dining tables", "duration": "20 minutes"},
        {"step": 2, "action": "Sweep and mop dining area floors", "duration": "15 minutes"},
        {"step": 3, "action": "Clean and sanitize kitchen surfaces", "duration": "30 minutes"},
        {"step": 4, "action": "Empty and clean trash receptacles", "duration": "10 minutes"},
        {"step": 5, "action": "Restock cleaning supplies for next day", "duration": "5 minutes"}
      ]),
      steps_th: JSON.stringify([
        {"step": 1, "action": "เก็บและฆ่าเชื้อโต๊ะอาหารทั้งหมด", "duration": "20 นาที"},
        {"step": 2, "action": "กวาดและถูพื้นบริเวณรับประทานอาหาร", "duration": "15 นาที"},
        {"step": 3, "action": "ทำความสะอาดและฆ่าเชื้อพื้นผิวครัว", "duration": "30 นาที"},
        {"step": 4, "action": "เทและทำความสะอาดถังขยะ", "duration": "10 นาที"},
        {"step": 5, "action": "เติมอุปกรณ์ทำความสะอาดสำหรับวันถัดไป", "duration": "5 นาที"}
      ]),
      tags: ['cleaning', 'sanitation', 'closing', 'maintenance'],
      tags_th: ['ทำความสะอาด', 'สุขาภิบาล', 'ปิดร้าน', 'บำรุงรักษา']
    },
    {
      category_code: 'KITCHEN_OPS',
      title: 'Pad Thai Preparation Standard',
      title_th: 'มาตรฐานการทำผัดไทย',
      content: 'Step-by-step guide for preparing authentic Pad Thai according to restaurant standards. This signature dish requires precise timing and traditional techniques to achieve the perfect balance of flavors.',
      content_th: 'คู่มือทำผัดไทยแท้ตามมาตรฐานร้านอาหารทีละขั้นตอน อาหารจานเด็ดนี้ต้องใช้การจับเวลาที่แม่นยำและเทคนิคดั้งเดิมเพื่อให้ได้รสชาติที่สมดุลสมบูรณ์แบบ',
      steps: JSON.stringify([
        {"step": 1, "action": "Soak rice noodles in warm water for 30 minutes", "note": "Noodles should be pliable but not soft"},
        {"step": 2, "action": "Prepare tamarind sauce mixture", "note": "Balance sweet, sour, and salty flavors"},
        {"step": 3, "action": "Heat wok to high temperature", "note": "Wok should be smoking hot"},
        {"step": 4, "action": "Stir-fry proteins and aromatics", "note": "Cook shrimp/chicken until just done"},
        {"step": 5, "action": "Add noodles and sauce, toss quickly", "note": "Work fast to prevent sticking"},
        {"step": 6, "action": "Garnish and serve immediately", "note": "Serve with lime, peanuts, bean sprouts"}
      ]),
      steps_th: JSON.stringify([
        {"step": 1, "action": "แช่เส้นก๋วยเตี๋ยวในน้ำอุ่น 30 นาที", "note": "เส้นควรนิ่มพอประมาณแต่ไม่เละ"},
        {"step": 2, "action": "เตรียมส่วนผสมน้ำมะขามเปียก", "note": "ปรับรสหวาน เปรื้อว เค็มให้สมดุล"},
        {"step": 3, "action": "ตั้งกระทะให้ร้อนจัด", "note": "กระทะต้องร้อนจนมีควันขึ้น"},
        {"step": 4, "action": "ผัดโปรตีนและเครื่องหอม", "note": "ผัดกุ้ง/ไก่ให้สุกพอดี"},
        {"step": 5, "action": "ใส่เส้นและน้ำซอส คลุกเคล้าอย่างรวดเร็ว", "note": "ทำอย่างรวดเร็วเพื่อไม่ให้ติดกระทะ"},
        {"step": 6, "action": "ตกแต่งและเสิร์ฟทันที", "note": "เสิร์ฟพร้อมมะนาว ถั่วลิสง ถั่วงอก"}
      ]),
      tags: ['cooking', 'thai cuisine', 'noodles', 'signature dish'],
      tags_th: ['การทำอาหาร', 'อาหารไทย', 'ก๋วยเตี๋ยว', 'อาหารจานเด็ด']
    },
    {
      category_code: 'CASH_HANDLING',
      title: 'Point of Sale System Operation',
      title_th: 'การใช้งานระบบขายหน้าร้าน',
      content: 'Complete guide for operating the POS system including payment processing, order management, and daily reporting. Staff must follow these procedures to ensure accurate transactions and proper cash handling.',
      content_th: 'คู่มือการใช้งานระบบ POS อย่างสมบูรณ์ รวมถึงการประมวลผลการชำระเงิน การจัดการออเดอร์ และการรายงานประจำวัน พนักงานต้องปฏิบัติตามขั้นตอนเหล่านี้เพื่อให้แน่ใจว่าการทำธุรกรรมถูกต้องและการจัดการเงินสดเหมาะสม',
      steps: JSON.stringify([
        {"step": 1, "action": "Log into POS system with personal ID", "note": "Use assigned staff credentials"},
        {"step": 2, "action": "Enter customer order items", "note": "Double-check quantities and modifications"},
        {"step": 3, "action": "Apply discounts or promotions if applicable", "note": "Verify promotion validity"},
        {"step": 4, "action": "Process payment (cash, card, or digital)", "note": "Follow payment verification procedures"},
        {"step": 5, "action": "Print receipt and provide to customer", "note": "Offer receipt and thank customer"},
        {"step": 6, "action": "Log out when shift ends", "note": "Complete end-of-shift procedures"}
      ]),
      steps_th: JSON.stringify([
        {"step": 1, "action": "เข้าสู่ระบบ POS ด้วยรหัสส่วนตัว", "note": "ใช้ข้อมูลประจำตัวพนักงานที่กำหนดให้"},
        {"step": 2, "action": "ป้อนรายการออเดอร์ของลูกค้า", "note": "ตรวจสอบจำนวนและการปรับแต่งอีกครั้ง"},
        {"step": 3, "action": "ใช้ส่วนลดหรือโปรโมชั่นหากมี", "note": "ตรวจสอบความถูกต้องของโปรโมชั่น"},
        {"step": 4, "action": "ประมวลผลการชำระเงิน (เงินสด บัตร หรือดิจิทัล)", "note": "ปฏิบัติตามขั้นตอนการยืนยันการชำระเงิน"},
        {"step": 5, "action": "พิมพ์ใบเสร็จและมอบให้ลูกค้า", "note": "เสนอใบเสร็จและขอบคุณลูกค้า"},
        {"step": 6, "action": "ออกจากระบบเมื่อเลิกกะ", "note": "ทำขั้นตอนปิดกะให้เสร็จสิ้น"}
      ]),
      tags: ['cash handling', 'pos system', 'payment', 'transactions'],
      tags_th: ['การจัดการเงินสด', 'ระบบ pos', 'การชำระเงิน', 'ธุรกรรม']
    },
    {
      category_code: 'EMERGENCY',
      title: 'Fire Emergency Response Protocol',
      title_th: 'ขั้นตอนการตอบสนองเหตุฉุกเฉินไฟไหม้',
      content: 'Critical emergency procedures for fire incidents in the restaurant. All staff must be familiar with these steps to ensure guest and employee safety during fire emergencies.',
      content_th: 'ขั้นตอนฉุกเฉินที่สำคัญสำหรับเหตุการณ์ไฟไหม้ในร้านอาหาร พนักงานทุกคนต้องคุ้นเคยกับขั้นตอนเหล่านี้เพื่อให้แน่ใจว่าแขกและพนักงานปลอดภัยในระหว่างเหตุฉุกเฉินไฟไหม้',
      steps: JSON.stringify([
        {"step": 1, "action": "Sound fire alarm immediately", "note": "Pull nearest fire alarm station", "priority": "CRITICAL"},
        {"step": 2, "action": "Call emergency services (199)", "note": "Provide clear location and details", "priority": "CRITICAL"},
        {"step": 3, "action": "Evacuate all guests and staff", "note": "Use nearest safe exit routes", "priority": "CRITICAL"},
        {"step": 4, "action": "Meet at designated assembly point", "note": "Parking lot across the street", "priority": "HIGH"},
        {"step": 5, "action": "Account for all personnel", "note": "Use staff roster to check attendance", "priority": "HIGH"},
        {"step": 6, "action": "Do not re-enter until cleared by authorities", "note": "Wait for fire department all-clear", "priority": "MEDIUM"}
      ]),
      steps_th: JSON.stringify([
        {"step": 1, "action": "เปิดสัญญาณเตือนไฟไหม้ทันที", "note": "กดจุดแจ้งเหตุไฟไหม้ที่ใกล้ที่สุด", "priority": "วิกฤต"},
        {"step": 2, "action": "โทรหาหน่วยฉุกเฉิน (199)", "note": "ให้ข้อมูลสถานที่และรายละเอียดที่ชัดเจน", "priority": "วิกฤต"},
        {"step": 3, "action": "อพยพแขกและพนักงานทั้งหมด", "note": "ใช้เส้นทางหนีไฟที่ปลอดภัยที่ใกล้ที่สุด", "priority": "วิกฤต"},
        {"step": 4, "action": "พบกันที่จุดนัดหมายที่กำหนด", "note": "ลานจอดรถฝั่งตรงข้าม", "priority": "สูง"},
        {"step": 5, "action": "ตรวจสอบการครบถ้วนของบุคลากร", "note": "ใช้รายชื่อพนักงานเพื่อเช็คการเข้าร่วม", "priority": "สูง"},
        {"step": 6, "action": "ห้ามเข้าไปข้างในจนกว่าจะได้รับอนุญาต", "note": "รอการอนุญาตจากหน่วยดับเพลิง", "priority": "ปานกลาง"}
      ]),
      tags: ['emergency', 'fire safety', 'evacuation', 'crisis management'],
      tags_th: ['ฉุกเฉิน', 'ความปลอดภัยไฟไหม้', 'การอพยพ', 'การจัดการวิกฤต']
    }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const sop of sampleSOPs) {
    try {
      const { error } = await supabase
        .from('sop_documents')
        .insert({
          category_id: categoryMap[sop.category_code],
          restaurant_id: restaurant.id,
          title: sop.title,
          title_th: sop.title_th,
          content: sop.content,
          content_th: sop.content_th,
          steps: sop.steps,
          steps_th: sop.steps_th,
          tags: sop.tags,
          tags_th: sop.tags_th,
          status: 'approved',
          priority: 'medium',
          created_by: admin.id
        });
      
      if (error) {
        console.error(`❌ Failed to create SOP "${sop.title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Created SOP: ${sop.title}`);
        successCount++;
      }
    } catch (err) {
      console.error(`💥 Exception creating SOP "${sop.title}":`, err.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} SOPs created successfully, ${errorCount} errors`);
}

async function main() {
  console.log('🚀 Adding Sample SOP Documents\n');
  await addSampleSOPs();
  console.log('✅ Sample SOP creation completed!');
}

main().catch(console.error);