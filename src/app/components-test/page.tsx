"use client"

import React from "react"
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Separator,
  useToast,
  Toaster
} from "@/components/ui"

export default function ComponentsTestPage() {
  const { toast } = useToast()

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <Toaster />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-tablet-2xl font-heading text-krong-red mb-2">
          Restaurant Krong Thai SOP Components
        </h1>
        <p className="text-tablet-base font-body text-muted-foreground">
          Tablet-optimized shadcn/ui components with restaurant branding
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons & Badges</CardTitle>
            <CardDescription>Touch-friendly buttons with restaurant branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Forms Section */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>Tablet-optimized form inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input id="name" placeholder="Enter restaurant name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">SOP Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen Operations</SelectItem>
                  <SelectItem value="service">Customer Service</SelectItem>
                  <SelectItem value="cleaning">Cleaning Procedures</SelectItem>
                  <SelectItem value="safety">Safety Protocols</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => 
                toast({
                  title: "Form Submitted",
                  description: "Your SOP information has been saved successfully.",
                  variant: "default",
                })
              }
              className="w-full"
            >
              Submit Form
            </Button>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation Tabs</CardTitle>
            <CardDescription>Tablet-friendly tab navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="procedures">Procedures</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <p className="text-tablet-base font-body">
                  Overview of restaurant standard operating procedures including 
                  kitchen operations, customer service, and safety protocols.
                </p>
              </TabsContent>
              <TabsContent value="procedures" className="mt-4">
                <p className="text-tablet-base font-body">
                  Detailed step-by-step procedures for daily restaurant operations 
                  including food preparation, service delivery, and cleanup processes.
                </p>
              </TabsContent>
              <TabsContent value="compliance" className="mt-4">
                <p className="text-tablet-base font-body">
                  Compliance requirements, health department regulations, 
                  and quality assurance protocols for Restaurant Krong Thai.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog & Notifications</CardTitle>
            <CardDescription>Modal dialogs and toast notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open SOP Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Standard Operating Procedure</DialogTitle>
                  <DialogDescription>
                    Review and confirm the following SOP details before proceeding.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sop-title">SOP Title</Label>
                    <Input id="sop-title" placeholder="Enter SOP title" />
                  </div>
                  <div>
                    <Label htmlFor="sop-description">Description</Label>
                    <Input id="sop-description" placeholder="Brief description" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save SOP</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => 
                  toast({
                    title: "Success!",
                    description: "SOP updated successfully.",
                    variant: "success",
                  })
                }
              >
                Success Toast
              </Button>
              <Button 
                variant="outline"
                onClick={() => 
                  toast({
                    title: "Warning!",
                    description: "Please review the procedure.",
                    variant: "warning",
                  })
                }
              >
                Warning Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Typography Showcase */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Typography & Brand Colors</CardTitle>
          <CardDescription>Restaurant Krong Thai brand typography system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-tablet-lg font-ui font-semibold mb-4">Headings (EB Garamond SC)</h3>
              <div className="space-y-2">
                <h1 className="text-tablet-2xl font-heading text-krong-red">Heading 1</h1>
                <h2 className="text-tablet-xl font-heading text-krong-black">Heading 2</h2>
                <h3 className="text-tablet-lg font-heading text-krong-black">Heading 3</h3>
              </div>
            </div>
            <div>
              <h3 className="text-tablet-lg font-ui font-semibold mb-4">Body Text (Source Serif Pro)</h3>
              <p className="text-tablet-base font-body text-krong-black mb-2">
                This is regular body text using Source Serif Pro for optimal readability.
              </p>
              <p className="text-tablet-sm font-body text-muted-foreground">
                Smaller body text for secondary information and descriptions.
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-tablet-lg font-ui font-semibold mb-4">Brand Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-krong-red h-16 rounded-lg flex items-center justify-center">
                <span className="text-krong-white text-tablet-sm font-ui">Red</span>
              </div>
              <div className="bg-krong-black h-16 rounded-lg flex items-center justify-center">
                <span className="text-krong-white text-tablet-sm font-ui">Black</span>
              </div>
              <div className="bg-krong-white h-16 rounded-lg flex items-center justify-center border">
                <span className="text-krong-black text-tablet-sm font-ui">White</span>
              </div>
              <div className="bg-golden-saffron h-16 rounded-lg flex items-center justify-center">
                <span className="text-krong-black text-tablet-sm font-ui">Saffron</span>
              </div>
              <div className="bg-jade-green h-16 rounded-lg flex items-center justify-center">
                <span className="text-krong-white text-tablet-sm font-ui">Jade</span>
              </div>
              <div className="bg-earthen-beige h-16 rounded-lg flex items-center justify-center">
                <span className="text-krong-black text-tablet-sm font-ui">Beige</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}