// Test file to verify shadcn/ui components work correctly
import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './src/components/ui/accordion';
import { Slider } from './src/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from './src/components/ui/avatar';
import { ScrollArea } from './src/components/ui/scroll-area';

export default function TestComponents() {
  return (
    <div className="space-y-6 p-6">
      {/* Test Accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Test Slider */}
      <Slider
        defaultValue={[50]}
        max={100}
        step={1}
        className="w-60"
      />

      {/* Test Avatar */}
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>

      {/* Test ScrollArea */}
      <ScrollArea className="h-72 w-48 rounded-md border">
        <div className="p-4">
          <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="text-sm">
              v1.2.0-beta.{i}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}