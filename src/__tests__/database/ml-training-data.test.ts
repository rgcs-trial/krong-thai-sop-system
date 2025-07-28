/**
 * ML Training Data Database Test Suite
 * Tests machine learning data collection and model storage for Phase 2 BI features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client');

const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
    maybeSingle: vi.fn()
  })),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      list: vi.fn(),
      remove: vi.fn()
    }))
  }
};

(supabaseAdmin as any).mockImplementation(() => mockSupabaseAdmin);

// Test data for ML models
const mockMLModel = {
  id: 'ml_model_123',
  restaurant_id: 'restaurant_123',
  model_name: 'sop_usage_predictor',
  model_type: 'performance_prediction',
  version: '1.2.0',
  description: 'Predicts SOP completion times and success rates',
  algorithm: 'random_forest',
  hyperparameters: {
    n_estimators: 100,
    max_depth: 10,
    min_samples_split: 2,
    random_state: 42
  },
  feature_columns: ['user_experience', 'sop_complexity', 'time_of_day', 'equipment_availability'],
  target_column: 'completion_time_minutes',
  model_status: 'deployed',
  accuracy_score: 0.87,
  training_data_size: 50000,
  last_trained_at: '2025-07-28T10:00:00Z',
  created_at: '2025-07-15T09:00:00Z',
  updated_at: '2025-07-28T10:00:00Z'
};

const mockTrainingData = [
  {
    id: 'training_data_1',
    model_id: 'ml_model_123',
    restaurant_id: 'restaurant_123',
    data_type: 'sop_usage',
    feature_vector: {
      user_experience: 3.5,
      sop_complexity: 7.2,
      time_of_day: 14.5, // 2:30 PM in decimal hours
      equipment_availability: 0.85,
      user_role_encoded: 2, // chef = 2
      day_of_week: 3, // Wednesday
      season: 1 // summer
    },
    target_value: 12.5, // 12.5 minutes to complete
    metadata: {
      user_id: 'user_123',
      sop_id: 'sop_456',
      session_id: 'session_789',
      completion_status: 'completed',
      quality_score: 0.92
    },
    data_quality_score: 0.95,
    is_anomaly: false,
    created_at: '2025-07-28T14:30:00Z'
  },
  {
    id: 'training_data_2',
    model_id: 'ml_model_123',
    restaurant_id: 'restaurant_123',
    data_type: 'performance_metrics',
    feature_vector: {
      user_experience: 1.2,
      sop_complexity: 4.8,
      time_of_day: 9.0, // 9:00 AM
      equipment_availability: 1.0,
      user_role_encoded: 1, // server = 1
      day_of_week: 1, // Monday
      season: 1
    },
    target_value: 8.2, // 8.2 minutes to complete
    metadata: {
      user_id: 'user_456',
      sop_id: 'sop_789',
      session_id: 'session_012',
      completion_status: 'completed',
      quality_score: 0.88
    },
    data_quality_score: 0.91,
    is_anomaly: false,
    created_at: '2025-07-28T09:00:00Z'
  }
];

const mockModelFeatures = [
  {
    id: 'feature_1',
    model_id: 'ml_model_123',
    feature_name: 'user_experience',
    feature_type: 'numerical',
    importance_score: 0.35,
    importance_rank: 1,
    data_type: 'float',
    min_value: 0.0,
    max_value: 10.0,
    mean_value: 4.2,
    std_dev: 2.1,
    description: 'Years of experience in restaurant operations'
  },
  {
    id: 'feature_2',
    model_id: 'ml_model_123',
    feature_name: 'sop_complexity',
    feature_type: 'numerical',
    importance_score: 0.28,
    importance_rank: 2,
    data_type: 'float',
    min_value: 1.0,
    max_value: 10.0,
    mean_value: 5.8,
    std_dev: 1.9,
    description: 'Complexity score of the SOP procedure'
  }
];

const mockModelMetrics = {
  id: 'metrics_1',
  model_id: 'ml_model_123',
  restaurant_id: 'restaurant_123',
  metric_type: 'accuracy',
  metric_value: 0.87,
  validation_type: 'cross_validation',
  test_set_size: 10000,
  confidence_interval: [0.84, 0.90],
  additional_metrics: {
    precision: 0.85,
    recall: 0.89,
    f1_score: 0.87,
    mse: 2.34,
    rmse: 1.53,
    mae: 1.12,
    r2_score: 0.82
  },
  computed_at: '2025-07-28T10:00:00Z'
};

const mockPredictionResults = [
  {
    id: 'prediction_1',
    model_id: 'ml_model_123',
    restaurant_id: 'restaurant_123',
    input_features: {
      user_experience: 5.0,
      sop_complexity: 6.5,
      time_of_day: 11.0,
      equipment_availability: 0.9
    },
    predicted_value: 10.8,
    confidence_score: 0.92,
    prediction_context: {
      user_id: 'user_789',
      sop_id: 'sop_012',
      prediction_type: 'completion_time'
    },
    actual_value: 11.2, // For validation
    prediction_error: 0.4,
    is_accurate: true, // Within acceptable range
    created_at: '2025-07-28T11:00:00Z'
  }
];

describe('ML Training Data Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful responses
    const mockQuery = mockSupabaseAdmin.from();
    mockQuery.then.mockResolvedValue({ data: [], error: null });
    mockQuery.single.mockResolvedValue({ data: null, error: null });
    mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ML Models Management', () => {
    it('should create a new ML model successfully', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ data: mockMLModel, error: null });

      const result = await supabaseAdmin
        .from('sop_ml_models')
        .insert(mockMLModel)
        .single();

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('sop_ml_models');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockMLModel);
      expect(result.data).toEqual(mockMLModel);
      expect(result.error).toBeNull();
    });

    it('should retrieve ML models by restaurant', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: [mockMLModel], error: null });

      const result = await supabaseAdmin
        .from('sop_ml_models')
        .select('*')
        .eq('restaurant_id', 'restaurant_123')
        .eq('model_status', 'deployed');

      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('restaurant_id', 'restaurant_123');
      expect(mockQuery.eq).toHaveBeenCalledWith('model_status', 'deployed');
    });

    it('should update model status', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ 
        data: { ...mockMLModel, model_status: 'retired' }, 
        error: null 
      });

      const result = await supabaseAdmin
        .from('sop_ml_models')
        .update({ 
          model_status: 'retired',
          updated_at: new Date().toISOString()
        })
        .eq('id', 'ml_model_123')
        .single();

      expect(mockQuery.update).toHaveBeenCalledWith({
        model_status: 'retired',
        updated_at: expect.any(String)
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'ml_model_123');
    });

    it('should delete old models', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: null, error: null });

      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await supabaseAdmin
        .from('sop_ml_models')
        .delete()
        .eq('model_status', 'retired')
        .lt('updated_at', cutoffDate);

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('model_status', 'retired');
      expect(mockQuery.lt).toHaveBeenCalledWith('updated_at', cutoffDate);
    });
  });

  describe('Training Data Collection', () => {
    it('should insert training data in bulk', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockTrainingData, error: null });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .insert(mockTrainingData);

      expect(mockQuery.insert).toHaveBeenCalledWith(mockTrainingData);
    });

    it('should retrieve training data with filters', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockTrainingData, error: null });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .select('*')
        .eq('model_id', 'ml_model_123')
        .eq('data_type', 'sop_usage')
        .gte('data_quality_score', 0.9)
        .eq('is_anomaly', false)
        .order('created_at', { ascending: false })
        .limit(1000);

      expect(mockQuery.eq).toHaveBeenCalledWith('model_id', 'ml_model_123');
      expect(mockQuery.eq).toHaveBeenCalledWith('data_type', 'sop_usage');
      expect(mockQuery.gte).toHaveBeenCalledWith('data_quality_score', 0.9);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_anomaly', false);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1000);
    });

    it('should handle anomaly detection flagging', async () => {
      const anomalousData = {
        ...mockTrainingData[0],
        target_value: 120.0, // Extremely high completion time
        is_anomaly: true,
        data_quality_score: 0.3
      };

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ data: anomalousData, error: null });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .update({ 
          is_anomaly: true,
          data_quality_score: 0.3 
        })
        .eq('id', 'training_data_1')
        .single();

      expect(mockQuery.update).toHaveBeenCalledWith({
        is_anomaly: true,
        data_quality_score: 0.3
      });
    });

    it('should aggregate training data statistics', async () => {
      const mockStats = {
        total_records: 50000,
        avg_quality_score: 0.92,
        anomaly_percentage: 0.05,
        data_types: ['sop_usage', 'performance_metrics', 'user_behavior'],
        date_range: {
          earliest: '2025-01-01T00:00:00Z',
          latest: '2025-07-28T14:30:00Z'
        }
      };

      mockSupabaseAdmin.rpc.mockResolvedValue({ data: mockStats, error: null });

      const result = await supabaseAdmin
        .rpc('get_training_data_stats', {
          p_model_id: 'ml_model_123',
          p_restaurant_id: 'restaurant_123'
        });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('get_training_data_stats', {
        p_model_id: 'ml_model_123',
        p_restaurant_id: 'restaurant_123'
      });
    });
  });

  describe('Model Features and Importance', () => {
    it('should store feature importance rankings', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockModelFeatures, error: null });

      const result = await supabaseAdmin
        .from('sop_model_features')
        .upsert(mockModelFeatures, { onConflict: 'model_id,feature_name' });

      expect(mockQuery.upsert).toHaveBeenCalledWith(
        mockModelFeatures,
        { onConflict: 'model_id,feature_name' }
      );
    });

    it('should retrieve features by importance', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockModelFeatures, error: null });

      const result = await supabaseAdmin
        .from('sop_model_features')
        .select('*')
        .eq('model_id', 'ml_model_123')
        .order('importance_rank', { ascending: true });

      expect(mockQuery.eq).toHaveBeenCalledWith('model_id', 'ml_model_123');
      expect(mockQuery.order).toHaveBeenCalledWith('importance_rank', { ascending: true });
    });

    it('should update feature statistics', async () => {
      const updatedFeature = {
        ...mockModelFeatures[0],
        mean_value: 4.5,
        std_dev: 2.2,
        importance_score: 0.38
      };

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ data: updatedFeature, error: null });

      const result = await supabaseAdmin
        .from('sop_model_features')
        .update({
          mean_value: 4.5,
          std_dev: 2.2,
          importance_score: 0.38
        })
        .eq('id', 'feature_1')
        .single();

      expect(mockQuery.update).toHaveBeenCalledWith({
        mean_value: 4.5,
        std_dev: 2.2,
        importance_score: 0.38
      });
    });
  });

  describe('Model Performance Metrics', () => {
    it('should store model evaluation metrics', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ data: mockModelMetrics, error: null });

      const result = await supabaseAdmin
        .from('sop_model_metrics')
        .insert(mockModelMetrics)
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith(mockModelMetrics);
    });

    it('should retrieve latest metrics for model comparison', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: [mockModelMetrics], error: null });

      const result = await supabaseAdmin
        .from('sop_model_metrics')
        .select('*')
        .eq('restaurant_id', 'restaurant_123')
        .order('computed_at', { ascending: false })
        .limit(10);

      expect(mockQuery.eq).toHaveBeenCalledWith('restaurant_id', 'restaurant_123');
      expect(mockQuery.order).toHaveBeenCalledWith('computed_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should track metric trends over time', async () => {
      const mockTrends = [
        { date: '2025-07-01', accuracy: 0.82 },
        { date: '2025-07-15', accuracy: 0.85 },
        { date: '2025-07-28', accuracy: 0.87 }
      ];

      mockSupabaseAdmin.rpc.mockResolvedValue({ data: mockTrends, error: null });

      const result = await supabaseAdmin
        .rpc('get_model_accuracy_trend', {
          p_model_id: 'ml_model_123',
          p_days_back: 30
        });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('get_model_accuracy_trend', {
        p_model_id: 'ml_model_123',
        p_days_back: 30
      });
    });
  });

  describe('Prediction Storage and Validation', () => {
    it('should store prediction results', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockPredictionResults, error: null });

      const result = await supabaseAdmin
        .from('sop_prediction_results')
        .insert(mockPredictionResults);

      expect(mockQuery.insert).toHaveBeenCalledWith(mockPredictionResults);
    });

    it('should update predictions with actual values for validation', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ 
        data: { ...mockPredictionResults[0], actual_value: 11.2 }, 
        error: null 
      });

      const result = await supabaseAdmin
        .from('sop_prediction_results')
        .update({
          actual_value: 11.2,
          prediction_error: 0.4,
          is_accurate: true
        })
        .eq('id', 'prediction_1')
        .single();

      expect(mockQuery.update).toHaveBeenCalledWith({
        actual_value: 11.2,
        prediction_error: 0.4,
        is_accurate: true
      });
    });

    it('should calculate prediction accuracy statistics', async () => {
      const mockAccuracyStats = {
        total_predictions: 1000,
        accurate_predictions: 870,
        accuracy_rate: 0.87,
        avg_prediction_error: 1.23,
        confidence_correlation: 0.78
      };

      mockSupabaseAdmin.rpc.mockResolvedValue({ data: mockAccuracyStats, error: null });

      const result = await supabaseAdmin
        .rpc('calculate_prediction_accuracy', {
          p_model_id: 'ml_model_123',
          p_time_window_days: 7
        });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('calculate_prediction_accuracy', {
        p_model_id: 'ml_model_123',
        p_time_window_days: 7
      });
    });
  });

  describe('Model Versioning and Lifecycle', () => {
    it('should create new model version', async () => {
      const newVersion = {
        ...mockMLModel,
        id: 'ml_model_124',
        version: '1.3.0',
        parent_model_id: 'ml_model_123',
        accuracy_score: 0.89,
        created_at: new Date().toISOString()
      };

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ data: newVersion, error: null });

      const result = await supabaseAdmin
        .from('sop_ml_models')
        .insert(newVersion)
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith(newVersion);
    });

    it('should manage model deployment lifecycle', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: null, error: null });

      // Deploy new model
      await supabaseAdmin
        .from('sop_ml_models')
        .update({ model_status: 'deployed' })
        .eq('id', 'ml_model_124');

      // Retire old model
      await supabaseAdmin
        .from('sop_ml_models')
        .update({ model_status: 'retired' })
        .eq('id', 'ml_model_123');

      expect(mockQuery.update).toHaveBeenCalledWith({ model_status: 'deployed' });
      expect(mockQuery.update).toHaveBeenCalledWith({ model_status: 'retired' });
    });

    it('should clean up old training data', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: null, error: null });

      const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await supabaseAdmin
        .from('sop_training_data')
        .delete()
        .lt('created_at', cutoffDate)
        .eq('is_anomaly', true); // Only delete anomalous old data

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.lt).toHaveBeenCalledWith('created_at', cutoffDate);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_anomaly', true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle bulk data operations efficiently', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTrainingData[0],
        id: `training_data_${i}`,
        target_value: Math.random() * 30
      }));

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: largeBatch, error: null });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .insert(largeBatch);

      expect(mockQuery.insert).toHaveBeenCalledWith(largeBatch);
    });

    it('should implement data partitioning for large datasets', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: [], error: null });

      // Query with date-based partitioning
      const result = await supabaseAdmin
        .from('sop_training_data')
        .select('*')
        .gte('created_at', '2025-07-01T00:00:00Z')
        .lt('created_at', '2025-08-01T00:00:00Z')
        .order('created_at', { ascending: false });

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2025-07-01T00:00:00Z');
      expect(mockQuery.lt).toHaveBeenCalledWith('created_at', '2025-08-01T00:00:00Z');
    });

    it('should optimize queries with proper indexing', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: mockTrainingData, error: null });

      // Query optimized for indexed columns
      const result = await supabaseAdmin
        .from('sop_training_data')
        .select('feature_vector, target_value')
        .eq('restaurant_id', 'restaurant_123') // Indexed
        .eq('model_id', 'ml_model_123') // Indexed
        .eq('data_type', 'sop_usage') // Indexed
        .gte('data_quality_score', 0.9) // Indexed
        .limit(5000);

      expect(mockQuery.select).toHaveBeenCalledWith('feature_vector, target_value');
      expect(mockQuery.limit).toHaveBeenCalledWith(5000);
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should handle database constraints violations', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      });

      const result = await supabaseAdmin
        .from('sop_ml_models')
        .insert(mockMLModel)
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('23505');
    });

    it('should validate feature vector schemas', async () => {
      const invalidTrainingData = {
        ...mockTrainingData[0],
        feature_vector: {
          invalid_feature: 'string_value', // Should be numeric
          missing_required_feature: undefined
        }
      };

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid feature vector schema' }
      });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .insert(invalidTrainingData)
        .single();

      expect(result.error).toBeTruthy();
    });

    it('should handle missing model references gracefully', async () => {
      const orphanedData = {
        ...mockTrainingData[0],
        model_id: 'nonexistent_model'
      };

      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: '23503', message: 'foreign key constraint violation' }
      });

      const result = await supabaseAdmin
        .from('sop_training_data')
        .insert(orphanedData)
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('23503');
    });

    it('should maintain data consistency across related tables', async () => {
      const mockQuery = mockSupabaseAdmin.from();
      mockQuery.then.mockResolvedValue({ data: null, error: null });

      // Transaction-like operation: delete model and related data
      await supabaseAdmin.from('sop_prediction_results').delete().eq('model_id', 'ml_model_123');
      await supabaseAdmin.from('sop_model_metrics').delete().eq('model_id', 'ml_model_123');
      await supabaseAdmin.from('sop_model_features').delete().eq('model_id', 'ml_model_123');
      await supabaseAdmin.from('sop_training_data').delete().eq('model_id', 'ml_model_123');
      await supabaseAdmin.from('sop_ml_models').delete().eq('id', 'ml_model_123');

      // Verify deletion order (child tables first)
      const calls = mockQuery.delete.mock.calls;
      expect(calls.length).toBe(5);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should generate model performance reports', async () => {
      const mockReport = {
        model_id: 'ml_model_123',
        model_name: 'sop_usage_predictor',
        current_accuracy: 0.87,
        accuracy_trend: 'improving',
        training_data_points: 50000,
        predictions_made: 12000,
        avg_confidence: 0.85,
        top_features: ['user_experience', 'sop_complexity', 'time_of_day'],
        performance_by_category: {
          cooking: 0.89,
          safety: 0.85,
          service: 0.87
        },
        recommendations: [
          'Consider collecting more training data for safety procedures',
          'Model performance is stable, ready for production use'
        ]
      };

      mockSupabaseAdmin.rpc.mockResolvedValue({ data: mockReport, error: null });

      const result = await supabaseAdmin
        .rpc('generate_model_performance_report', {
          p_model_id: 'ml_model_123',
          p_restaurant_id: 'restaurant_123'
        });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('generate_model_performance_report', {
        p_model_id: 'ml_model_123',
        p_restaurant_id: 'restaurant_123'
      });
    });

    it('should track data quality metrics over time', async () => {
      const mockQualityMetrics = {
        avg_quality_score: 0.92,
        quality_trend: 'stable',
        anomaly_rate: 0.05,
        data_completeness: 0.98,
        feature_coverage: {
          user_experience: 1.0,
          sop_complexity: 1.0,
          time_of_day: 0.95,
          equipment_availability: 0.87
        }
      };

      mockSupabaseAdmin.rpc.mockResolvedValue({ data: mockQualityMetrics, error: null });

      const result = await supabaseAdmin
        .rpc('analyze_data_quality', {
          p_model_id: 'ml_model_123',
          p_time_window_days: 30
        });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('analyze_data_quality', {
        p_model_id: 'ml_model_123',
        p_time_window_days: 30
      });
    });
  });
});
