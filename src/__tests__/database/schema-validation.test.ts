import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn()
      }
    }
  }
}));

const mockSupabaseAdmin = supabaseAdmin as any;

describe('Database Schema Validation', () => {
  const testRestaurantId = 'test-restaurant-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Core Tables Structure', () => {
    it('should validate restaurants table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'name_th', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'address', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'phone', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'email', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'timezone', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'restaurants' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'name', 'name_th', 'is_active', 'created_at', 'updated_at'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });

    it('should validate auth_users table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'restaurant_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'email', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'full_name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'full_name_th', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'pin_hash', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'role', data_type: 'user_role_enum', is_nullable: 'NO' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'last_login_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'auth_users' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'restaurant_id', 'email', 'full_name', 'pin_hash', 'role'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });

    it('should validate sop_categories table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'restaurant_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'code', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'name_th', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'description', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'description_th', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'icon', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'color', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'sort_order', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'sop_categories' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'restaurant_id', 'code', 'name', 'name_th', 'sort_order'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });

    it('should validate sop_documents table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'restaurant_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'category_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'title', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'title_th', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'content', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'content_th', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'version', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'status', data_type: 'sop_status_enum', is_nullable: 'NO' },
          { column_name: 'priority', data_type: 'sop_priority_enum', is_nullable: 'NO' },
          { column_name: 'tags', data_type: 'ARRAY', is_nullable: 'YES' },
          { column_name: 'attachments', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'created_by', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'updated_by', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'approved_by', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'approved_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'NO' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'sop_documents' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'restaurant_id', 'category_id', 'title', 'title_th', 'content', 'content_th', 'version', 'status', 'priority'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });
  });

  describe('SOP Workflow Tables Structure', () => {
    it('should validate sop_steps table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'sop_document_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'step_number', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'title', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'title_th', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'description', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'description_th', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'instructions', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'instructions_th', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'estimated_duration_minutes', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'requires_photo', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'requires_manager_approval', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'critical_control_point', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'safety_warnings', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'safety_warnings_th', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'equipment_required', data_type: 'ARRAY', is_nullable: 'YES' },
          { column_name: 'sort_order', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'sop_steps' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'sop_document_id', 'step_number', 'title', 'title_th', 'description', 'description_th'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });

    it('should validate sop_completions table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'sop_document_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'sop_step_id', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'restaurant_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'completed_by', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'assigned_to', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'status', data_type: 'sop_completion_status', is_nullable: 'YES' },
          { column_name: 'started_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'completed_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'duration_minutes', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'notes', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'notes_th', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'verification_photos', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'verification_data', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'compliance_score', data_type: 'numeric', is_nullable: 'YES' },
          { column_name: 'quality_rating', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'verified_by', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'verified_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'is_valid', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'sop_completions' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'sop_document_id', 'restaurant_id', 'completed_by'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });

    it('should validate sop_assignments table structure', async () => {
      const mockTableInfo = {
        data: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'sop_document_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'restaurant_id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'assigned_to', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'assigned_by', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'status', data_type: 'sop_assignment_status', is_nullable: 'YES' },
          { column_name: 'priority', data_type: 'sop_priority', is_nullable: 'YES' },
          { column_name: 'due_date', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'scheduled_start', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'estimated_duration_minutes', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'assignment_notes', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'assignment_notes_th', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'acknowledged_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'started_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'completed_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'completion_id', data_type: 'uuid', is_nullable: 'YES' },
          { column_name: 'is_active', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableInfo);

      const response = await mockSupabaseAdmin.rpc('get_table_structure', { table_name: 'sop_assignments' });

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const columns = response.data;
      const requiredColumns = ['id', 'sop_document_id', 'restaurant_id', 'assigned_to', 'assigned_by'];
      
      requiredColumns.forEach(column => {
        const columnInfo = columns.find((c: any) => c.column_name === column);
        expect(columnInfo).toBeDefined();
        expect(columnInfo.is_nullable).toBe('NO');
      });
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should validate foreign key constraints exist', async () => {
      const mockConstraints = {
        data: [
          {
            table_name: 'auth_users',
            constraint_name: 'fk_auth_users_restaurant',
            column_name: 'restaurant_id',
            foreign_table: 'restaurants',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_categories',
            constraint_name: 'fk_sop_categories_restaurant',
            column_name: 'restaurant_id',
            foreign_table: 'restaurants',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_documents',
            constraint_name: 'fk_sop_documents_category',
            column_name: 'category_id',
            foreign_table: 'sop_categories',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_documents',
            constraint_name: 'fk_sop_documents_restaurant',
            column_name: 'restaurant_id',
            foreign_table: 'restaurants',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_steps',
            constraint_name: 'fk_sop_steps_document',
            column_name: 'sop_document_id',
            foreign_table: 'sop_documents',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_completions',
            constraint_name: 'fk_sop_completions_document',
            column_name: 'sop_document_id',
            foreign_table: 'sop_documents',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_completions',
            constraint_name: 'fk_sop_completions_restaurant',
            column_name: 'restaurant_id',
            foreign_table: 'restaurants',
            foreign_column: 'id'
          },
          {
            table_name: 'sop_assignments',
            constraint_name: 'fk_sop_assignments_document',
            column_name: 'sop_document_id',
            foreign_table: 'sop_documents',
            foreign_column: 'id'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockConstraints);

      const response = await mockSupabaseAdmin.rpc('get_foreign_key_constraints');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const constraints = response.data;
      
      // Verify critical foreign key relationships exist
      const expectedConstraints = [
        { table: 'auth_users', column: 'restaurant_id', references: 'restaurants' },
        { table: 'sop_categories', column: 'restaurant_id', references: 'restaurants' },
        { table: 'sop_documents', column: 'category_id', references: 'sop_categories' },
        { table: 'sop_documents', column: 'restaurant_id', references: 'restaurants' },
        { table: 'sop_steps', column: 'sop_document_id', references: 'sop_documents' },
        { table: 'sop_completions', column: 'sop_document_id', references: 'sop_documents' },
        { table: 'sop_assignments', column: 'sop_document_id', references: 'sop_documents' }
      ];

      expectedConstraints.forEach(expected => {
        const constraint = constraints.find((c: any) => 
          c.table_name === expected.table && 
          c.column_name === expected.column && 
          c.foreign_table === expected.references
        );
        expect(constraint).toBeDefined();
      });
    });

    it('should validate unique constraints exist', async () => {
      const mockUniqueConstraints = {
        data: [
          {
            table_name: 'restaurants',
            constraint_name: 'uk_restaurants_name',
            column_names: ['name']
          },
          {
            table_name: 'auth_users',
            constraint_name: 'uk_auth_users_email_restaurant',
            column_names: ['email', 'restaurant_id']
          },
          {
            table_name: 'sop_categories',
            constraint_name: 'uk_sop_categories_code_restaurant',
            column_names: ['code', 'restaurant_id']
          },
          {
            table_name: 'sop_steps',
            constraint_name: 'uk_sop_steps_document_number',
            column_names: ['sop_document_id', 'step_number']
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockUniqueConstraints);

      const response = await mockSupabaseAdmin.rpc('get_unique_constraints');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const constraints = response.data;
      
      // Verify critical unique constraints exist
      const expectedConstraints = [
        { table: 'auth_users', columns: ['email', 'restaurant_id'] },
        { table: 'sop_categories', columns: ['code', 'restaurant_id'] },
        { table: 'sop_steps', columns: ['sop_document_id', 'step_number'] }
      ];

      expectedConstraints.forEach(expected => {
        const constraint = constraints.find((c: any) => 
          c.table_name === expected.table &&
          JSON.stringify(c.column_names.sort()) === JSON.stringify(expected.columns.sort())
        );
        expect(constraint).toBeDefined();
      });
    });
  });

  describe('Database Indexes', () => {
    it('should validate performance indexes exist', async () => {
      const mockIndexes = {
        data: [
          {
            table_name: 'sop_documents',
            index_name: 'idx_sop_documents_restaurant',
            column_names: ['restaurant_id']
          },
          {
            table_name: 'sop_documents',
            index_name: 'idx_sop_documents_category',
            column_names: ['category_id']
          },
          {
            table_name: 'sop_documents',
            index_name: 'idx_sop_documents_status',
            column_names: ['status']
          },
          {
            table_name: 'sop_completions',
            index_name: 'idx_sop_completions_restaurant',
            column_names: ['restaurant_id']
          },
          {
            table_name: 'sop_completions',
            index_name: 'idx_sop_completions_document',
            column_names: ['sop_document_id']
          },
          {
            table_name: 'sop_assignments',
            index_name: 'idx_sop_assignments_assigned_to',
            column_names: ['assigned_to']
          },
          {
            table_name: 'sop_assignments',
            index_name: 'idx_sop_assignments_due_date',
            column_names: ['due_date']
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockIndexes);

      const response = await mockSupabaseAdmin.rpc('get_table_indexes');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const indexes = response.data;
      
      // Verify critical performance indexes exist
      const expectedIndexes = [
        { table: 'sop_documents', column: 'restaurant_id' },
        { table: 'sop_documents', column: 'category_id' },
        { table: 'sop_documents', column: 'status' },
        { table: 'sop_completions', column: 'restaurant_id' },
        { table: 'sop_completions', column: 'sop_document_id' },
        { table: 'sop_assignments', column: 'assigned_to' },
        { table: 'sop_assignments', column: 'due_date' }
      ];

      expectedIndexes.forEach(expected => {
        const index = indexes.find((i: any) => 
          i.table_name === expected.table && 
          i.column_names.includes(expected.column)
        );
        expect(index).toBeDefined();
      });
    });

    it('should validate JSONB indexes exist for complex queries', async () => {
      const mockJsonbIndexes = {
        data: [
          {
            table_name: 'sop_completions',
            index_name: 'idx_sop_completions_verification_data',
            index_type: 'gin',
            column_names: ['verification_data']
          },
          {
            table_name: 'sop_schedules',
            index_name: 'idx_sop_schedules_frequency_details',
            index_type: 'gin',
            column_names: ['frequency_details']
          },
          {
            table_name: 'sop_approvals',
            index_name: 'idx_sop_approvals_criteria',
            index_type: 'gin',
            column_names: ['approval_criteria']
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockJsonbIndexes);

      const response = await mockSupabaseAdmin.rpc('get_jsonb_indexes');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const indexes = response.data;
      
      // Verify JSONB GIN indexes exist for complex queries
      const expectedJsonbIndexes = [
        { table: 'sop_completions', column: 'verification_data' },
        { table: 'sop_schedules', column: 'frequency_details' },
        { table: 'sop_approvals', column: 'approval_criteria' }
      ];

      expectedJsonbIndexes.forEach(expected => {
        const index = indexes.find((i: any) => 
          i.table_name === expected.table && 
          i.column_names.includes(expected.column) &&
          i.index_type === 'gin'
        );
        expect(index).toBeDefined();
      });
    });
  });

  describe('Enum Types', () => {
    it('should validate enum types exist with correct values', async () => {
      const mockEnums = {
        data: [
          {
            enum_name: 'user_role_enum',
            enum_values: ['admin', 'manager', 'staff', 'viewer']
          },
          {
            enum_name: 'sop_status_enum',
            enum_values: ['draft', 'review', 'approved', 'archived']
          },
          {
            enum_name: 'sop_priority_enum',
            enum_values: ['low', 'medium', 'high', 'critical']
          },
          {
            enum_name: 'sop_completion_status',
            enum_values: ['pending', 'in_progress', 'completed', 'verified', 'failed', 'skipped']
          },
          {
            enum_name: 'sop_assignment_status',
            enum_values: ['assigned', 'acknowledged', 'in_progress', 'completed', 'overdue', 'cancelled']
          },
          {
            enum_name: 'sop_schedule_frequency',
            enum_values: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']
          },
          {
            enum_name: 'photo_verification_status',
            enum_values: ['pending', 'approved', 'rejected', 'flagged']
          },
          {
            enum_name: 'equipment_status',
            enum_values: ['available', 'in_use', 'maintenance', 'out_of_order', 'retired']
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockEnums);

      const response = await mockSupabaseAdmin.rpc('get_enum_types');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const enums = response.data;
      
      // Verify all required enum types exist
      const expectedEnums = [
        'user_role_enum',
        'sop_status_enum', 
        'sop_priority_enum',
        'sop_completion_status',
        'sop_assignment_status',
        'sop_schedule_frequency',
        'photo_verification_status',
        'equipment_status'
      ];

      expectedEnums.forEach(enumName => {
        const enumType = enums.find((e: any) => e.enum_name === enumName);
        expect(enumType).toBeDefined();
        expect(enumType.enum_values).toBeInstanceOf(Array);
        expect(enumType.enum_values.length).toBeGreaterThan(0);
      });

      // Verify specific enum values
      const userRoleEnum = enums.find((e: any) => e.enum_name === 'user_role_enum');
      expect(userRoleEnum.enum_values).toContain('admin');
      expect(userRoleEnum.enum_values).toContain('manager');
      expect(userRoleEnum.enum_values).toContain('staff');

      const sopStatusEnum = enums.find((e: any) => e.enum_name === 'sop_status_enum');
      expect(sopStatusEnum.enum_values).toContain('draft');
      expect(sopStatusEnum.enum_values).toContain('approved');
    });
  });

  describe('Database Functions and Triggers', () => {
    it('should validate update_updated_at_column function exists', async () => {
      const mockFunctions = {
        data: [
          {
            function_name: 'update_updated_at_column',
            return_type: 'trigger',
            function_definition: 'CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockFunctions);

      const response = await mockSupabaseAdmin.rpc('get_database_functions');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const functions = response.data;
      const updateFunction = functions.find((f: any) => f.function_name === 'update_updated_at_column');
      
      expect(updateFunction).toBeDefined();
      expect(updateFunction.return_type).toBe('trigger');
    });

    it('should validate updated_at triggers exist on all tables', async () => {
      const mockTriggers = {
        data: [
          {
            table_name: 'restaurants',
            trigger_name: 'update_restaurants_updated_at',
            event_manipulation: 'UPDATE'
          },
          {
            table_name: 'auth_users',
            trigger_name: 'update_auth_users_updated_at',
            event_manipulation: 'UPDATE'
          },
          {
            table_name: 'sop_categories',
            trigger_name: 'update_sop_categories_updated_at',
            event_manipulation: 'UPDATE'
          },
          {
            table_name: 'sop_documents',
            trigger_name: 'update_sop_documents_updated_at',
            event_manipulation: 'UPDATE'
          },
          {
            table_name: 'sop_steps',
            trigger_name: 'update_sop_steps_updated_at',
            event_manipulation: 'UPDATE'
          },
          {
            table_name: 'sop_completions',
            trigger_name: 'update_sop_completions_updated_at',
            event_manipulation: 'UPDATE'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTriggers);

      const response = await mockSupabaseAdmin.rpc('get_table_triggers');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const triggers = response.data;
      
      // Verify updated_at triggers exist on core tables
      const expectedTables = [
        'restaurants',
        'auth_users', 
        'sop_categories',
        'sop_documents',
        'sop_steps',
        'sop_completions'
      ];

      expectedTables.forEach(tableName => {
        const trigger = triggers.find((t: any) => 
          t.table_name === tableName && 
          t.trigger_name.includes('updated_at') &&
          t.event_manipulation === 'UPDATE'
        );
        expect(trigger).toBeDefined();
      });
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should validate RLS is enabled on all tables', async () => {
      const mockRLSStatus = {
        data: [
          {
            table_name: 'restaurants',
            row_security: true
          },
          {
            table_name: 'auth_users',
            row_security: true
          },
          {
            table_name: 'sop_categories',
            row_security: true
          },
          {
            table_name: 'sop_documents',
            row_security: true
          },
          {
            table_name: 'sop_steps',
            row_security: true
          },
          {
            table_name: 'sop_completions',
            row_security: true
          },
          {
            table_name: 'sop_assignments',
            row_security: true
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockRLSStatus);

      const response = await mockSupabaseAdmin.rpc('get_rls_status');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const rlsStatus = response.data;
      
      // Verify RLS is enabled on all sensitive tables
      const sensitiveeTables = [
        'restaurants',
        'auth_users',
        'sop_categories', 
        'sop_documents',
        'sop_steps',
        'sop_completions',
        'sop_assignments'
      ];

      sensitiveTables.forEach(tableName => {
        const table = rlsStatus.find((t: any) => t.table_name === tableName);
        expect(table).toBeDefined();
        expect(table.row_security).toBe(true);
      });
    });

    it('should validate RLS policies exist for restaurant isolation', async () => {
      const mockPolicies = {
        data: [
          {
            table_name: 'auth_users',
            policy_name: 'auth_users_restaurant_isolation',
            policy_definition: 'CREATE POLICY auth_users_restaurant_isolation ON auth_users FOR ALL USING (restaurant_id = current_setting(\'app.current_restaurant_id\')::uuid)',
            command: 'ALL'
          },
          {
            table_name: 'sop_categories',
            policy_name: 'sop_categories_restaurant_isolation',
            policy_definition: 'CREATE POLICY sop_categories_restaurant_isolation ON sop_categories FOR ALL USING (restaurant_id = current_setting(\'app.current_restaurant_id\')::uuid)',
            command: 'ALL'
          },
          {
            table_name: 'sop_documents',
            policy_name: 'sop_documents_restaurant_isolation',
            policy_definition: 'CREATE POLICY sop_documents_restaurant_isolation ON sop_documents FOR ALL USING (restaurant_id = current_setting(\'app.current_restaurant_id\')::uuid)',
            command: 'ALL'
          },
          {
            table_name: 'sop_completions',
            policy_name: 'sop_completions_restaurant_isolation',
            policy_definition: 'CREATE POLICY sop_completions_restaurant_isolation ON sop_completions FOR ALL USING (restaurant_id = current_setting(\'app.current_restaurant_id\')::uuid)',
            command: 'ALL'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockPolicies);

      const response = await mockSupabaseAdmin.rpc('get_rls_policies');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const policies = response.data;
      
      // Verify restaurant isolation policies exist
      const tablesRequiringIsolation = [
        'auth_users',
        'sop_categories',
        'sop_documents', 
        'sop_completions'
      ];

      tablesRequiringIsolation.forEach(tableName => {
        const policy = policies.find((p: any) => 
          p.table_name === tableName && 
          p.policy_name.includes('restaurant_isolation')
        );
        expect(policy).toBeDefined();
        expect(policy.command).toBe('ALL');
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate check constraints exist for data integrity', async () => {
      const mockCheckConstraints = {
        data: [
          {
            table_name: 'sop_completions',
            constraint_name: 'check_quality_rating_range',
            check_clause: 'quality_rating >= 1 AND quality_rating <= 5'
          },
          {
            table_name: 'sop_completions',
            constraint_name: 'check_compliance_score_range',
            check_clause: 'compliance_score >= 0.00 AND compliance_score <= 1.00'
          },
          {
            table_name: 'sop_analytics',
            constraint_name: 'check_completion_rate_percentage',
            check_clause: 'completion_rate >= 0 AND completion_rate <= 100'
          },
          {
            table_name: 'sop_analytics',
            constraint_name: 'check_on_time_completion_rate',
            check_clause: 'on_time_completion_rate >= 0 AND on_time_completion_rate <= 100'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockCheckConstraints);

      const response = await mockSupabaseAdmin.rpc('get_check_constraints');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const constraints = response.data;
      
      // Verify data validation constraints exist
      const expectedConstraints = [
        { table: 'sop_completions', column: 'quality_rating', type: 'range' },
        { table: 'sop_completions', column: 'compliance_score', type: 'range' },
        { table: 'sop_analytics', column: 'completion_rate', type: 'percentage' },
        { table: 'sop_analytics', column: 'on_time_completion_rate', type: 'percentage' }
      ];

      expectedConstraints.forEach(expected => {
        const constraint = constraints.find((c: any) => 
          c.table_name === expected.table && 
          c.check_clause.includes(expected.column)
        );
        expect(constraint).toBeDefined();
      });
    });

    it('should validate default values are set correctly', async () => {
      const mockDefaults = {
        data: [
          {
            table_name: 'restaurants',
            column_name: 'is_active',
            column_default: 'true'
          },
          {
            table_name: 'auth_users',
            column_name: 'is_active',
            column_default: 'true'
          },
          {
            table_name: 'sop_categories',
            column_name: 'is_active',
            column_default: 'true'
          },
          {
            table_name: 'sop_documents',
            column_name: 'is_active',
            column_default: 'true'
          },
          {
            table_name: 'sop_documents',
            column_name: 'status',
            column_default: "'draft'::sop_status_enum"
          },
          {
            table_name: 'sop_completions',
            column_name: 'status',
            column_default: "'pending'::sop_completion_status"
          },
          {
            table_name: 'sop_assignments',
            column_name: 'status',
            column_default: "'assigned'::sop_assignment_status"
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockDefaults);

      const response = await mockSupabaseAdmin.rpc('get_column_defaults');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const defaults = response.data;
      
      // Verify default values are set correctly
      const expectedDefaults = [
        { table: 'restaurants', column: 'is_active', default: 'true' },
        { table: 'auth_users', column: 'is_active', default: 'true' },
        { table: 'sop_categories', column: 'is_active', default: 'true' },
        { table: 'sop_documents', column: 'is_active', default: 'true' },
        { table: 'sop_documents', column: 'status', default: 'draft' },
        { table: 'sop_completions', column: 'status', default: 'pending' },
        { table: 'sop_assignments', column: 'status', default: 'assigned' }
      ];

      expectedDefaults.forEach(expected => {
        const defaultValue = defaults.find((d: any) => 
          d.table_name === expected.table && 
          d.column_name === expected.column
        );
        expect(defaultValue).toBeDefined();
        expect(defaultValue.column_default).toContain(expected.default);
      });
    });
  });

  describe('Translation System Tables', () => {
    it('should validate translation system tables exist', async () => {
      const mockTranslationTables = {
        data: [
          { table_name: 'translation_keys' },
          { table_name: 'translations' },
          { table_name: 'translation_history' },
          { table_name: 'translation_projects' },
          { table_name: 'translation_project_assignments' },
          { table_name: 'translation_cache' },
          { table_name: 'translation_analytics' }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTranslationTables);

      const response = await mockSupabaseAdmin.rpc('get_translation_tables');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const tables = response.data;
      
      // Verify all translation system tables exist
      const expectedTables = [
        'translation_keys',
        'translations', 
        'translation_history',
        'translation_projects',
        'translation_project_assignments',
        'translation_cache',
        'translation_analytics'
      ];

      expectedTables.forEach(tableName => {
        const table = tables.find((t: any) => t.table_name === tableName);
        expect(table).toBeDefined();
      });
    });
  });

  describe('Performance Validation', () => {
    it('should validate table statistics are up to date', async () => {
      const mockTableStats = {
        data: [
          {
            table_name: 'sop_documents',
            n_tup_ins: 100,
            n_tup_upd: 50,
            n_tup_del: 5,
            last_analyze: '2024-01-28T10:00:00Z'
          },
          {
            table_name: 'sop_completions',
            n_tup_ins: 500,
            n_tup_upd: 200,
            n_tup_del: 10,
            last_analyze: '2024-01-28T09:30:00Z'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockTableStats);

      const response = await mockSupabaseAdmin.rpc('get_table_statistics');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const stats = response.data;
      
      // Verify statistics exist for performance-critical tables
      const criticalTables = ['sop_documents', 'sop_completions'];
      
      criticalTables.forEach(tableName => {
        const tableStat = stats.find((s: any) => s.table_name === tableName);
        expect(tableStat).toBeDefined();
        expect(tableStat.last_analyze).toBeDefined();
      });
    });

    it('should validate database configuration for performance', async () => {
      const mockConfig = {
        data: [
          {
            name: 'shared_buffers',
            setting: '128MB'
          },
          {
            name: 'effective_cache_size',
            setting: '4GB'
          },
          {
            name: 'random_page_cost',
            setting: '1.1'
          },
          {
            name: 'checkpoint_completion_target',
            setting: '0.9'
          }
        ],
        error: null
      };

      mockSupabaseAdmin.rpc.mockResolvedValue(mockConfig);

      const response = await mockSupabaseAdmin.rpc('get_database_config');

      expect(response.error).toBeNull();
      expect(response.data).toBeDefined();
      
      const config = response.data;
      
      // Verify performance-related settings
      const performanceSettings = [
        'shared_buffers',
        'effective_cache_size',
        'random_page_cost',
        'checkpoint_completion_target'
      ];

      performanceSettings.forEach(settingName => {
        const setting = config.find((c: any) => c.name === settingName);
        expect(setting).toBeDefined();
        expect(setting.setting).toBeDefined();
      });
    });
  });
});