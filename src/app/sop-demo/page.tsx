"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOPCategoryDashboard } from "@/components/sop/sop-category-dashboard";
import { SOPDocumentViewer } from "@/components/sop/sop-document-viewer";
import { 
  StatusIndicator, 
  ComplianceIndicator, 
  PriorityIndicator, 
  ProgressRing, 
  TeamProgress, 
  TrendIndicator 
} from "@/components/sop/sop-status-indicators";
import { SOPCategory, SOP_CATEGORIES } from "@/components/sop/sop-category-icons";
import { Globe, Palette, Smartphone, Users, BarChart3, Settings } from 'lucide-react';

// Mock SOP document data for demonstration
const mockSOPDocument = {
  id: "sop-001",
  categoryId: 1,
  title: {
    en: "Food Safety & Temperature Control",
    th: "ความปลอดภัยอาหารและการควบคุมอุณหภูมิ"
  },
  description: {
    en: "This SOP outlines the critical procedures for maintaining food safety standards and proper temperature control throughout all food handling processes in Restaurant Krong Thai.",
    th: "SOP นี้อธิบายขั้นตอนสำคัญในการรักษามาตรฐานความปลอดภัยอาหารและการควบคุมอุณหภูมิที่เหมาะสมตthrough all food handling processes in Restaurant Krong Thai."
  },
  version: "2.1",
  lastUpdated: new Date("2024-01-15"),
  estimatedTime: 45,
  difficulty: "intermediate" as const,
  requiredRoles: ["Chef", "Kitchen Staff", "Food Handler"],
  steps: [
    {
      id: "step-1",
      title: {
        en: "Temperature Check Setup",
        th: "การตั้งค่าการตรวจสอบอุณหภูมิ"
      },
      description: {
        en: "Set up digital thermometer and calibrate according to manufacturer specifications. Ensure thermometer is clean and sanitized before use.",
        th: "ตั้งค่าเครื่องวัดอุณหภูมิดิจิทัลและปรับเทียบตามข้อกำหนดของผู้ผลิต ตรวจสอบให้แน่ใจว่าเครื่องวัดอุณหภูมิสะอาดและฆ่าเชื้อก่อนใช้งาน"
      },
      duration: 5,
      critical: true,
      mediaUrl: "/demo/thermometer-setup.jpg",
      mediaType: "image" as const,
      checkpoints: [
        {
          en: "Thermometer displays accurate reading",
          th: "เครื่องวัดอุณหภูมิแสดงค่าที่ถูกต้อง"
        },
        {
          en: "Device is properly sanitized",
          th: "อุปกรณ์ได้รับการฆ่าเชื้ออย่างเหมาะสม"
        }
      ],
      warnings: [
        {
          en: "Never use a damaged or uncalibrated thermometer",
          th: "ห้ามใช้เครื่องวัดอุณหภูมิที่เสียหายหรือไม่ได้ปรับเทียบ"
        }
      ],
      completed: true
    },
    {
      id: "step-2",
      title: {
        en: "Cold Storage Temperature Monitoring",
        th: "การตรวจสอบอุณหภูมิห้องเย็น"
      },
      description: {
        en: "Check and record temperatures of all refrigeration units. Cold storage should maintain 0-4°C (32-39°F). Record readings in the daily log.",
        th: "ตรวจสอบและบันทึกอุณหภูมิของหน่วยทำความเย็นทั้งหมด ห้องเย็นควรรักษาอุณหภูมิ 0-4°C (32-39°F) บันทึกค่าที่อ่านได้ในบันทึกประจำวัน"
      },
      duration: 10,
      critical: true,
      mediaUrl: "/demo/cold-storage-check.mp4",
      mediaType: "video" as const,
      checkpoints: [
        {
          en: "All refrigeration units within safe temperature range",
          th: "หน่วยทำความเย็นทั้งหมดอยู่ในช่วงอุณหภูมิที่ปลอดภัย"
        },
        {
          en: "Temperature readings recorded in log",
          th: "บันทึกค่าอุณหภูมิในแฟ้มบันทึก"
        }
      ],
      completed: true
    },
    {
      id: "step-3",
      title: {
        en: "Hot Food Temperature Verification",
        th: "การตรวจสอบอุณหภูมิอาหารร้อน"
      },
      description: {
        en: "Verify that all hot foods are maintained at 60°C (140°F) or above. Check each dish before service and record temperatures.",
        th: "ตรวจสอบให้แน่ใจว่าอาหารร้อนทั้งหมดรักษาอุณหภูมิที่ 60°C (140°F) หรือสูงกว่า ตรวจสอบอาหารแต่ละจานก่อนเสิร์ฟและบันทึกอุณหภูมิ"
      },
      duration: 15,
      critical: true,
      checkpoints: [
        {
          en: "All hot dishes above minimum temperature",
          th: "อาหารร้อนทั้งหมดสูงกว่าอุณหภูมิขั้นต่ำ"
        },
        {
          en: "Temperature log updated",
          th: "อัปเดตบันทึกอุณหภูมิ"
        }
      ],
      warnings: [
        {
          en: "Food below safe temperature must be reheated or discarded",
          th: "อาหารที่อุณหภูมิต่ำกว่าที่ปลอดภัยต้องอุ่นใหม่หรือทิ้ง"
        }
      ],
      completed: false
    }
  ],
  attachments: [
    {
      name: "Temperature Control Checklist.pdf",
      url: "/demo/temp-checklist.pdf",
      type: "pdf" as const,
      size: "2.3 MB"
    },
    {
      name: "Food Safety Guidelines.pdf",
      url: "/demo/food-safety.pdf",
      type: "pdf" as const,
      size: "1.8 MB"
    }
  ],
  relatedSOPs: ["sop-002", "sop-003"],
  completionRate: 67,
  viewCount: 142,
  lastCompletedBy: {
    name: "Chef Siriporn",
    date: new Date("2024-01-14")
  }
};

