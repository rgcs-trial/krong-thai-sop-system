/**
 * Integration Tests for ICU Message Format Parsing
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translationDevUtils } from '@/hooks/use-translations-db';
import { testScenarios } from '../mocks/translation-mocks';

describe('ICU Message Format Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Interpolation', () => {
    it('should handle simple variable substitution', () => {
      const message = 'Hello, {name}!';
      const variables = { name: 'John' };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Hello, John!');
    });

    it('should handle multiple variables', () => {
      const message = 'Welcome {name}, you have {count} messages.';
      const variables = { name: 'Jane', count: 5 };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Welcome Jane, you have 5 messages.');
    });

    it('should handle missing variables gracefully', () => {
      const message = 'Hello, {name}! You have {count} items.';
      const variables = { name: 'Bob' }; // Missing count

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Hello, Bob! You have {count} items.');
    });

    it('should handle empty variables object', () => {
      const message = 'Hello, {name}!';
      const variables = {};

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Hello, {name}!');
    });

    it('should handle variables with special characters', () => {
      const message = 'Price: {price}€, Discount: {discount}%';
      const variables = { price: '29.99', discount: '15' };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Price: 29.99€, Discount: 15%');
    });
  });

  describe('Plural Forms', () => {
    it('should handle basic plural rules', () => {
      const message = '{count, plural, =0 {No items} =1 {One item} other {# items}}';

      expect(translationDevUtils.testICU(message, { count: 0 })).toBe('No items');
      expect(translationDevUtils.testICU(message, { count: 1 })).toBe('One item');
      expect(translationDevUtils.testICU(message, { count: 5 })).toBe('5 items');
      expect(translationDevUtils.testICU(message, { count: 42 })).toBe('42 items');
    });

    it('should handle exact number matches', () => {
      const message = '{count, plural, =0 {No messages} =1 {One message} =2 {Two messages} other {# messages}}';

      expect(translationDevUtils.testICU(message, { count: 0 })).toBe('No messages');
      expect(translationDevUtils.testICU(message, { count: 1 })).toBe('One message');
      expect(translationDevUtils.testICU(message, { count: 2 })).toBe('Two messages');
      expect(translationDevUtils.testICU(message, { count: 3 })).toBe('3 messages');
    });

    it('should handle plural with nested variables', () => {
      const message = '{count, plural, =0 {No {type}} =1 {One {type}} other {# {type}s}}';
      const variables = { count: 3, type: 'notification' };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('3 notifications');
    });

    it('should handle complex plural scenarios', () => {
      const message = 'You have {messageCount, plural, =0 {no messages} =1 {1 message} other {# messages}} and {taskCount, plural, =0 {no tasks} =1 {1 task} other {# tasks}}.';
      
      const result1 = translationDevUtils.testICU(message, { messageCount: 0, taskCount: 1 });
      expect(result1).toBe('You have no messages and 1 task.');

      const result2 = translationDevUtils.testICU(message, { messageCount: 3, taskCount: 5 });
      expect(result2).toBe('You have 3 messages and 5 tasks.');
    });

    it('should handle French plural rules', () => {
      const message = '{count, plural, =0 {Aucun élément} =1 {Un élément} other {# éléments}}';

      expect(translationDevUtils.testICU(message, { count: 0 })).toBe('Aucun élément');
      expect(translationDevUtils.testICU(message, { count: 1 })).toBe('Un élément');
      expect(translationDevUtils.testICU(message, { count: 2 })).toBe('2 éléments');
    });
  });

  describe('Select Forms', () => {
    it('should handle basic select forms', () => {
      const message = '{gender, select, male {He} female {She} other {They}} went to the store.';

      expect(translationDevUtils.testICU(message, { gender: 'male' })).toBe('He went to the store.');
      expect(translationDevUtils.testICU(message, { gender: 'female' })).toBe('She went to the store.');
      expect(translationDevUtils.testICU(message, { gender: 'non-binary' })).toBe('They went to the store.');
    });

    it('should handle select with nested variables', () => {
      const message = '{role, select, admin {Administrator {name}} user {User {name}} other {{name}}} has logged in.';
      const variables = { role: 'admin', name: 'John' };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Administrator John has logged in.');
    });

    it('should handle case-sensitive select keys', () => {
      const message = '{status, select, SUCCESS {✓ Success} ERROR {✗ Error} PENDING {⏳ Pending} other {Unknown status}}';

      expect(translationDevUtils.testICU(message, { status: 'SUCCESS' })).toBe('✓ Success');
      expect(translationDevUtils.testICU(message, { status: 'ERROR' })).toBe('✗ Error');
      expect(translationDevUtils.testICU(message, { status: 'success' })).toBe('Unknown status'); // Case sensitive
    });

    it('should handle complex select scenarios', () => {
      const message = '{userType, select, staff {{name} is a staff member} manager {{name} is a manager} admin {{name} is an administrator} other {{name} has an unknown role}}.';

      const result1 = translationDevUtils.testICU(message, { userType: 'staff', name: 'Alice' });
      expect(result1).toBe('Alice is a staff member.');

      const result2 = translationDevUtils.testICU(message, { userType: 'unknown', name: 'Bob' });
      expect(result2).toBe('Bob has an unknown role.');
    });
  });

  describe('Complex Nested Formats', () => {
    it('should handle plural within select', () => {
      const message = '{gender, select, male {{count, plural, =0 {He has no items} =1 {He has one item} other {He has # items}}} female {{count, plural, =0 {She has no items} =1 {She has one item} other {She has # items}}} other {{count, plural, =0 {They have no items} =1 {They have one item} other {They have # items}}}}';

      const result1 = translationDevUtils.testICU(message, { gender: 'male', count: 0 });
      expect(result1).toBe('He has no items');

      const result2 = translationDevUtils.testICU(message, { gender: 'female', count: 3 });
      expect(result2).toBe('She has 3 items');

      const result3 = translationDevUtils.testICU(message, { gender: 'other', count: 1 });
      expect(result3).toBe('They have one item');
    });

    it('should handle select within plural', () => {
      const message = '{count, plural, =0 {No users} =1 {{userType, select, admin {One administrator} staff {One staff member} other {One user}}} other {# {userType, select, admin {administrators} staff {staff members} other {users}}}}';

      const result1 = translationDevUtils.testICU(message, { count: 0, userType: 'admin' });
      expect(result1).toBe('No users');

      const result2 = translationDevUtils.testICU(message, { count: 1, userType: 'admin' });
      expect(result2).toBe('One administrator');

      const result3 = translationDevUtils.testICU(message, { count: 5, userType: 'staff' });
      expect(result3).toBe('5 staff members');
    });

    it('should handle deeply nested structures', () => {
      const message = '{department, select, kitchen {{role, select, chef {{count, plural, =1 {1 head chef} other {# head chefs}}} sous {{count, plural, =1 {1 sous chef} other {# sous chefs}}} other {{count, plural, =1 {1 kitchen staff} other {# kitchen staff}}}}} service {{role, select, manager {{count, plural, =1 {1 service manager} other {# service managers}}} server {{count, plural, =1 {1 server} other {# servers}}} other {{count, plural, =1 {1 service staff} other {# service staff}}}}} other {{count, plural, =1 {1 staff member} other {# staff members}}}}';

      const result1 = translationDevUtils.testICU(message, { 
        department: 'kitchen', 
        role: 'chef', 
        count: 1 
      });
      expect(result1).toBe('1 head chef');

      const result2 = translationDevUtils.testICU(message, { 
        department: 'service', 
        role: 'server', 
        count: 3 
      });
      expect(result2).toBe('3 servers');

      const result3 = translationDevUtils.testICU(message, { 
        department: 'admin', 
        role: 'manager', 
        count: 2 
      });
      expect(result3).toBe('2 staff members');
    });
  });

  describe('Restaurant-Specific Use Cases', () => {
    it('should handle menu item availability', () => {
      const message = '{available, select, yes {✓ {itemName} is available ({count, plural, =0 {no portions left} =1 {1 portion left} other {# portions left}})} no {✗ {itemName} is currently unavailable} limited {⚠ {itemName} has limited availability} other {{itemName} status unknown}}';

      const result1 = translationDevUtils.testICU(message, {
        available: 'yes',
        itemName: 'Pad Thai',
        count: 5
      });
      expect(result1).toBe('✓ Pad Thai is available (5 portions left)');

      const result2 = translationDevUtils.testICU(message, {
        available: 'no',
        itemName: 'Green Curry',
        count: 0
      });
      expect(result2).toBe('✗ Green Curry is currently unavailable');
    });

    it('should handle order status updates', () => {
      const message = 'Order #{orderNumber}: {status, select, pending {📋 Order received, estimated time: {estimatedTime} minutes} preparing {👨‍🍳 Being prepared by kitchen} ready {🔔 Ready for pickup/delivery} delivered {✅ Delivered} cancelled {❌ Cancelled} other {Status unknown}}';

      const result1 = translationDevUtils.testICU(message, {
        orderNumber: '12345',
        status: 'pending',
        estimatedTime: 25
      });
      expect(result1).toBe('Order #12345: 📋 Order received, estimated time: 25 minutes');

      const result2 = translationDevUtils.testICU(message, {
        orderNumber: '12346',
        status: 'ready'
      });
      expect(result2).toBe('Order #12346: 🔔 Ready for pickup/delivery');
    });

    it('should handle staff scheduling', () => {
      const message = '{staffName} is scheduled to work {shiftCount, plural, =0 {no shifts} =1 {1 shift} other {# shifts}} this week as {role, select, chef {head chef} sous {sous chef} server {server} host {host} manager {shift manager} other {staff member}}.';

      const result1 = translationDevUtils.testICU(message, {
        staffName: 'Alice',
        shiftCount: 4,
        role: 'chef'
      });
      expect(result1).toBe('Alice is scheduled to work 4 shifts this week as head chef.');

      const result2 = translationDevUtils.testICU(message, {
        staffName: 'Bob',
        shiftCount: 0,
        role: 'server'
      });
      expect(result2).toBe('Bob is scheduled to work no shifts this week as server.');
    });

    it('should handle inventory alerts', () => {
      const message = '{alertLevel, select, critical {🚨 CRITICAL: {itemName} is critically low ({quantity, plural, =0 {out of stock} =1 {only 1 unit left} other {only # units left}})} low {⚠️ LOW: {itemName} is running low ({quantity} {unit, plural, =1 {unit} other {units}} remaining)} normal {✅ {itemName} is well stocked} other {❓ {itemName} stock status unknown}}';

      const result1 = translationDevUtils.testICU(message, {
        alertLevel: 'critical',
        itemName: 'Thai Basil',
        quantity: 0
      });
      expect(result1).toBe('🚨 CRITICAL: Thai Basil is critically low (out of stock)');

      const result2 = translationDevUtils.testICU(message, {
        alertLevel: 'low',
        itemName: 'Coconut Milk',
        quantity: 3,
        unit: 1
      });
      expect(result2).toBe('⚠️ LOW: Coconut Milk is running low (3 units remaining)');
    });

    it('should handle table reservations', () => {
      const message = '{reservationStatus, select, confirmed {✅ Table {tableNumber} reserved for {guestCount, plural, =1 {1 guest} other {# guests}} at {time}} waitlisted {📋 Waitlisted for {guestCount, plural, =1 {1 guest} other {# guests}} at {time}} cancelled {❌ Reservation cancelled} seated {🪑 Guests seated at table {tableNumber}} other {Reservation status unclear}}';

      const result1 = translationDevUtils.testICU(message, {
        reservationStatus: 'confirmed',
        tableNumber: '12',
        guestCount: 4,
        time: '7:30 PM'
      });
      expect(result1).toBe('✅ Table 12 reserved for 4 guests at 7:30 PM');

      const result2 = translationDevUtils.testICU(message, {
        reservationStatus: 'seated',
        tableNumber: '8',
        guestCount: 2
      });
      expect(result2).toBe('🪑 Guests seated at table 8');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed ICU syntax gracefully', () => {
      const malformedMessages = [
        '{count, plural, =0 {No items} =1 {One item} other {# items}', // Missing closing brace
        '{count plural =0 {No items}}', // Missing comma
        '{count, invalid, =0 {test}}', // Invalid format type
        '{count, plural, {test}}', // Missing plural rule
        '{{count}} items', // Double braces
      ];

      malformedMessages.forEach(message => {
        expect(() => {
          translationDevUtils.testICU(message, { count: 1 });
        }).not.toThrow();
      });
    });

    it('should handle empty messages', () => {
      expect(translationDevUtils.testICU('', {})).toBe('');
      expect(translationDevUtils.testICU('   ', {})).toBe('   ');
    });

    it('should handle messages with only variables', () => {
      expect(translationDevUtils.testICU('{name}', { name: 'John' })).toBe('John');
      expect(translationDevUtils.testICU('{count}', { count: 42 })).toBe('42');
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a very long message with {name} and it repeats many times. '.repeat(100) + '{count, plural, =1 {one item} other {# items}}';
      const variables = { name: 'Test User', count: 5 };

      const result = translationDevUtils.testICU(longMessage, variables);
      expect(result).toContain('Test User');
      expect(result).toContain('5 items');
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should handle Unicode and emoji in messages', () => {
      const unicodeMessage = '🎉 Welcome {name}! You have {count, plural, =0 {no notifications 📭} =1 {1 notification 📬} other {# notifications 📬}}';
      const variables = { name: 'José', count: 3 };

      const result = translationDevUtils.testICU(unicodeMessage, variables);
      expect(result).toBe('🎉 Welcome José! You have 3 notifications 📬');
    });

    it('should handle special characters in variable names', () => {
      const message = 'Product {product_name} costs {price_usd} USD';
      const variables = { product_name: 'Pad Thai', price_usd: '12.99' };

      const result = translationDevUtils.testICU(message, variables);
      expect(result).toBe('Product Pad Thai costs 12.99 USD');
    });

    it('should handle numeric string variables in plural', () => {
      const message = '{count, plural, =0 {No items} =1 {One item} other {# items}}';

      // Test with numeric strings
      expect(translationDevUtils.testICU(message, { count: '0' })).toBe('No items');
      expect(translationDevUtils.testICU(message, { count: '1' })).toBe('One item');
      expect(translationDevUtils.testICU(message, { count: '5' })).toBe('5 items');
    });
  });

  describe('Performance with ICU Messages', () => {
    it('should handle large numbers of variables efficiently', () => {
      const variables: Record<string, any> = {};
      let message = 'Message with many variables: ';
      
      // Create message with 100 variables
      for (let i = 0; i < 100; i++) {
        variables[`var${i}`] = `value${i}`;
        message += `{var${i}} `;
      }

      const startTime = performance.now();
      const result = translationDevUtils.testICU(message, variables);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
      expect(result).toContain('value0');
      expect(result).toContain('value99');
    });

    it('should handle complex nested messages efficiently', () => {
      const complexMessage = Array.from({ length: 10 }, (_, i) => 
        `{type${i}, select, a {{count${i}, plural, =0 {none} =1 {one} other {# items}}} b {{status${i}, select, ok {good} error {bad} other {unknown}}} other {default}}`
      ).join(' and ');

      const variables: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        variables[`type${i}`] = i % 2 === 0 ? 'a' : 'b';
        variables[`count${i}`] = i;
        variables[`status${i}`] = i % 3 === 0 ? 'ok' : 'error';
      }

      const startTime = performance.now();
      const result = translationDevUtils.testICU(complexMessage, variables);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('Integration with Test Scenarios', () => {
    it('should work with predefined ICU scenarios', () => {
      const icuScenarios = testScenarios.createICUMessageScenarios();

      icuScenarios.forEach(scenario => {
        const result = translationDevUtils.testICU(scenario.message, scenario.variables);
        expect(result).toBe(scenario.expected);
      });
    });

    it('should handle restaurant workflow scenarios', () => {
      const workflowScenarios = [
        {
          message: 'Training module "{moduleName}" is {status, select, draft {in draft} review {under review} approved {approved} published {published and available} other {in unknown status}}. {completionCount, plural, =0 {No staff have completed it} =1 {1 staff member has completed it} other {# staff members have completed it}}.',
          variables: { moduleName: 'Food Safety', status: 'published', completionCount: 12 },
          expected: 'Training module "Food Safety" is published and available. 12 staff members have completed it.',
        },
        {
          message: 'SOP "{sopTitle}" was last updated {daysSince, plural, =0 {today} =1 {1 day ago} other {# days ago}} by {updatedBy}. {urgency, select, high {🔴 Requires immediate attention} medium {🟡 Review recommended} low {🟢 Up to date} other {Status unclear}}.',
          variables: { sopTitle: 'Kitchen Cleaning', daysSince: 3, updatedBy: 'Manager Alice', urgency: 'medium' },
          expected: 'SOP "Kitchen Cleaning" was last updated 3 days ago by Manager Alice. 🟡 Review recommended.',
        },
      ];

      workflowScenarios.forEach(scenario => {
        const result = translationDevUtils.testICU(scenario.message, scenario.variables);
        expect(result).toBe(scenario.expected);
      });
    });
  });
});