# Translation Management User Guide
# คู่มือการใช้งานระบบจัดการการแปล

*Restaurant Krong Thai SOP Management System*  
*ระบบจัดการ SOP ร้านอาหารไทยกรองไทย*

**Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Target Audience**: Restaurant Staff, Managers, Content Editors  
**ผู้ใช้เป้าหมาย**: พนักงานร้านอาหาร ผู้จัดการ บรรณาธิการเนื้อหา

---

## Table of Contents / สารบัญ

### English Version
1. [Getting Started](#getting-started)
2. [Accessing Translation Management](#accessing-translation-management)
3. [Understanding the Interface](#understanding-the-interface)
4. [Basic Translation Editing](#basic-translation-editing)
5. [Bulk Operations](#bulk-operations)
6. [Approval Workflows](#approval-workflows)
7. [Real-time Collaboration](#real-time-collaboration)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

### ภาษาไทย
1. [การเริ่มต้นใช้งาน](#การเริ่มต้นใช้งาน)
2. [การเข้าถึงระบบจัดการการแปล](#การเข้าถึงระบบจัดการการแปล)
3. [ทำความเข้าใจหน้าจอการทำงาน](#ทำความเข้าใจหน้าจอการทำงาน)
4. [การแก้ไขการแปลพื้นฐาน](#การแก้ไขการแปลพื้นฐาน)
5. [การดำเนินการแบบกลุ่ม](#การดำเนินการแบบกลุ่ม)
6. [ขั้นตอนการอนุมัติ](#ขั้นตอนการอนุมัติ)
7. [การทำงานร่วมกันแบบเรียลไทม์](#การทำงานร่วมกันแบบเรียลไทม์)
8. [งานทั่วไป](#งานทั่วไป)
9. [การแก้ไขปัญหา](#การแก้ไขปัญหา)
10. [แนวทางปฏิบัติที่ดี](#แนวทางปฏิบัติที่ดี)

---

# English Version

## Getting Started

The Translation Management System is your central tool for managing multilingual content in the Krong Thai restaurant system. This guide will help you navigate the interface and perform common translation tasks effectively.

### System Requirements
- **Device**: Tablet (iPad, Android tablet) or Desktop computer
- **Screen Size**: Minimum 10 inches recommended for optimal experience
- **Browser**: Safari, Chrome, Firefox, or Edge (latest versions)
- **Internet**: Stable connection required for real-time features
- **Access Level**: Restaurant Admin, Manager, or Content Editor permissions

### Key Features Overview
- ✅ **Real-time Translation Editing** - Changes appear immediately across all devices
- ✅ **Collaborative Workflows** - Multiple team members can work simultaneously
- ✅ **Quality Assurance** - Built-in approval processes ensure content quality
- ✅ **Bulk Operations** - Import/export translations via CSV or Excel files
- ✅ **Performance Analytics** - Track usage and identify areas for improvement
- ✅ **Offline Support** - Continue working even with limited connectivity

---

## Accessing Translation Management

### Step 1: Login to the System
1. Open your tablet's web browser
2. Navigate to your restaurant's SOP system URL
3. Enter your **4-digit PIN** on the login screen
4. Select your **restaurant location** from the dropdown
5. Tap **"Login"** to access the dashboard

### Step 2: Navigate to Translation Management
1. From the main dashboard, tap **"Settings"** in the navigation menu
2. Select **"Translation Management"** from the settings menu
3. You'll see the Translation Management Dashboard with overview statistics

### User Permission Levels
- **Viewer**: Can view translations but cannot edit
- **Editor**: Can create and edit translations in draft status
- **Reviewer**: Can review and approve translation changes
- **Admin**: Full access to all translation management features

---

## Understanding the Interface

### Dashboard Overview
The Translation Management Dashboard provides a comprehensive view of your translation system:

#### Statistics Cards (Top Row)
- **Total Keys**: Number of translatable text elements
- **Completion Rate**: Percentage of translations completed across all languages
- **Pending Approvals**: Translations waiting for review
- **Quality Score**: Average quality rating based on review feedback

#### Quick Actions (Header Buttons)
- **Refresh**: Update dashboard data
- **Export**: Download translations as CSV/Excel files
- **Import**: Upload translation files
- **New Translation**: Create a new translation key

#### Main Navigation Tabs
1. **Overview**: Dashboard statistics and recent activity
2. **Keys**: Manage translation keys and categories
3. **Editor**: Create and edit individual translations
4. **Bulk**: Import/export operations and batch editing
5. **Workflow**: Review and approval management
6. **Analytics**: Usage statistics and performance metrics

### Status Indicators
- 🟦 **Draft**: New translation, not yet reviewed
- 🟨 **Review**: Ready for review by supervisors
- 🟩 **Approved**: Approved but not yet published
- 🔵 **Published**: Live and visible to users
- 🟥 **Deprecated**: No longer in use

---

## Basic Translation Editing

### Creating a New Translation
1. Navigate to the **"Editor"** tab
2. Click **"New Translation"** button
3. Fill in the required fields:
   - **Key Name**: Unique identifier (e.g., "menu.appetizers.title")
   - **Category**: Group classification (e.g., "menu", "common", "errors")
   - **Description**: Context for translators
   - **English Text**: Original English content
   - **Thai Text**: Thai translation

4. Add any **interpolation variables** if the text includes dynamic content:
   - Example: "Welcome {customerName}" uses variable `{customerName}`
   - List variables in the "Variables" field: `customerName`

5. Save as **Draft** or submit for **Review**

### Editing Existing Translations
1. In the **"Keys"** tab, search for the translation you want to edit
2. Click the **pencil icon** next to the translation key
3. Make your changes in the editor
4. Add **change notes** explaining what you modified
5. Choose to save as draft or submit for review

### ICU Message Format
For complex translations with pluralization or formatting:

```
{count, plural, 
  =0 {No items} 
  =1 {One item} 
  other {# items}
}
```

**Thai Example**:
```
{count, plural, 
  =0 {ไม่มีรายการ} 
  =1 {รายการเดียว} 
  other {# รายการ}
}
```

---

## Bulk Operations

### Importing Translations from Files

#### Supported File Formats
- **CSV**: Comma-separated values (recommended)
- **Excel**: .xlsx files with proper column structure
- **JSON**: For technical users

#### CSV File Structure
Create a CSV file with these columns:
```
key_name,category,description,en_text,th_text,variables
menu.title,menu,Main menu heading,Menu,เมนู,
common.welcome,common,Welcome message,Welcome {name},ยินดีต้อนรับ {name},name
```

#### Import Process
1. Go to **"Bulk"** tab
2. Click **"Import Translations"**
3. Select your CSV/Excel file
4. Review the preview of changes
5. Choose import options:
   - **Skip existing**: Only add new translations
   - **Update existing**: Overwrite existing translations
   - **Create draft**: Import as draft status
6. Click **"Import"** to process

### Exporting Translations

#### Export Options
1. **All Translations**: Complete dataset
2. **By Category**: Specific categories only
3. **By Status**: Only drafts, approved, etc.
4. **By Language**: English, Thai, or both

#### Export Process
1. Go to **"Bulk"** tab
2. Click **"Export Translations"**
3. Select export criteria
4. Choose file format (CSV recommended)
5. Click **"Download"** when ready

### Batch Editing
1. In the **"Keys"** tab, select multiple translations using checkboxes
2. Click **"Batch Edit"** button
3. Choose operation:
   - **Change Status**: Move selected items to review/approved
   - **Update Category**: Reassign to different category
   - **Add Variables**: Bulk add interpolation variables
4. Confirm changes

---

## Approval Workflows

### Understanding the Workflow
1. **Draft** → **Review** → **Approved** → **Published**
2. Each step requires appropriate user permissions
3. Changes are tracked and auditable

### Submitting for Review
1. After editing a translation, click **"Submit for Review"**
2. Add review notes explaining your changes
3. Assign to specific reviewer (if required)
4. The translation status changes to "Review"

### Reviewing Translations
**For Reviewers and Managers:**

1. Go to **"Workflow"** tab
2. View pending reviews in the queue
3. Click on translation to review
4. Check translation quality:
   - **Accuracy**: Correct meaning preserved
   - **Consistency**: Matches style guidelines
   - **Context**: Appropriate for restaurant environment
5. Actions available:
   - **Approve**: Move to approved status
   - **Request Changes**: Return to editor with feedback
   - **Reject**: Cancel the change request

### Publishing Approved Translations
1. Approved translations appear in the "Ready to Publish" section
2. Select translations to publish
3. Click **"Publish Selected"**
4. Confirm publication - changes go live immediately

---

## Real-time Collaboration

### Live Editing Features
- **Simultaneous Editing**: Multiple users can work on different translations
- **Live Updates**: See changes made by other team members instantly
- **Edit Notifications**: System alerts when someone else is editing
- **Conflict Resolution**: Automatic handling of simultaneous edits

### Collaboration Best Practices
1. **Communication**: Use the built-in comments system
2. **Coordination**: Check who's online before starting major edits
3. **Status Awareness**: Monitor translation statuses to avoid conflicts
4. **Regular Sync**: Refresh your browser occasionally for latest updates

### User Presence Indicators
- 🟢 **Green Dot**: User currently online and active
- 🟡 **Yellow Dot**: User online but idle
- ⚫ **No Dot**: User offline

---

## Common Tasks

### Daily Translation Maintenance

#### Morning Checklist
1. **Check Dashboard**: Review overnight activity and new requests
2. **Review Queue**: Process pending translations requiring approval
3. **Quality Check**: Verify published translations are displaying correctly
4. **Team Coordination**: Check team assignments and priorities

#### Weekly Tasks
1. **Export Backup**: Download complete translation set
2. **Analytics Review**: Check usage statistics and performance
3. **Quality Audit**: Review translation quality scores
4. **Team Training**: Address any recurring issues

### Managing Seasonal Content
1. **Create Seasonal Categories**: Group holiday/special event content
2. **Schedule Updates**: Plan translation updates for upcoming events
3. **Backup Previous**: Archive previous seasonal content
4. **Test Display**: Verify seasonal content appears correctly

### Emergency Translation Updates
1. **Immediate Change**: Use "Emergency" priority setting
2. **Skip Review**: For critical fixes (admin only)
3. **Team Notification**: Alert all relevant team members
4. **Post-Update Verification**: Confirm changes are live and correct

---

## Troubleshooting

### Common Issues and Solutions

#### "Translation Not Displaying"
**Symptoms**: New translation doesn't appear in app
**Solutions**:
1. Check translation status - must be "Published"
2. Clear browser cache and reload app
3. Verify correct language is selected
4. Check for typos in translation key

#### "Cannot Save Changes"
**Symptoms**: Save button doesn't work or shows error
**Solutions**:
1. Check internet connection
2. Verify you have edit permissions
3. Ensure all required fields are filled
4. Try refreshing the page and re-entering changes

#### "File Import Failed"
**Symptoms**: CSV/Excel import shows errors
**Solutions**:
1. Check file format matches template
2. Verify all required columns are present
3. Remove special characters from key names
4. Ensure file size is under 10MB

#### "Cannot Access Translation Management"
**Symptoms**: Menu option not visible or accessible
**Solutions**:
1. Verify you have appropriate permissions
2. Check with restaurant admin to verify account status
3. Try logging out and back in
4. Clear browser cache and cookies

#### "Real-time Updates Not Working"
**Symptoms**: Changes by other users don't appear
**Solutions**:
1. Check internet connection stability
2. Refresh browser page
3. Verify WebSocket connection in browser console
4. Contact technical support if persistent

### Performance Issues

#### Slow Loading
- Close other browser tabs
- Check tablet memory usage
- Restart browser application
- Contact support if consistently slow

#### Connection Problems
- Verify Wi-Fi signal strength
- Switch to mobile data if available
- Restart network connection
- Check with IT support for network issues

### Getting Help

#### In-App Support
1. Click **"Help"** button in top navigation
2. Use **"Live Chat"** for immediate assistance
3. Submit **"Bug Report"** for technical issues
4. Access **"Video Tutorials"** for visual guidance

#### Contact Information
- **Technical Support**: support@krongthai.com
- **Translation Team**: translation@krongthai.com
- **Emergency Hotline**: Available in system settings

---

## Best Practices

### Translation Quality Guidelines

#### Writing Effective Translations
1. **Keep Context**: Understand where text appears in the app
2. **Maintain Tone**: Match restaurant's friendly, professional voice
3. **Cultural Sensitivity**: Ensure Thai translations are culturally appropriate
4. **Consistency**: Use same terms throughout the system
5. **Clarity**: Write clearly for varying language proficiency levels

#### English Guidelines
- Use simple, clear language
- Avoid jargon or technical terms
- Keep sentences concise
- Use active voice when possible
- Consider tablet reading experience

#### Thai Guidelines
- Use appropriate levels of politeness (สุภาพ)
- Consider regional Thai variations
- Maintain consistency in terminology
- Use clear, readable fonts
- Account for text length differences

### Workflow Efficiency

#### Planning Your Work
1. **Prioritize**: Focus on high-impact translations first
2. **Batch Similar**: Group similar types of translations
3. **Regular Reviews**: Don't let review queue build up
4. **Documentation**: Keep notes on decisions and style choices

#### Quality Assurance
1. **Double-Check**: Review your work before submitting
2. **Test Context**: View translations in actual app when possible
3. **Peer Review**: Have colleagues check important translations
4. **User Feedback**: Monitor customer comments for translation issues

### Team Coordination

#### Communication Protocols
1. **Daily Standup**: Brief team check-in on translation status
2. **Change Notifications**: Alert team to significant updates
3. **Style Guide**: Maintain shared translation style guidelines
4. **Training Updates**: Regular team training on new features

#### Project Management
1. **Clear Assignments**: Define who handles which content areas
2. **Deadline Tracking**: Use project management features
3. **Progress Monitoring**: Regular status updates to management
4. **Quality Metrics**: Track and improve translation quality scores

---

# ภาษาไทย

## การเริ่มต้นใช้งาน

ระบบจัดการการแปลเป็นเครื่องมือหลักสำหรับการจัดการเนื้อหาหลายภาษาในระบบร้านอาหารไทยกรองไทย คู่มือนี้จะช่วยให้คุณใช้งานหน้าจอและทำงานแปลทั่วไปได้อย่างมีประสิทธิภาพ

### ความต้องการของระบบ
- **อุปกรณ์**: แท็บเล็ต (iPad, แท็บเล็ต Android) หรือคอมพิวเตอร์
- **ขนาดหน้าจอ**: แนะนำขั้นต่ำ 10 นิ้วเพื่อประสบการณ์ที่ดีที่สุด
- **เบราว์เซอร์**: Safari, Chrome, Firefox หรือ Edge (เวอร์ชันล่าสุด)
- **อินเทอร์เน็ต**: ต้องการการเชื่อมต่อที่เสถียรสำหรับฟีเจอร์เรียลไทม์
- **ระดับการเข้าถึง**: สิทธิ์ผู้ดูแลร้านอาหาร ผู้จัดการ หรือบรรณาธิการเนื้อหา

### ภาพรวมฟีเจอร์หลัก
- ✅ **การแก้ไขการแปลแบบเรียลไทม์** - การเปลี่ยนแปลงจะปรากฏทันทีในทุกอุปกรณ์
- ✅ **ขั้นตอนการทำงานร่วมกัน** - ทีมงานหลายคนสามารถทำงานพร้อมกันได้
- ✅ **การประกันคุณภาพ** - ขั้นตอนการอนุมัติที่ในตัวเพื่อให้มั่นใจในคุณภาพเนื้อหา
- ✅ **การดำเนินการแบบกลุ่ม** - นำเข้า/ส่งออกการแปลผ่านไฟล์ CSV หรือ Excel
- ✅ **การวิเคราะห์ประสิทธิภาพ** - ติดตามการใช้งานและระบุพื้นที่ที่ต้องปรับปรุง
- ✅ **รองรับการทำงานออฟไลน์** - ทำงานต่อได้แม้มีการเชื่อมต่อจำกัด

---

## การเข้าถึงระบบจัดการการแปล

### ขั้นตอนที่ 1: เข้าสู่ระบบ
1. เปิดเว็บเบราว์เซอร์ในแท็บเล็ตของคุณ
2. ไปที่ URL ระบบ SOP ของร้านอาหารของคุณ
3. ใส่ **PIN 4 หลัก** ในหน้าจอเข้าสู่ระบบ
4. เลือก **สถานที่ร้านอาหาร** จากเมนูดรอปดาวน์
5. แตะ **"เข้าสู่ระบบ"** เพื่อเข้าสู่แดชบอร์ด

### ขั้นตอนที่ 2: ไปยังการจัดการการแปล
1. จากแดชบอร์ดหลัก แตะ **"การตั้งค่า"** ในเมนูนำทาง
2. เลือก **"การจัดการการแปล"** จากเมนูการตั้งค่า
3. คุณจะเห็นแดชบอร์ดการจัดการการแปลพร้อมสถิติภาพรวม

### ระดับสิทธิ์ผู้ใช้
- **ผู้ดู**: สามารถดูการแปลได้แต่ไม่สามารถแก้ไขได้
- **บรรณาธิการ**: สามารถสร้างและแก้ไขการแปลในสถานะร่าง
- **ผู้ตรวจสอบ**: สามารถตรวจสอบและอนุมัติการเปลี่ยนแปลงการแปล
- **ผู้ดูแล**: เข้าถึงได้เต็มที่ในฟีเจอร์การจัดการการแปลทั้งหมด

---

## ทำความเข้าใจหน้าจอการทำงาน

### ภาพรวมแดชบอร์ด
แดชบอร์ดการจัดการการแปลให้มุมมองที่ครอบคลุมของระบบการแปลของคุณ:

#### การ์ดสถิติ (แถวบน)
- **จำนวนคีย์ทั้งหมด**: จำนวนองค์ประกอบข้อความที่แปลได้
- **อัตราความสมบูรณ์**: เปอร์เซ็นต์ของการแปลที่เสร็จสมบูรณ์ในทุกภาษา
- **รอการอนุมัติ**: การแปลที่รอการตรวจสอบ
- **คะแนนคุณภาพ**: คะแนนคุณภาพเฉลี่ยตามความคิดเห็นจากการตรวจสอบ

#### การดำเนินการด่วน (ปุ่มส่วนหัว)
- **รีเฟรช**: อัปเดตข้อมูลแดชบอร์ด
- **ส่งออก**: ดาวน์โหลดการแปลเป็นไฟล์ CSV/Excel
- **นำเข้า**: อัปโหลดไฟล์การแปล
- **การแปลใหม่**: สร้างคีย์การแปลใหม่

#### แท็บนำทางหลัก
1. **ภาพรวม**: สถิติแดชบอร์ดและกิจกรรมล่าสุด
2. **คีย์**: จัดการคีย์การแปลและหมวดหมู่
3. **บรรณาธิการ**: สร้างและแก้ไขการแปลแต่ละรายการ
4. **กลุ่ม**: การดำเนินการนำเข้า/ส่งออกและการแก้ไขแบบกลุ่ม
5. **ขั้นตอนการทำงาน**: การจัดการการตรวจสอบและการอนุมัติ
6. **การวิเคราะห์**: สถิติการใช้งานและเมตริกประสิทธิภาพ

### ตัวบ่งชี้สถานะ
- 🟦 **ร่าง**: การแปลใหม่ ยังไม่ได้ตรวจสอบ
- 🟨 **ตรวจสอบ**: พร้อมสำหรับการตรวจสอบโดยผู้บังคับบัญชา
- 🟩 **อนุมัติแล้ว**: อนุมัติแล้วแต่ยังไม่ได้เผยแพร่
- 🔵 **เผยแพร่แล้ว**: ใช้งานจริงและมองเห็นได้โดยผู้ใช้
- 🟥 **เลิกใช้แล้ว**: ไม่ใช้อีกต่อไป

---

## การแก้ไขการแปลพื้นฐาน

### การสร้างการแปลใหม่
1. ไปที่แท็บ **"บรรณาธิการ"**
2. คลิกปุ่ม **"การแปลใหม่"**
3. กรอกข้อมูลในฟิลด์ที่จำเป็น:
   - **ชื่อคีย์**: ตัวระบุที่ไม่ซ้ำ (เช่น "menu.appetizers.title")
   - **หมวดหมู่**: การจำแนกกลุ่ม (เช่น "menu", "common", "errors")
   - **คำอธิบาย**: บริบทสำหรับผู้แปล
   - **ข้อความภาษาอังกฤษ**: เนื้อหาภาษาอังกฤษต้นฉบับ
   - **ข้อความภาษาไทย**: การแปลภาษาไทย

4. เพิ่ม **ตัวแปรการแทรก** หากข้อความมีเนื้อหาแบบไดนามิก:
   - ตัวอย่าง: "ยินดีต้อนรับ {customerName}" ใช้ตัวแปร `{customerName}`
   - ระบุตัวแปรในฟิลด์ "ตัวแปร": `customerName`

5. บันทึกเป็น **ร่าง** หรือส่งเพื่อ **ตรวจสอบ**

### การแก้ไขการแปลที่มีอยู่
1. ในแท็บ **"คีย์"** ค้นหาการแปลที่คุณต้องการแก้ไข
2. คลิกไอคอน **ดินสอ** ถัดจากคีย์การแปล
3. ทำการเปลี่ยนแปลงในเครื่องมือแก้ไข
4. เพิ่ม **หมายเหตุการเปลี่ยนแปลง** อธิบายสิ่งที่คุณแก้ไข
5. เลือกบันทึกเป็นร่างหรือส่งเพื่อตรวจสอบ

### รูปแบบข้อความ ICU
สำหรับการแปลที่ซับซ้อนที่มีการใช้พหูพจน์หรือการจัดรูปแบบ:

```
{count, plural, 
  =0 {ไม่มีรายการ} 
  =1 {รายการเดียว} 
  other {# รายการ}
}
```

---

## การดำเนินการแบบกลุ่ม

### การนำเข้าการแปลจากไฟล์

#### รูปแบบไฟล์ที่รองรับ
- **CSV**: ค่าที่คั่นด้วยเครื่องหมายจุลภาค (แนะนำ)
- **Excel**: ไฟล์ .xlsx ที่มีโครงสร้างคอลัมน์ที่เหมาะสม
- **JSON**: สำหรับผู้ใช้เทคนิค

#### โครงสร้างไฟล์ CSV
สร้างไฟล์ CSV ด้วยคอลัมน์เหล่านี้:
```
key_name,category,description,en_text,th_text,variables
menu.title,menu,หัวข้อเมนูหลัก,Menu,เมนู,
common.welcome,common,ข้อความต้อนรับ,Welcome {name},ยินดีต้อนรับ {name},name
```

#### ขั้นตอนการนำเข้า
1. ไปที่แท็บ **"กลุ่ม"**
2. คลิก **"นำเข้าการแปล"**
3. เลือกไฟล์ CSV/Excel ของคุณ
4. ตรวจสอบตัวอย่างการเปลี่ยนแปลง
5. เลือกตัวเลือกการนำเข้า:
   - **ข้ามที่มีอยู่**: เพิ่มเฉพาะการแปลใหม่
   - **อัปเดตที่มีอยู่**: เขียนทับการแปลที่มีอยู่
   - **สร้างร่าง**: นำเข้าเป็นสถานะร่าง
6. คลิก **"นำเข้า"** เพื่อประมวลผล

### การส่งออกการแปล

#### ตัวเลือกการส่งออก
1. **การแปลทั้งหมด**: ชุดข้อมูลครบถ้วน
2. **ตามหมวดหมู่**: เฉพาะหมวดหมู่เฉพาะ
3. **ตามสถานะ**: เฉพาะร่าง อนุมัติแล้ว ฯลฯ
4. **ตามภาษา**: อังกฤษ ไทย หรือทั้งคู่

#### ขั้นตอนการส่งออก
1. ไปที่แท็บ **"กลุ่ม"**
2. คลิก **"ส่งออกการแปล"**
3. เลือกเกณฑ์การส่งออก
4. เลือกรูปแบบไฟล์ (แนะนำ CSV)
5. คลิก **"ดาวน์โหลด"** เมื่อพร้อม

---

## ขั้นตอนการอนุมัติ

### ทำความเข้าใจขั้นตอนการทำงาน
1. **ร่าง** → **ตรวจสอบ** → **อนุมัติ** → **เผยแพร่**
2. แต่ละขั้นตอนต้องการสิทธิ์ผู้ใช้ที่เหมาะสม
3. การเปลี่ยนแปลงจะถูกติดตามและตรวจสอบได้

### การส่งเพื่อตรวจสอบ
1. หลังจากแก้ไขการแปล คลิก **"ส่งเพื่อตรวจสอบ"**
2. เพิ่มหมายเหตุการตรวจสอบอธิบายการเปลี่ยนแปลงของคุณ
3. มอบหมายให้ผู้ตรวจสอบเฉพาะ (หากจำเป็น)
4. สถานะการแปลเปลี่ยนเป็น "ตรวจสอบ"

### การตรวจสอบการแปล
**สำหรับผู้ตรวจสอบและผู้จัดการ:**

1. ไปที่แท็บ **"ขั้นตอนการทำงาน"**
2. ดูการตรวจสอบที่รออยู่ในคิว
3. คลิกที่การแปลเพื่อตรวจสอบ
4. ตรวจสอบคุณภาพการแปล:
   - **ความถูกต้อง**: ความหมายที่ถูกต้องได้รับการรักษาไว้
   - **ความสอดคล้อง**: เหมาะสมกับแนวทางสไตล์
   - **บริบท**: เหมาะสมสำหรับสภาพแวดล้อมร้านอาหาร
5. การดำเนินการที่มี:
   - **อนุมัติ**: ย้ายไปยังสถานะที่อนุมัติแล้ว
   - **ขอการเปลี่ยนแปลง**: ส่งกลับไปที่เครื่องมือแก้ไขพร้อมความคิดเห็น
   - **ปฏิเสธ**: ยกเลิกคำขอเปลี่ยนแปลง

---

## การทำงานร่วมกันแบบเรียลไทม์

### ฟีเจอร์การแก้ไขสด
- **การแก้ไขพร้อมกัน**: ผู้ใช้หลายคนสามารถทำงานบนการแปลที่แตกต่างกันได้
- **การอัปเดตสด**: เห็นการเปลี่ยนแปลงที่ทำโดยสมาชิกในทีมอื่นทันที
- **การแจ้งเตือนการแก้ไข**: ระบบแจ้งเตือนเมื่อมีคนอื่นกำลังแก้ไข
- **การแก้ไขความขัดแย้ง**: การจัดการอัตโนมัติของการแก้ไขพร้อมกัน

### แนวทางปฏิบัติที่ดีสำหรับการทำงานร่วมกัน
1. **การสื่อสาร**: ใช้ระบบความคิดเห็นที่ในตัว
2. **การประสานงาน**: ตรวจสอบว่าใครออนไลน์ก่อนเริ่มการแก้ไขครั้งใหญ่
3. **ความตระหนักในสถานะ**: ติดตามสถานะการแปลเพื่อหลีกเลี่ยงความขัดแย้ง
4. **การซิงก์ปกติ**: รีเฟรชเบราว์เซอร์บางครั้งเพื่อการอัปเดตล่าสุด

---

## งานทั่วไป

### การบำรุงรักษาการแปลประจำวัน

#### รายการตรวจสอบตอนเช้า
1. **ตรวจสอบแดชบอร์ด**: ตรวจสอบกิจกรรมข้ามคืนและคำขอใหม่
2. **คิวการตรวจสอบ**: ประมวลผลการแปลที่รอการอนุมัติ
3. **การตรวจสอบคุณภาพ**: ตรวจสอบว่าการแปลที่เผยแพร่แสดงถูกต้อง
4. **การประสานงานทีม**: ตรวจสอบการมอบหมายทีมและลำดับความสำคัญ

#### งานประจำสัปดาห์
1. **ส่งออกสำรอง**: ดาวน์โหลดชุดการแปลที่สมบูรณ์
2. **การตรวจสอบการวิเคราะห์**: ตรวจสอบสถิติการใช้งานและประสิทธิภาพ
3. **การตรวจสอบคุณภาพ**: ตรวจสอบคะแนนคุณภาพการแปล
4. **การฝึกอบรมทีม**: จัดการกับปัญหาที่เกิดขึ้นซ้ำ

---

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อยและวิธีแก้ไข

#### "การแปลไม่แสดง"
**อาการ**: การแปลใหม่ไม่ปรากฏในแอป
**วิธีแก้ไข**:
1. ตรวจสอบสถานะการแปล - ต้อง "เผยแพร่แล้ว"
2. ล้างแคชเบราว์เซอร์และโหลดแอปใหม่
3. ตรวจสอบว่าเลือกภาษาที่ถูกต้อง
4. ตรวจสอบการพิมพ์ผิดในคีย์การแปล

#### "ไม่สามารถบันทึกการเปลี่ยนแปลง"
**อาการ**: ปุ่มบันทึกไม่ทำงานหรือแสดงข้อผิดพลาด
**วิธีแก้ไข**:
1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
2. ตรวจสอบว่าคุณมีสิทธิ์แก้ไข
3. ตรวจสอบให้แน่ใจว่าฟิลด์ที่จำเป็นทั้งหมดถูกกรอก
4. ลองรีเฟรชหน้าและใส่การเปลี่ยนแปลงใหม่

#### "การนำเข้าไฟล์ล้มเหลว"
**อาการ**: การนำเข้า CSV/Excel แสดงข้อผิดพลาด
**วิธีแก้ไข**:
1. ตรวจสอบรูปแบบไฟล์ตรงกับเทมเพลต
2. ตรวจสอบว่าคอลัมน์ที่จำเป็นทั้งหมดมีอยู่
3. ลบอักขระพิเศษออกจากชื่อคีย์
4. ตรวจสอบให้แน่ใจว่าขนาดไฟล์ต่ำกว่า 10MB

### การขอความช่วยเหลือ

#### การสนับสนุนในแอป
1. คลิกปุ่ม **"ช่วยเหลือ"** ในการนำทางด้านบน
2. ใช้ **"แชทสด"** สำหรับความช่วยเหลือทันที
3. ส่ง **"รายงานข้อบกพร่อง"** สำหรับปัญหาทางเทคนิค
4. เข้าถึง **"วิดีโอสอน"** สำหรับคำแนะนำภาพ

#### ข้อมูลติดต่อ
- **การสนับสนุนทางเทคนิค**: support@krongthai.com
- **ทีมการแปล**: translation@krongthai.com
- **สายด่วนฉุกเฉิน**: มีในการตั้งค่าระบบ

---

## แนวทางปฏิบัติที่ดี

### แนวทางคุณภาพการแปล

#### การเขียนการแปลที่มีประสิทธิภาพ
1. **รักษาบริบท**: เข้าใจว่าข้อความปรากฏที่ไหนในแอป
2. **รักษาโทน**: จับคู่เสียงที่เป็นมิตรและเป็นมืออาชีพของร้านอาหาร
3. **ความไวทางวัฒนธรรม**: ตรวจสอบให้แน่ใจว่าการแปลภาษาไทยเหมาะสมทางวัฒนธรรม
4. **ความสอดคล้อง**: ใช้คำศัพท์เดียวกันตลอดทั้งระบบ
5. **ความชัดเจน**: เขียนให้ชัดเจนสำหรับระดับความสามารถทางภาษาที่แตกต่างกัน

#### แนวทางภาษาไทย
- ใช้ระดับความสุภาพที่เหมาะสม
- พิจารณาความแตกต่างของภาษาไทยในแต่ละภูมิภาค
- รักษาความสอดคล้องในศัพท์เทคนิค
- ใช้ฟอนต์ที่ชัดเจนและอ่านง่าย
- คำนึงถึงความแตกต่างของความยาวข้อความ

### ประสิทธิภาพขั้นตอนการทำงาน

#### การวางแผนงานของคุณ
1. **จัดลำดับความสำคัญ**: เน้นที่การแปลที่มีผลกระทบสูงก่อน
2. **จัดกลุ่มที่คล้ายกัน**: จัดกลุ่มการแปลประเภทที่คล้ายกัน
3. **การตรวจสอบปกติ**: อย่าให้คิวการตรวจสอบสะสม
4. **เอกสาร**: เก็บบันทึกการตัดสินใจและตัวเลือกสไตล์

### การประสานงานทีม

#### โปรโตคอลการสื่อสาร
1. **การรายงานประจำวัน**: การตรวจสอบทีมสั้นๆ เกี่ยวกับสถานะการแปล
2. **การแจ้งเตือนการเปลี่ยนแปลง**: แจ้งทีมเกี่ยวกับการอัปเดตที่สำคัญ
3. **คู่มือสไตล์**: รักษาแนวทางสไตล์การแปลที่ใช้ร่วมกัน
4. **การอัปเดตการฝึกอบรม**: การฝึกอบรมทีมปกติเกี่ยวกับฟีเจอร์ใหม่

---

**End of User Guide / จบคู่มือผู้ใช้**

---

## Additional Resources / แหล่งข้อมูลเพิ่มเติม

### Video Tutorials / วิดีโอสอน
- **Getting Started** / **การเริ่มต้น**: Basic navigation and setup
- **Advanced Editing** / **การแก้ไขขั้นสูง**: ICU formatting and complex translations
- **Team Collaboration** / **การทำงานเป็นทีม**: Working with approval workflows

### Quick Reference Cards / การ์ดอ้างอิงด่วน
- **Keyboard Shortcuts** / **แป้นพิมพ์ลัด**: Speed up your workflow
- **Status Codes** / **รหัสสถานะ**: Understanding translation states
- **Error Messages** / **ข้อความข้อผิดพลาด**: Common issues and solutions

### Contact Support / ติดต่อฝ่ายสนับสนุน
For additional help, contact your system administrator or the technical support team.
สำหรับความช่วยเหลือเพิ่มเติม ติดต่อผู้ดูแลระบบหรือทีมสนับสนุนทางเทคนิค

**Document Version**: 2.0.0  
**Last Updated**: 2025-07-27  
**Languages**: English, Thai (ไทย)  
**Platform**: Krong Thai SOP Management System