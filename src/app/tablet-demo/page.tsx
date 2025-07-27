"use client"

import React, { useState } from "react"
import { CalendarIcon, SearchIcon, UserIcon, BellIcon, CheckIcon, XIcon } from "lucide-react"

import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  PinInput,
  SearchInput,
  Label,
  Progress,
  DatePicker,
  DateRangePicker,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from "@/components/ui"

export default function TabletDemoPage() {
  const [pinValue, setPinValue] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>()
  const [progress, setProgress] = useState(33)
  const { toast } = useToast()

  const handlePinComplete = (pin: string) => {
    toast({
      title: "PIN Entered",
      description: `PIN: ${pin}`,
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  return (
    <div className="min-h-screen bg-krong-white p-6 font-body">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-heading font-bold text-krong-red">
            Krong Thai SOP Management System
          </h1>
          <p className="text-tablet-xl text-krong-black/70">
            Tablet-Optimized Component Library Demo
          </p>
          <Separator variant="brand" thickness="medium" />
        </div>

        {/* Button Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>
              Touch-friendly buttons optimized for restaurant tablet use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Buttons */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Primary Actions</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default" size="default">
                  Default Button
                </Button>
                <Button variant="default" size="lg">
                  Large Button
                </Button>
                <Button variant="default" size="xl">
                  Extra Large
                </Button>
              </div>
            </div>

            {/* Action Variants */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Action Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="emergency">Emergency</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="info">Information</Button>
                <Button variant="accent">Accent</Button>
              </div>
            </div>

            {/* PIN Entry Button */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">PIN Entry</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" size="pin">1</Button>
                <Button variant="outline" size="pin">2</Button>
                <Button variant="outline" size="pin">3</Button>
                <Button variant="outline" size="pin">4</Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Icon Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" size="icon">
                  <UserIcon className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon-lg">
                  <BellIcon className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon-xl">
                  <CalendarIcon className="h-8 w-8" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Components */}
        <Card>
          <CardHeader>
            <CardTitle>Input Components</CardTitle>
            <CardDescription>
              Touch-optimized inputs for various restaurant data entry needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Standard Input */}
            <div className="space-y-2">
              <Label htmlFor="standard-input">Standard Input</Label>
              <Input 
                id="standard-input"
                placeholder="Enter staff name..." 
                className="w-full"
              />
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <Label htmlFor="pin-input">PIN Input (4 digits)</Label>
              <PinInput 
                id="pin-input"
                placeholder="••••"
                onPinComplete={handlePinComplete}
                className="w-full max-w-md"
              />
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search-input">Search Input</Label>
              <div className="relative w-full max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <SearchInput 
                  id="search-input"
                  placeholder="Search SOPs..."
                  onSearchChange={handleSearchChange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Date Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date Picker</Label>
                <DatePicker 
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                  placeholder="Select completion date"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Date Range Picker</Label>
                <DateRangePicker 
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  placeholder="Select date range"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Components */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Components</CardTitle>
            <CardDescription>
              Status indicators optimized for restaurant operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badges */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Status Indicators</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="critical" size="lg">Critical</Badge>
                <Badge variant="priority" size="lg">Priority</Badge>
                <Badge variant="completed" size="lg">Completed</Badge>
                <Badge variant="pending" size="lg">Pending</Badge>
                <Badge variant="inactive" size="lg">Inactive</Badge>
              </div>
            </div>

            {/* Brand Badges */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Brand Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            {/* Size Variants */}
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading font-semibold">Size Variants</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Badge size="sm">Small</Badge>
                <Badge size="default">Default</Badge>
                <Badge size="lg">Large</Badge>
                <Badge size="xl">Extra Large</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress and Loading */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Components</CardTitle>
            <CardDescription>
              Visual progress indicators for training and task completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Training Progress</Label>
                <span className="text-tablet-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setProgress(Math.max(0, progress - 10))}
                >
                  -10%
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setProgress(Math.min(100, progress + 10))}
                >
                  +10%
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Components */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog Components</CardTitle>
            <CardDescription>
              Modal dialogs optimized for tablet interaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Info Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>SOP Information</DialogTitle>
                    <DialogDescription>
                      This is an example of a tablet-optimized dialog for displaying SOP information and confirmations.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="emergency">Emergency Protocol</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">Emergency Protocol</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to initiate the emergency protocol? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="emergency">Initiate Emergency</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Component */}
        <Card>
          <CardHeader>
            <CardTitle>Tab Navigation</CardTitle>
            <CardDescription>
              Touch-friendly tab navigation for organizing content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <h3 className="text-tablet-lg font-heading">Overview</h3>
                <p className="text-tablet-base">
                  Quick overview of restaurant operations and current SOP status.
                </p>
              </TabsContent>
              <TabsContent value="training" className="space-y-4">
                <h3 className="text-tablet-lg font-heading">Training</h3>
                <p className="text-tablet-base">
                  Staff training modules and progress tracking.
                </p>
              </TabsContent>
              <TabsContent value="safety" className="space-y-4">
                <h3 className="text-tablet-lg font-heading">Safety</h3>
                <p className="text-tablet-base">
                  Safety protocols and emergency procedures.
                </p>
              </TabsContent>
              <TabsContent value="reports" className="space-y-4">
                <h3 className="text-tablet-lg font-heading">Reports</h3>
                <p className="text-tablet-base">
                  Compliance reports and analytics dashboard.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Separators */}
        <Card>
          <CardHeader>
            <CardTitle>Separator Components</CardTitle>
            <CardDescription>
              Visual separators for organizing content sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-tablet-lg font-heading">Default Separator</h3>
              <Separator />
              
              <h3 className="text-tablet-lg font-heading">Brand Separator</h3>
              <Separator variant="brand" thickness="medium" />
              
              <h3 className="text-tablet-lg font-heading">Accent Separator</h3>
              <Separator variant="accent" thickness="thick" />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-tablet-base text-muted-foreground">
                All components are optimized for tablet touch interaction with minimum 44px touch targets
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => toast({
                    title: "Component Demo",
                    description: "All components are working perfectly for tablet use!",
                  })}
                >
                  Test Toast
                </Button>
                <Button variant="accent">
                  <CheckIcon className="mr-2 h-5 w-5" />
                  Components Ready
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}