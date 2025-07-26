"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  SOP_CATEGORIES, 
  SOPCategory, 
  getPriorityColor, 
  getCategoriesByPriority 
} from './sop-category-icons';
import { Search, Filter, Grid3X3, List, Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react';

interface SOPCategoryCardProps {
  category: SOPCategory;
  language: 'en' | 'th';
  completionRate: number;
  lastAccessed?: Date;
  onClick: (category: SOPCategory) => void;
}

function SOPCategoryCard({ 
  category, 
  language, 
  completionRate, 
  lastAccessed, 
  onClick 
}: SOPCategoryCardProps) {
  const Icon = category.icon;
  const name = language === 'en' ? category.nameEn : category.nameTh;
  const description = category.description[language];

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-krong-red/20 active:scale-[0.98]"
      onClick={() => onClick(category)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${category.color} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getPriorityColor(category.priority)} variant="secondary">
              {category.priority.toUpperCase()}
            </Badge>
            {completionRate === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : completionRate > 0 ? (
              <Clock className="h-5 w-5 text-golden-saffron" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <h3 className={`font-heading text-lg font-semibold text-krong-black line-clamp-2 ${
              language === 'th' ? 'font-thai' : ''
            }`}>
              {name}
            </h3>
            <p className={`text-sm text-krong-black/70 mt-1 line-clamp-2 ${
              language === 'th' ? 'font-thai' : 'font-body'
            }`}>
              {description}
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-krong-black/60">
                {language === 'en' ? 'Completion' : 'ความคืบหน้า'}
              </span>
              <span className="font-medium text-krong-black">{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  completionRate === 100 
                    ? 'bg-green-500' 
                    : completionRate > 50 
                      ? 'bg-golden-saffron' 
                      : 'bg-krong-red'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          
          {/* Last Accessed */}
          {lastAccessed && (
            <div className="text-xs text-krong-black/50 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {language === 'en' ? 'Last accessed: ' : 'เข้าดูล่าสุด: '}
                {lastAccessed.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SOPCategoryDashboardProps {
  language: 'en' | 'th';
  onCategorySelect: (category: SOPCategory) => void;
}

export function SOPCategoryDashboard({ language, onCategorySelect }: SOPCategoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Mock completion data - in real app, this would come from the database
  const mockCompletionData = {
    1: { rate: 95, lastAccessed: new Date('2024-01-15') },
    2: { rate: 78, lastAccessed: new Date('2024-01-14') },
    3: { rate: 89, lastAccessed: new Date('2024-01-13') },
    4: { rate: 82, lastAccessed: new Date('2024-01-12') },
    5: { rate: 100, lastAccessed: new Date('2024-01-16') },
    6: { rate: 67, lastAccessed: new Date('2024-01-11') },
    7: { rate: 45, lastAccessed: new Date('2024-01-10') },
    8: { rate: 23, lastAccessed: new Date('2024-01-09') },
    9: { rate: 100, lastAccessed: new Date('2024-01-16') },
    10: { rate: 100, lastAccessed: new Date('2024-01-16') },
    11: { rate: 91, lastAccessed: new Date('2024-01-15') },
    12: { rate: 56, lastAccessed: new Date('2024-01-08') },
    13: { rate: 100, lastAccessed: new Date('2024-01-14') },
    14: { rate: 88, lastAccessed: new Date('2024-01-13') },
    15: { rate: 34, lastAccessed: new Date('2024-01-07') },
    16: { rate: 76, lastAccessed: new Date('2024-01-12') }
  };

  const filteredCategories = SOP_CATEGORIES.filter(category => {
    const matchesSearch = searchQuery === '' || 
      category.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.nameTh.includes(searchQuery);
    
    const matchesPriority = selectedPriority === 'all' || category.priority === selectedPriority;
    
    return matchesSearch && matchesPriority;
  });

  const criticalCategories = getCategoriesByPriority('critical');
  const overallCompletion = Math.round(
    Object.values(mockCompletionData).reduce((acc, curr) => acc + curr.rate, 0) / 16
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-heading font-bold text-krong-black ${
              language === 'th' ? 'font-thai' : ''
            }`}>
              {language === 'en' ? 'Standard Operating Procedures' : 'ขั้นตอนการปฏิบัติงานมาตรฐาน'}
            </h1>
            <p className={`text-krong-black/70 mt-2 ${
              language === 'th' ? 'font-thai text-base' : 'font-body'
            }`}>
              {language === 'en' 
                ? 'Comprehensive operational guidelines for Restaurant Krong Thai' 
                : 'แนวทางการดำเนินงานที่ครอบคลุมสำหรับร้านอาหารกรองไทย'
              }
            </p>
          </div>
          
          {/* Overall Progress */}
          <div className="flex items-center gap-4 bg-krong-white rounded-xl p-4 border border-gray-200 min-w-[280px]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-200 flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-golden-saffron"
                  style={{
                    background: `conic-gradient(from 0deg, #D4AF37 ${overallCompletion * 3.6}deg, transparent ${overallCompletion * 3.6}deg)`
                  }}
                />
                <span className="text-sm font-bold text-krong-black relative z-10">
                  {overallCompletion}%
                </span>
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium text-krong-black ${
                language === 'th' ? 'font-thai' : 'font-ui'
              }`}>
                {language === 'en' ? 'Overall Progress' : 'ความคืบหน้าโดยรวม'}
              </p>
              <p className={`text-xs text-krong-black/60 ${
                language === 'th' ? 'font-thai' : 'font-body'
              }`}>
                {language === 'en' ? '16 Categories' : '16 หมวดหมู่'}
              </p>
            </div>
          </div>
        </div>

        {/* Critical SOPs Alert */}
        {criticalCategories.some(cat => mockCompletionData[cat.id]?.rate < 100) && (
          <Card className="border-l-4 border-l-krong-red bg-red-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-krong-red flex-shrink-0" />
              <div className="flex-1">
                <h4 className={`font-medium text-krong-black ${
                  language === 'th' ? 'font-thai' : 'font-ui'
                }`}>
                  {language === 'en' ? 'Critical SOPs Require Attention' : 'SOP สำคัญต้องการความสนใจ'}
                </h4>
                <p className={`text-sm text-krong-black/70 ${
                  language === 'th' ? 'font-thai' : 'font-body'
                }`}>
                  {language === 'en' 
                    ? 'Some critical procedures are incomplete. Please review immediately.'
                    : 'ขั้นตอนสำคัญบางอย่างยังไม่สมบูรณ์ กรุณาตรวจสอบทันที'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-krong-black/40" />
          <Input
            placeholder={language === 'en' ? 'Search SOPs...' : 'ค้นหา SOP...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        
        <Tabs value={selectedPriority} onValueChange={setSelectedPriority} className="w-auto">
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="all" className="text-xs">
              {language === 'en' ? 'All' : 'ทั้งหมด'}
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs">
              {language === 'en' ? 'Critical' : 'วิกฤต'}
            </TabsTrigger>
            <TabsTrigger value="high" className="text-xs">
              {language === 'en' ? 'High' : 'สูง'}
            </TabsTrigger>
            <TabsTrigger value="medium" className="text-xs">
              {language === 'en' ? 'Medium' : 'ปานกลาง'}
            </TabsTrigger>
            <TabsTrigger value="standard" className="text-xs">
              {language === 'en' ? 'Standard' : 'มาตรฐาน'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-12 px-4"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-12 px-4"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* SOP Categories Grid */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
      }>
        {filteredCategories.map((category) => (
          <SOPCategoryCard
            key={category.id}
            category={category}
            language={language}
            completionRate={mockCompletionData[category.id]?.rate || 0}
            lastAccessed={mockCompletionData[category.id]?.lastAccessed}
            onClick={onCategorySelect}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-krong-black/30 mb-4" />
          <h3 className={`text-lg font-medium text-krong-black mb-2 ${
            language === 'th' ? 'font-thai' : 'font-ui'
          }`}>
            {language === 'en' ? 'No SOPs Found' : 'ไม่พบ SOP'}
          </h3>
          <p className={`text-krong-black/60 ${
            language === 'th' ? 'font-thai' : 'font-body'
          }`}>
            {language === 'en' 
              ? 'Try adjusting your search or filter criteria'
              : 'ลองปรับเงื่อนไขการค้นหาหรือตัวกรอง'
            }
          </p>
        </div>
      )}
    </div>
  );
}