export default function SOPDemoPage() {
  const [language, setLanguage] = useState<'en' | 'th'>('en');
  const [currentView, setCurrentView] = useState<'dashboard' | 'document'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<SOPCategory | null>(null);

  const handleCategorySelect = (category: SOPCategory) => {
    setSelectedCategory(category);
    setCurrentView('document');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedCategory(null);
  };

  const handleStepComplete = (stepId: string) => {
    // In a real app, this would update the backend
    console.log(`Step ${stepId} completed`);
  };

  const handleDocumentComplete = () => {
    // In a real app, this would mark the entire document as completed
    console.log('Document completed');
  };

  // Mock team data for demonstration
  const mockTeamStats = {
    total: 48,
    completed: 32,
    inProgress: 12,
    notStarted: 4
  };

  const mockRecentActivity = [
    {
      name: "Chef Siriporn",
      action: language === 'en' ? "completed Food Safety SOP" : "ทำ SOP ความปลอดภัยอาหารเสร็จ",
      timestamp: new Date("2024-01-16T14:30:00")
    },
    {
      name: "Waiter Niran",
      action: language === 'en' ? "started Service Standards training" : "เริ่มการฝึกอบรมมาตรฐานการบริการ",
      timestamp: new Date("2024-01-16T13:15:00")
    },
    {
      name: "Manager Ploy",
      action: language === 'en' ? "reviewed Opening Procedures" : "ทบทวนขั้นตอนเปิดร้าน",
      timestamp: new Date("2024-01-16T10:45:00")
    }
  ];

  return (
    <div className="min-h-screen bg-krong-white">
      {/* Header */}
      <div className="bg-krong-black text-krong-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${
                language === 'fr' ? 'font-french' : 'font-heading'
              }`}>
                {language === 'en' ? 'SOP Design System Demo' : 'การสาธิต SOP Design System'}
              </h1>
              <p className={`text-krong-white/80 mt-2 ${
                language === 'fr' ? 'font-thai text-base' : 'font-body'
              }`}>
                {language === 'en' 
                  ? 'Comprehensive UI system for Restaurant Krong Thai SOP management' 
                  : 'ระบบ UI ที่ครอบคลุมสำหรับการจัดการ SOP ของร้านอาหารกรองไทย'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
                className="h-12"
              >
                <Globe className="h-4 w-4 mr-2" />
                EN
              </Button>
              <Button
                variant={language === 'fr' ? 'default' : 'outline'}
                onClick={() => setLanguage('th')}
                className="h-12"
              >
                <Globe className="h-4 w-4 mr-2" />
                TH
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="dashboard" className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 h-14 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'en' ? 'SOP Dashboard' : 'แดชบอร์ด SOP'}
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {language === 'en' ? 'UI Components' : 'คอมโพเนนต์ UI'}
            </TabsTrigger>
            <TabsTrigger value="responsive" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              {language === 'en' ? 'Tablet Design' : 'การออกแบบสำหรับแท็บเล็ต'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {currentView === 'dashboard' ? (
              <SOPCategoryDashboard
                language={language}
                onCategorySelect={handleCategorySelect}
              />
            ) : (
              <SOPDocumentViewer
                document={mockSOPDocument}
                language={language}
                onBack={handleBackToDashboard}
                onStepComplete={handleStepComplete}
                onDocumentComplete={handleDocumentComplete}
              />
            )}
          </TabsContent>

          <TabsContent value="components" className="space-y-8">
            <div className="grid gap-8">
              {/* Status Indicators */}
              <Card>
                <CardHeader>
                  <h2 className={`text-xl font-semibold ${
                    language === 'fr' ? 'font-french' : 'font-heading'
                  }`}>
                    {language === 'en' ? 'Status Indicators' : 'ตัวแสดงสถานะ'}
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className={`font-medium ${
                      language === 'fr' ? 'font-french' : 'font-ui'
                    }`}>
                      {language === 'en' ? 'Completion Status' : 'สถานะการทำให้สำเร็จ'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <StatusIndicator status="completed" language={language} />
                      <StatusIndicator status="in_progress" language={language} />
                      <StatusIndicator status="not_started" language={language} />
                      <StatusIndicator status="overdue" language={language} />
                      <StatusIndicator status="review_required" language={language} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className={`font-medium ${
                      language === 'fr' ? 'font-french' : 'font-ui'
                    }`}>
                      {language === 'en' ? 'Compliance Levels' : 'ระดับการปฏิบัติตาม'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <ComplianceIndicator level="compliant" language={language} percentage={95} showPercentage />
                      <ComplianceIndicator level="warning" language={language} percentage={78} showPercentage />
                      <ComplianceIndicator level="non_compliant" language={language} percentage={45} showPercentage />
                      <ComplianceIndicator level="unknown" language={language} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className={`font-medium ${
                      language === 'fr' ? 'font-french' : 'font-ui'
                    }`}>
                      {language === 'en' ? 'Priority Levels' : 'ระดับความสำคัญ'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <PriorityIndicator priority="critical" language={language} />
                      <PriorityIndicator priority="high" language={language} />
                      <PriorityIndicator priority="medium" language={language} />
                      <PriorityIndicator priority="low" language={language} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Indicators */}
              <Card>
                <CardHeader>
                  <h2 className={`text-xl font-semibold ${
                    language === 'fr' ? 'font-french' : 'font-heading'
                  }`}>
                    {language === 'en' ? 'Progress Indicators' : 'ตัวแสดงความคืบหน้า'}
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-8 items-center">
                    <ProgressRing percentage={85} size="sm" />
                    <ProgressRing percentage={67} size="md" />
                    <ProgressRing percentage={92} size="lg" />
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <TrendIndicator trend="up" value={12} label={language === 'en' ? 'This week' : 'สัปดาห์นี้'} language={language} />
                    <TrendIndicator trend="down" value={5} label={language === 'en' ? 'This month' : 'เดือนนี้'} language={language} />
                    <TrendIndicator trend="stable" value={0} label={language === 'en' ? 'No change' : 'ไม่เปลี่ยนแปลง'} language={language} />
                  </div>
                </CardContent>
              </Card>

              {/* Team Progress */}
              <TeamProgress 
                teamStats={mockTeamStats}
                language={language}
                recentActivity={mockRecentActivity}
              />
            </div>
          </TabsContent>

          <TabsContent value="responsive" className="space-y-8">
            <div className="grid gap-8">
              <Card>
                <CardHeader>
                  <h2 className={`text-xl font-semibold ${
                    language === 'fr' ? 'font-french' : 'font-heading'
                  }`}>
                    {language === 'en' ? 'Tablet-Optimized Design Features' : 'คุณสมบัติการออกแบบที่เหมาะสำหรับแท็บเล็ต'}
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-krong-red" />
                        <h3 className={`font-medium ${
                          language === 'fr' ? 'font-french' : 'font-ui'
                        }`}>
                          {language === 'en' ? 'Touch-Friendly Interactions' : 'การโต้ตอบที่เป็นมิตรกับการสัมผัส'}
                        </h3>
                      </div>
                      <ul className={`space-y-2 text-sm text-krong-black/70 ${
                        language === 'fr' ? 'font-french' : 'font-body'
                      }`}>
                        <li>• {language === 'en' ? 'Minimum 44px touch targets' : 'เป้าหมายการสัมผัสขั้นต่ำ 44px'}</li>
                        <li>• {language === 'en' ? 'Swipe gestures for navigation' : 'ท่าทางปัดสำหรับการนำทาง'}</li>
                        <li>• {language === 'en' ? 'Large, readable fonts' : 'ฟอนต์ขนาดใหญ่ที่อ่านง่าย'}</li>
                        <li>• {language === 'en' ? 'Adequate spacing between elements' : 'ระยะห่างที่เพียงพอระหว่างองค์ประกอบ'}</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-golden-saffron" />
                        <h3 className={`font-medium ${
                          language === 'fr' ? 'font-french' : 'font-ui'
                        }`}>
                          {language === 'en' ? 'Bilingual Support' : 'การสนับสนุนสองภาษา'}
                        </h3>
                      </div>
                      <ul className={`space-y-2 text-sm text-krong-black/70 ${
                        language === 'fr' ? 'font-french' : 'font-body'
                      }`}>
                        <li>• {language === 'en' ? 'Dynamic font switching' : 'การสลับฟอนต์แบบไดนามิก'}</li>
                        <li>• {language === 'en' ? 'Proper Thai text rendering' : 'การแสดงผลข้อความไทยที่เหมาะสม'}</li>
                        <li>• {language === 'en' ? 'Cultural color preferences' : 'การตั้งค่าสีตามวัฒนธรรม'}</li>
                        <li>• {language === 'en' ? 'Context-aware translations' : 'การแปลที่ตระหนักถึงบริบท'}</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-jade-green" />
                        <h3 className={`font-medium ${
                          language === 'fr' ? 'font-french' : 'font-ui'
                        }`}>
                          {language === 'en' ? 'Brand Consistency' : 'ความสอดคล้องของแบรนด์'}
                        </h3>
                      </div>
                      <ul className={`space-y-2 text-sm text-krong-black/70 ${
                        language === 'fr' ? 'font-french' : 'font-body'
                      }`}>
                        <li>• {language === 'en' ? 'Restaurant brand colors' : 'สีแบรนด์ของร้านอาหาร'}</li>
                        <li>• {language === 'en' ? 'Typography hierarchy' : 'ลำดับชั้นของการพิมพ์'}</li>
                        <li>• {language === 'en' ? 'Consistent iconography' : 'ไอคอนที่สอดคล้องกัน'}</li>
                        <li>• {language === 'en' ? 'Professional appearance' : 'รูปลักษณ์ที่เป็นมืออาชีพ'}</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-earthen-beige" />
                        <h3 className={`font-medium ${
                          language === 'fr' ? 'font-french' : 'font-ui'
                        }`}>
                          {language === 'en' ? 'Staff-Focused UX' : 'UX ที่เน้นพนักงาน'}
                        </h3>
                      </div>
                      <ul className={`space-y-2 text-sm text-krong-black/70 ${
                        language === 'fr' ? 'font-french' : 'font-body'
                      }`}>
                        <li>• {language === 'en' ? 'Quick task completion' : 'การทำงานให้เสร็จอย่างรวดเร็ว'}</li>
                        <li>• {language === 'en' ? 'Clear visual hierarchy' : 'ลำดับชั้นการมองเห็นที่ชัดเจน'}</li>
                        <li>• {language === 'en' ? 'Minimal cognitive load' : 'ภาระทางปัญญาน้อยที่สุด'}</li>
                        <li>• {language === 'en' ? 'Error prevention design' : 'การออกแบบป้องกันข้อผิดพลาด'}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}