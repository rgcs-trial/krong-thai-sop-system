# Quick Start & Troubleshooting Guide
# คู่มือการเริ่มต้นใช้งานและแก้ไขปัญหา

**Document Version**: 1.0  
**Created**: January 2025  
**For**: Restaurant Krong Thai SOP Translation System  
**Target**: All Users - Restaurant Staff, Managers, Administrators

---

## Table of Contents | สารบัญ

### English
1. [Quick Start Guide](#quick-start-guide)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Emergency Procedures](#emergency-procedures)
4. [Support Resources](#support-resources)

### Thai | ภาษาไทย
1. [คู่มือการเริ่มต้นใช้งาน](#คู่มือการเริ่มต้นใช้งาน)
2. [ปัญหาที่พบบ่อยและวิธีแก้ไข](#ปัญหาที่พบบ่อยและวิธีแก้ไข)
3. [ขั้นตอนฉุกเฉิน](#ขั้นตอนฉุกเฉิน)
4. [แหล่งความช่วยเหลือ](#แหล่งความช่วยเหลือ)

---

## Quick Start Guide

### 🚀 First Time Setup (5 minutes)

#### Step 1: Access the System
1. **Open tablet browser** → Navigate to the SOP system
2. **Enter your PIN** → Use your 4-digit authentication PIN
3. **Select language** → Choose English or Thai (ปุ่ม EN/TH)
4. **Navigate to Translations** → Tap "Translation Management" in menu

#### Step 2: Basic Translation Tasks
```
✅ View Translations:
   1. Tap "Browse Translations" 
   2. Use search bar for specific content
   3. Tap any translation to view details

✅ Edit Translation:
   1. Find translation → Tap "Edit"
   2. Modify text in editor
   3. Tap "Save Draft" → "Submit for Review"

✅ Check Status:
   1. View translation status indicators:
      🟡 Draft → 🔵 Review → ✅ Approved → 🟢 Published
```

#### Step 3: Quick Operations
- **Search**: Type in search bar → Press Enter
- **Filter**: Use dropdown menus (Status, Language, Category)
- **Bulk Actions**: Select multiple → Choose action from toolbar
- **Real-time Updates**: Changes appear automatically (no refresh needed)

### 📱 Tablet Navigation Tips
- **Swipe gestures**: Left/right to navigate between sections
- **Long press**: Access context menus and additional options
- **Pinch to zoom**: Enlarge text for better readability
- **Voice input**: Tap microphone icon in search bar

---

## Common Issues & Solutions

### 🔧 Authentication Problems

#### Issue: PIN not working
**Symptoms**: "Invalid PIN" error, cannot login
**Solutions**:
1. **Check PIN format**: Must be exactly 4 digits
2. **Verify caps lock**: Ensure no caps lock is on
3. **Clear browser cache**: Settings → Clear browsing data
4. **Contact supervisor**: For PIN reset

```bash
# Admin Reset Command
supabase auth reset-pin --email="user@restaurant.com"
```

#### Issue: Session expired
**Symptoms**: Automatic logout, "Session expired" message
**Solutions**:
1. **Normal behavior**: Sessions expire after 8 hours
2. **Re-enter PIN**: Login again with same credentials
3. **Check internet**: Ensure stable connection

### 🌐 Connection Issues

#### Issue: "Network Error" or slow loading
**Symptoms**: Pages won't load, spinning indicators
**Solutions**:
1. **Check WiFi**: Ensure tablet connected to restaurant WiFi
2. **Restart browser**: Close and reopen browser app
3. **Clear cache**: Browser settings → Clear cache/cookies
4. **Check internet speed**: Test with other websites

```javascript
// Network Status Check
const networkStatus = {
  online: navigator.onLine,
  connection: navigator.connection?.effectiveType
};
```

#### Issue: Real-time updates not working
**Symptoms**: Changes don't appear immediately
**Solutions**:
1. **Refresh page**: Pull down to refresh or tap refresh button
2. **Check WebSocket**: Red indicator in top bar means disconnected
3. **Restart browser**: Close all tabs and restart
4. **Report to IT**: If problem persists

### 📝 Translation Editor Problems

#### Issue: Cannot save changes
**Symptoms**: "Save failed" error, changes lost
**Solutions**:
1. **Check permissions**: Ensure you have edit rights for this content
2. **Validate content**: Remove special characters or formatting
3. **Copy text**: Copy your changes before retrying
4. **Refresh and retry**: Reload page and paste content

```typescript
// Permission Check
const hasEditPermission = user.role === 'editor' || 
                         user.role === 'admin' ||
                         user.role === 'manager';
```

#### Issue: Thai text not displaying correctly
**Symptoms**: Question marks, boxes, or garbled Thai characters
**Solutions**:
1. **Font support**: Ensure Thai fonts installed on tablet
2. **Browser settings**: Check language settings include Thai
3. **Encoding**: Refresh page to reload proper UTF-8 encoding
4. **Update browser**: Use latest browser version

### 🔍 Search & Filter Issues

#### Issue: Search returns no results
**Symptoms**: Empty results page, "No translations found"
**Solutions**:
1. **Check spelling**: Verify correct spelling in both languages
2. **Clear filters**: Reset all filter selections
3. **Use wildcards**: Try partial search terms
4. **Search all languages**: Include both EN/TH in search

```sql
-- Search Query Example
SELECT * FROM translations 
WHERE content_en ILIKE '%search_term%' 
   OR content_th ILIKE '%search_term%'
   OR key ILIKE '%search_term%';
```

### 💾 Data Sync Problems

#### Issue: Changes not appearing on other tablets
**Symptoms**: Updates visible only on current tablet
**Solutions**:
1. **Wait for sync**: Allow 30-60 seconds for propagation
2. **Check approval status**: Ensure changes are approved/published
3. **Verify permissions**: Confirm other users have view access
4. **Manual refresh**: Have other users refresh their browsers

---

## Emergency Procedures

### 🚨 System Down / Critical Failure

#### Immediate Actions
1. **Document the issue**: Screenshot error messages
2. **Check other tablets**: Verify if issue is system-wide
3. **Use backup procedures**: Refer to printed SOP materials
4. **Contact emergency support**: Use phone numbers below

#### Emergency Contacts
```
🔴 Critical System Issues:
   - IT Emergency: +66-2-XXX-XXXX
   - System Admin: admin@restaurant.com
   - Restaurant Manager: manager@restaurant.com

⚠️ Data Loss Prevention:
   - Never close browser during saves
   - Always confirm "Save Successful" messages
   - Report errors immediately
```

### 📊 Data Recovery

#### If translations are lost or corrupted:
1. **Stop all editing**: Prevent further changes
2. **Report immediately**: Contact IT within 5 minutes
3. **Document timeline**: Note when issue started
4. **Use backup access**: Switch to backup tablet if available

```bash
# Admin Recovery Commands
pnpm db:backup-restore --timestamp="2025-01-XX 10:30:00"
supabase db dump --data-only > emergency_backup.sql
```

### 🔄 Rollback Procedures

#### For incorrect published translations:
1. **Manager approval required**: Contact translation manager
2. **Use version history**: Access previous approved version
3. **Immediate unpublish**: Remove from public view
4. **Correct and republish**: Fix issues and resubmit

---

## Support Resources

### 📞 Contact Information
- **General Support**: support@restaurant.com
- **Technical Issues**: tech@restaurant.com  
- **Translation Questions**: translations@restaurant.com
- **Emergency Phone**: +66-2-XXX-XXXX (24/7)

### 📚 Additional Documentation
- **User Guide**: `/docs/USER_GUIDE_TRANSLATION_MANAGEMENT.md`
- **Manager Guide**: `/docs/MANAGER_GUIDE_TRANSLATION_SYSTEM.md`
- **Technical Docs**: `/docs/TRANSLATION_SYSTEM_ARCHITECTURE.md`

### 🎓 Training Resources
- **Video Tutorials**: Available in both EN/TH
- **Practice Environment**: sandbox.restaurant.com
- **Monthly Training**: First Monday of each month

---

# คู่มือการเริ่มต้นใช้งาน

### 🚀 การติดตั้งครั้งแรก (5 นาที)

#### ขั้นตอนที่ 1: เข้าสู่ระบบ
1. **เปิดเบราว์เซอร์บนแท็บเล็ต** → ไปยังระบบ SOP
2. **ใส่รหัส PIN** → ใช้รหัส PIN 4 หลักของคุณ
3. **เลือกภาษา** → เลือกอังกฤษหรือไทย (ปุ่ม EN/TH)
4. **ไปยังการแปล** → แตะ "Translation Management" ในเมนู

#### ขั้นตอนที่ 2: งานแปลพื้นฐาน
```
✅ ดูการแปล:
   1. แตะ "Browse Translations"
   2. ใช้แถบค้นหาสำหรับเนื้อหาที่ต้องการ
   3. แตะการแปลใดๆ เพื่อดูรายละเอียด

✅ แก้ไขการแปล:
   1. หาการแปล → แตะ "Edit"
   2. แก้ไขข้อความในตัวแก้ไข
   3. แตะ "Save Draft" → "Submit for Review"

✅ ตรวจสอบสถานะ:
   1. ดูตัวบ่งชี้สถานะการแปล:
      🟡 ร่าง → 🔵 ตรวจสอบ → ✅ อนุมัติ → 🟢 เผยแพร่
```

#### ขั้นตอนที่ 3: การดำเนินการด่วน
- **ค้นหา**: พิมพ์ในแถบค้นหา → กด Enter
- **กรอง**: ใช้เมนูดรอปดาวน์ (สถานะ, ภาษา, หมวดหมู่)
- **การดำเนินการแบบกลุ่ม**: เลือกหลายรายการ → เลือกการดำเนินการจากแถบเครื่องมือ
- **อัปเดตแบบเรียลไทม์**: การเปลี่ยนแปลงปรากฏโดยอัตโนมัติ (ไม่ต้องรีเฟรช)

### 📱 เคล็ดลับการนำทางแท็บเล็ต
- **ท่าทางปัด**: ซ้าย/ขวาเพื่อนำทางระหว่างส่วนต่างๆ
- **กดค้าง**: เข้าถึงเมนูบริบทและตัวเลือกเพิ่มเติม
- **หยิกเพื่อซูม**: ขยายข้อความเพื่อให้อ่านได้ดีขึ้น
- **การป้อนเสียง**: แตะไอคอนไมโครโฟนในแถบค้นหา

---

## ปัญหาที่พบบ่อยและวิธีแก้ไข

### 🔧 ปัญหาการยืนยันตัวตน

#### ปัญหา: PIN ใช้งานไม่ได้
**อาการ**: ข้อผิดพลาด "Invalid PIN", ไม่สามารถเข้าสู่ระบบได้
**วิธีแก้ไข**:
1. **ตรวจสอบรูปแบบ PIN**: ต้องเป็นตัวเลข 4 หลักเท่านั้น
2. **ตรวจสอบ caps lock**: ตรวจสอบว่าไม่ได้เปิด caps lock
3. **ล้างแคชเบราว์เซอร์**: การตั้งค่า → ล้างข้อมูลการเรียกดู
4. **ติดต่อหัวหน้างาน**: เพื่อรีเซ็ต PIN

#### ปัญหา: เซสชันหมดอายุ
**อาการ**: ออกจากระบบอัตโนมัติ, ข้อความ "Session expired"
**วิธีแก้ไข**:
1. **พฤติกรรมปกติ**: เซสชันหมดอายุหลัง 8 ชั่วโมง
2. **ใส่ PIN ใหม่**: เข้าสู่ระบบอีกครั้งด้วยข้อมูลเดิม
3. **ตรวจสอบอินเทอร์เน็ต**: ตรวจสอบการเชื่อมต่อที่เสถียร

### 🌐 ปัญหาการเชื่อมต่อ

#### ปัญหา: "Network Error" หรือโหลดช้า
**อาการ**: หน้าเว็บไม่โหลด, ตัวบ่งชี้หมุน
**วิธีแก้ไข**:
1. **ตรวจสอบ WiFi**: ตรวจสอบว่าแท็บเล็ตเชื่อมต่อกับ WiFi ร้านอาหาร
2. **รีสตาร์ทเบราว์เซอร์**: ปิดและเปิดแอปเบราว์เซอร์ใหม่
3. **ล้างแคช**: การตั้งค่าเบราว์เซอร์ → ล้างแคช/คุกกี้
4. **ตรวจสอบความเร็วอินเทอร์เน็ต**: ทดสอบกับเว็บไซต์อื่น

#### ปัญหา: อัปเดตแบบเรียลไทม์ไม่ทำงาน
**อาการ**: การเปลี่ยนแปลงไม่ปรากฏทันที
**วิธีแก้ไข**:
1. **รีเฟรชหน้า**: ดึงลงเพื่อรีเฟรชหรือแตะปุ่มรีเฟรช
2. **ตรวจสอบ WebSocket**: ตัวบ่งชี้สีแดงในแถบบนหมายถึงการเชื่อมต่อขาดหาย
3. **รีสตาร์ทเบราว์เซอร์**: ปิดแท็บทั้งหมดและรีสตาร์ท
4. **รายงานให้ IT**: หากปัญหายังคงอยู่

### 📝 ปัญหาตัวแก้ไขการแปล

#### ปัญหา: ไม่สามารถบันทึกการเปลี่ยนแปลง
**อาการ**: ข้อผิดพลาด "Save failed", การเปลี่ยนแปลงหายไป
**วิธีแก้ไข**:
1. **ตรวจสอบสิทธิ์**: ตรวจสอบว่าคุณมีสิทธิ์แก้ไขเนื้อหานี้
2. **ตรวจสอบเนื้อหา**: ลบอักขระพิเศษหรือการจัดรูปแบบ
3. **คัดลอกข้อความ**: คัดลอกการเปลี่ยนแปลงก่อนลองใหม่
4. **รีเฟรชและลองใหม่**: โหลดหน้าใหม่และวางเนื้อหา

#### ปัญหา: ข้อความไทยแสดงไม่ถูกต้อง
**อาการ**: เครื่องหมายคำถาม, กล่อง, หรืออักขระไทยที่ผิดพลาด
**วิธีแก้ไข**:
1. **การสนับสนุนฟอนต์**: ตรวจสอบว่าฟอนต์ไทยติดตั้งบนแท็บเล็ต
2. **การตั้งค่าเบราว์เซอร์**: ตรวจสอบการตั้งค่าภาษารวมไทย
3. **การเข้ารหัส**: รีเฟรชหน้าเพื่อโหลดการเข้ารหัส UTF-8 ที่ถูกต้อง
4. **อัปเดตเบราว์เซอร์**: ใช้เบราว์เซอร์เวอร์ชันล่าสุด

### 🔍 ปัญหาการค้นหาและกรอง

#### ปัญหา: การค้นหาไม่ให้ผลลัพธ์
**อาการ**: หน้าผลลัพธ์ว่าง, "ไม่พบการแปล"
**วิธีแก้ไข**:
1. **ตรวจสอบการสะกด**: ตรวจสอบการสะกดที่ถูกต้องในทั้งสองภาษา
2. **ล้างตัวกรอง**: รีเซ็ตการเลือกตัวกรองทั้งหมด
3. **ใช้ wildcards**: ลองคำค้นหาบางส่วน
4. **ค้นหาทุกภาษา**: รวมทั้ง EN/TH ในการค้นหา

### 💾 ปัญหาการซิงค์ข้อมูล

#### ปัญหา: การเปลี่ยนแปลงไม่ปรากฏบนแท็บเล็ตอื่น
**อาการ**: อัปเดตมองเห็นได้เฉพาะบนแท็บเล็ตปัจจุบัน
**วิธีแก้ไข**:
1. **รอการซิงค์**: ให้เวลา 30-60 วินาทีสำหรับการแพร่กระจาย
2. **ตรวจสอบสถานะการอนุมัติ**: ตรวจสอบว่าการเปลี่ยนแปลงได้รับการอนุมัติ/เผยแพร่
3. **ตรวจสอบสิทธิ์**: ยืนยันว่าผู้ใช้อื่นมีสิทธิ์เข้าดู
4. **รีเฟรชด้วยตนเอง**: ให้ผู้ใช้อื่นรีเฟรชเบราว์เซอร์

---

## ขั้นตอนฉุกเฉิน

### 🚨 ระบบล่ม / ความล้มเหลวที่สำคัญ

#### การดำเนินการทันที
1. **บันทึกปัญหา**: ถ่ายภาพหน้าจอข้อความแสดงข้อผิดพลาด
2. **ตรวจสอบแท็บเล็ตอื่น**: ตรวจสอบว่าปัญหาเป็นระบบทั้งหมดหรือไม่
3. **ใช้ขั้นตอนสำรอง**: อ้างอิงเอกสาร SOP ที่พิมพ์
4. **ติดต่อฝ่ายสนับสนุนฉุกเฉิน**: ใช้หมายเลขโทรศัพท์ด้านล่าง

#### รายชื่อผู้ติดต่อฉุกเฉิน
```
🔴 ปัญหาระบบที่สำคัญ:
   - IT ฉุกเฉิน: +66-2-XXX-XXXX
   - ผู้ดูแลระบบ: admin@restaurant.com
   - ผู้จัดการร้านอาหาร: manager@restaurant.com

⚠️ การป้องกันการสูญหายข้อมูล:
   - อย่าปิดเบราว์เซอร์ระหว่างการบันทึก
   - ยืนยันข้อความ "Save Successful" เสมอ
   - รายงานข้อผิดพลาดทันที
```

### 📊 การกู้คืนข้อมูล

#### หากการแปลหายไปหรือเสียหาย:
1. **หยุดการแก้ไขทั้งหมด**: ป้องกันการเปลี่ยนแปลงเพิ่มเติม
2. **รายงานทันที**: ติดต่อ IT ภายใน 5 นาที
3. **บันทึกไทม์ไลน์**: บันทึกเวลาที่ปัญหาเริ่มขึ้น
4. **ใช้การเข้าถึงสำรอง**: เปลี่ยนไปใช้แท็บเล็ตสำรองหากมี

### 🔄 ขั้นตอนการย้อนกลับ

#### สำหรับการแปลที่เผยแพร่ไม่ถูกต้อง:
1. **ต้องได้รับการอนุมัติจากผู้จัดการ**: ติดต่อผู้จัดการการแปล
2. **ใช้ประวัติเวอร์ชัน**: เข้าถึงเวอร์ชันที่อนุมัติก่อนหน้า
3. **ยกเลิกการเผยแพร่ทันที**: ลบออกจากมุมมองสาธารณะ
4. **แก้ไขและเผยแพร่ใหม่**: แก้ไขปัญหาและส่งใหม่

---

## แหล่งความช่วยเหลือ

### 📞 ข้อมูลการติดต่อ
- **การสนับสนุนทั่วไป**: support@restaurant.com
- **ปัญหาทางเทคนิค**: tech@restaurant.com
- **คำถามเกี่ยวกับการแปล**: translations@restaurant.com
- **โทรศัพท์ฉุกเฉิน**: +66-2-XXX-XXXX (24/7)

### 📚 เอกสารเพิ่มเติม
- **คู่มือผู้ใช้**: `/docs/USER_GUIDE_TRANSLATION_MANAGEMENT.md`
- **คู่มือผู้จัดการ**: `/docs/MANAGER_GUIDE_TRANSLATION_SYSTEM.md`
- **เอกสารทางเทคนิค**: `/docs/TRANSLATION_SYSTEM_ARCHITECTURE.md`

### 🎓 แหล่งฝึกอบรม
- **วิดีโอสอน**: มีทั้งภาษาอังกฤษและไทย
- **สภาพแวดล้อมฝึกหัด**: sandbox.restaurant.com
- **การฝึกอบรมรายเดือน**: วันจันทร์แรกของทุกเดือน

---

## Quick Reference Cards | การ์ดอ้างอิงด่วน

### 🎯 Most Common Tasks | งานที่ใช้บ่อยที่สุด

| English Action | Thai Action | Quick Steps |
|---|---|---|
| Edit Translation | แก้ไขการแปล | Find → Edit → Save → Submit |
| Search Content | ค้นหาเนื้อหา | Type in search → Enter |
| Change Status | เปลี่ยนสถานะ | Select → Actions → Update Status |
| Bulk Edit | แก้ไขแบบกลุ่ม | Select All → Actions → Bulk Edit |

### 🚨 Emergency Quick Actions | การดำเนินการฉุกเฉินด่วน

| Problem | Thai Problem | Immediate Action |
|---|---|---|
| System Down | ระบบล่ม | Call +66-2-XXX-XXXX |
| Data Lost | ข้อมูลหาย | Stop editing, Report immediately |
| Wrong Translation Published | การแปลผิดถูกเผยแพร่ | Contact manager, Unpublish |
| Cannot Login | เข้าสู่ระบบไม่ได้ | Check PIN, Clear cache, Ask supervisor |

### 📱 Tablet Gestures | ท่าทางบนแท็บเล็ต

| Gesture | Thai Gesture | Function |
|---|---|---|
| Tap | แตะ | Select/Open |
| Long Press | กดค้าง | Context menu |
| Swipe Left/Right | ปัดซ้าย/ขวา | Navigate |
| Pinch | หยิก | Zoom in/out |
| Two-finger tap | แตะสองนิ้ว | Zoom to fit |

---

## Performance Optimization Tips | เคล็ดลับเพิ่มประสิทธิภาพ

### For Users | สำหรับผู้ใช้
- **Close unused tabs** | ปิดแท็บที่ไม่ใช้
- **Clear cache weekly** | ล้างแคชทุกสัปดาห์
- **Use WiFi (not mobile data)** | ใช้ WiFi (ไม่ใช่ข้อมูลมือถือ)
- **Keep tablet charged above 20%** | เก็บแท็บเล็ตชาร์จเหนือ 20%

### For Managers | สำหรับผู้จัดการ
- **Monitor system usage during peak hours** | ติดตามการใช้ระบบในช่วงเวลาเร่งด่วน
- **Schedule bulk operations during off-peak** | กำหนดการดำเนินการแบบกลุ่มในช่วงไม่เร่งด่วน
- **Regular training updates** | อัปเดตการฝึกอบรมอย่างสม่ำเสมอ
- **Review error logs weekly** | ตรวจสอบล็อกข้อผิดพลาดทุกสัปดาห์

---

**Document Maintenance**: Updated monthly | อัปเดตรายเดือน  
**Last Review**: January 2025 | ตรวจสอบล่าสุด: มกราคม 2025  
**Next Review**: February 2025 | ตรวจสอบครั้งถัดไป: กุมภาพันธ์ 2025

---

*This guide is part of the Restaurant Krong Thai SOP Translation System documentation suite. For technical support or questions about this document, contact the system administrators.*

*คู่มือนี้เป็นส่วนหนึ่งของชุดเอกสารระบบแปล SOP ร้านกรองไทย สำหรับการสนับสนุนทางเทคนิคหรือคำถามเกี่ยวกับเอกสารนี้ ติดต่อผู้ดูแลระบบ*