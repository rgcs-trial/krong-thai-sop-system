"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
  Shield,
  ChefHat,
  Flame,
  UtensilsCrossed,
  HandHeart,
  MessageCircle,
  CreditCard,
  Package,
  Sunrise,
  Sunset,
  Sparkles,
  Settings,
  AlertTriangle,
  Heart,
  GraduationCap,
  CheckCircle
} from 'lucide-react';

export interface SOPCategory {
  id: number;
  nameEn: string;
  nameTh: string;
  icon: LucideIcon;
  color: string;
  description: {
    en: string;
    th: string;
  };
  priority: 'critical' | 'high' | 'medium' | 'standard';
}

export const SOP_CATEGORIES: SOPCategory[] = [
  {
    id: 1,
    nameEn: "Food Safety & Hygiene",
    nameTh: "ความปลอดภัยและสุขอนามัยอาหาร",
    icon: Shield,
    color: "text-krong-red bg-red-50 border-red-200",
    description: {
      en: "Food handling protocols, HACCP guidelines, and hygiene standards",
      th: "ขั้นตอนการจัดการอาหาร แนวทาง HACCP และมาตรฐานสุขอนามัย"
    },
    priority: 'critical'
  },
  {
    id: 2,
    nameEn: "Food Preparation",
    nameTh: "การเตรียมอาหาร",
    icon: ChefHat,
    color: "text-golden-saffron bg-yellow-50 border-yellow-200",
    description: {
      en: "Ingredient prep, mise en place, and preparation techniques",
      th: "การเตรียมวัตถุดิบ การจัดเตรียม และเทคนิคการเตรียมอาหาร"
    },
    priority: 'high'
  },
  {
    id: 3,
    nameEn: "Cooking Procedures",
    nameTh: "ขั้นตอนการปรุงอาหาร",
    icon: Flame,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    description: {
      en: "Cooking methods, temperature control, and recipe execution",
      th: "วิธีการปรุงอาหาร การควบคุมอุณหภูมิ และการทำตามสูตร"
    },
    priority: 'high'
  },
  {
    id: 4,
    nameEn: "Plating & Presentation",
    nameTh: "การจัดจานและการนำเสนอ",
    icon: UtensilsCrossed,
    color: "text-jade-green bg-teal-50 border-teal-200",
    description: {
      en: "Food plating standards, garnishing, and presentation techniques",
      th: "มาตรฐานการจัดจาน การตกแต่ง และเทคนิคการนำเสนอ"
    },
    priority: 'high'
  },
  {
    id: 5,
    nameEn: "Service Standards",
    nameTh: "มาตรฐานการบริการ",
    icon: HandHeart,
    color: "text-pink-600 bg-pink-50 border-pink-200",
    description: {
      en: "Service protocols, timing standards, and guest experience",
      th: "ระเบียบการบริการ มาตรฐานเวลา และประสบการณ์ลูกค้า"
    },
    priority: 'critical'
  },
  {
    id: 6,
    nameEn: "Customer Interaction",
    nameTh: "การปฏิสัมพันธ์กับลูกค้า",
    icon: MessageCircle,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    description: {
      en: "Communication guidelines, complaint handling, and guest relations",
      th: "แนวทางการสื่อสาร การจัดการข้อร้องเรียน และความสัมพันธ์กับลูกค้า"
    },
    priority: 'high'
  },
  {
    id: 7,
    nameEn: "POS & Billing",
    nameTh: "ระบบ POS และการเรียกเก็บเงิน",
    icon: CreditCard,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    description: {
      en: "Point of sale operations, payment processing, and billing procedures",
      th: "การดำเนินการ POS การประมวลผลการชำระเงิน และขั้นตอนการเรียกเก็บ"
    },
    priority: 'high'
  },
  {
    id: 8,
    nameEn: "Inventory Management",
    nameTh: "การจัดการสินค้าคงคลัง",
    icon: Package,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    description: {
      en: "Stock control, ordering procedures, and inventory tracking",
      th: "การควบคุมสต็อก ขั้นตอนการสั่งซื้อ และการติดตามสินค้าคงคลัง"
    },
    priority: 'medium'
  },
  {
    id: 9,
    nameEn: "Opening Procedures",
    nameTh: "ขั้นตอนการเปิดร้าน",
    icon: Sunrise,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    description: {
      en: "Daily opening checklist, setup procedures, and preparation tasks",
      th: "รายการตรวจสอบการเปิดร้าน ขั้นตอนการติดตั้ง และงานเตรียมการ"
    },
    priority: 'critical'
  },
  {
    id: 10,
    nameEn: "Closing Procedures",
    nameTh: "ขั้นตอนการปิดร้าน",
    icon: Sunset,
    color: "text-orange-700 bg-orange-50 border-orange-200",
    description: {
      en: "End-of-day tasks, security procedures, and closing checklist",
      th: "งานสิ้นวัน ขั้นตอนความปลอดภัย และรายการตรวจสอบการปิดร้าน"
    },
    priority: 'critical'
  },
  {
    id: 11,
    nameEn: "Cleaning & Sanitation",
    nameTh: "การทำความสะอาดและสุขาภิบาล",
    icon: Sparkles,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
    description: {
      en: "Cleaning schedules, sanitation protocols, and maintenance tasks",
      th: "ตารางการทำความสะอาด ระเบียบสุขาภิบาล และงานบำรุงรักษา"
    },
    priority: 'critical'
  },
  {
    id: 12,
    nameEn: "Equipment Operation",
    nameTh: "การใช้งานอุปกรณ์",
    icon: Settings,
    color: "text-gray-600 bg-gray-50 border-gray-200",
    description: {
      en: "Equipment usage, maintenance procedures, and troubleshooting",
      th: "การใช้อุปกรณ์ ขั้นตอนการบำรุงรักษา และการแก้ไขปัญหา"
    },
    priority: 'medium'
  },
  {
    id: 13,
    nameEn: "Emergency Procedures",
    nameTh: "ขั้นตอนการฉุกเฉิน",
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50 border-red-200",
    description: {
      en: "Emergency protocols, evacuation procedures, and incident response",
      th: "ระเบียบฉุกเฉิน ขั้นตอนการอพยพ และการตอบสนองต่อเหตุการณ์"
    },
    priority: 'critical'
  },
  {
    id: 14,
    nameEn: "Health & Safety",
    nameTh: "สุขภาพและความปลอดภัย",
    icon: Heart,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    description: {
      en: "Workplace safety, health regulations, and injury prevention",
      th: "ความปลอดภัยในที่ทำงาน กฎระเบียบสุขภาพ และการป้องกันการบาดเจ็บ"
    },
    priority: 'critical'
  },
  {
    id: 15,
    nameEn: "Staff Training",
    nameTh: "การฝึกอบรมพนักงาน",
    icon: GraduationCap,
    color: "text-green-600 bg-green-50 border-green-200",
    description: {
      en: "Training programs, skill development, and competency assessments",
      th: "โปรแกรมการฝึกอบรม การพัฒนาทักษะ และการประเมินความสามารถ"
    },
    priority: 'medium'
  },
  {
    id: 16,
    nameEn: "Quality Control",
    nameTh: "การควบคุมคุณภาพ",
    icon: CheckCircle,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description: {
      en: "Quality standards, inspection procedures, and continuous improvement",
      th: "มาตรฐานคุณภาพ ขั้นตอนการตรวจสอบ และการปรับปรุงอย่างต่อเนื่อง"
    },
    priority: 'high'
  }
];

export function getCategoryById(id: number): SOPCategory | undefined {
  return SOP_CATEGORIES.find(category => category.id === id);
}

export function getCategoriesByPriority(priority: SOPCategory['priority']): SOPCategory[] {
  return SOP_CATEGORIES.filter(category => category.priority === priority);
}

export function getPriorityColor(priority: SOPCategory['priority']): string {
  switch (priority) {
    case 'critical':
      return 'bg-krong-red text-white';
    case 'high':
      return 'bg-golden-saffron text-krong-black';
    case 'medium':
      return 'bg-jade-green text-white';
    case 'standard':
      return 'bg-earthen-beige text-krong-black';
    default:
      return 'bg-gray-500 text-white';
  }
}