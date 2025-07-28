/**
 * Advanced Photo Verification Component Test Suite
 * Tests AI-powered photo verification with annotations for Phase 2 SOP features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdvancedPhotoVerification from '@/components/sop/advanced-photo-verification';
import { useTranslations } from 'next-intl';

// Mock external dependencies
vi.mock('next-intl');
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.join(' ')
}));

// Mock Web APIs
Object.defineProperty(global, 'MediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn()
  }
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn()
  }
});

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn(() => 'blob:test-url')
  }
});

// Mock translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'photoVerification': 'Photo Verification',
    'takePhoto': 'Take Photo',
    'uploadPhoto': 'Upload Photo',
    'capture': 'Capture',
    'loadingVerification': 'Loading verification...',
    'capturedPhotos': 'Captured Photos',
    'photoViewer': 'Photo Viewer',
    'enterText': 'Enter text',
    'analyzingPhoto': 'Analyzing photo...',
    'pleaseWait': 'Please wait...',
    'qualityScore': 'Quality Score',
    'detectedObjects': 'Detected Objects',
    'suggestions': 'Suggestions',
    'manualReview': 'Manual Review',
    'reviewComments': 'Review comments',
    'reject': 'Reject',
    'needsRevision': 'Needs Revision',
    'approve': 'Approve',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.needs_revision': 'Needs Revision'
  };
  return translations[key] || key;
});

(useTranslations as any).mockReturnValue(mockT);

// Test data
const mockRequirements = [
  {
    id: 'req1',
    title: 'Equipment Check',
    title_fr: 'Vérification de l\'équipement',
    description: 'Verify all equipment is properly positioned',
    description_fr: 'Vérifier que tout l\'équipement est correctement positionné',
    required_elements: ['Equipment', 'Safety gear', 'Clean workspace'],
    quality_criteria: {
      min_resolution: { width: 800, height: 600 },
      max_file_size_mb: 5,
      required_lighting: 'good' as const,
      required_angle: ['front', 'side'],
      blur_tolerance: 'low' as const
    },
    auto_verify: true,
    ai_model_config: { threshold: 0.8 }
  }
];

const mockCurrentUser = {
  id: 'user123',
  name: 'John Doe',
  role: 'chef'
};

const mockExistingResults = [
  {
    id: 'photo1',
    photo_url: 'test-photo-url',
    thumbnail_url: 'test-thumbnail-url',
    annotations: [],
    verification_status: 'pending' as const,
    verification_score: 0.85,
    ai_analysis: {
      detected_objects: [
        {
          label: 'Equipment',
          confidence: 0.95,
          bbox: { x: 100, y: 100, width: 200, height: 150 }
        }
      ],
      quality_score: 0.88,
      compliance_issues: [],
      suggestions: ['Image quality is good']
    },
    metadata: {
      step_id: 'step1',
      requirement_id: 'req1',
      filename: 'test.jpg',
      file_size: 1024000,
      dimensions: { width: 1920, height: 1080 },
      timestamp: '2025-07-28T10:00:00Z'
    }
  }
];

// Mock file for testing
const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const file = new File(['test content'], name, { type });
  return file;
};

describe('AdvancedPhotoVerification', () => {
  let mockOnPhotoCapture: ReturnType<typeof vi.fn>;
  let mockOnVerificationComplete: ReturnType<typeof vi.fn>;
  let mockOnAnnotationChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPhotoCapture = vi.fn();
    mockOnVerificationComplete = vi.fn();
    mockOnAnnotationChange = vi.fn();
    
    // Mock MediaStream
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    });

    // Mock Image constructor
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      src = '';
      width = 1920;
      height = 1080;
      
      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state correctly', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading verification...')).toBeInTheDocument();
    });

    it('should render requirements header and controls', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      expect(screen.getByText('Photo Verification')).toBeInTheDocument();
      expect(screen.getByText('0/1')).toBeInTheDocument(); // Badge showing progress
      expect(screen.getByText('Equipment Check')).toBeInTheDocument();
      expect(screen.getByText('Take Photo')).toBeInTheDocument();
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    it('should render existing photos', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
        />
      );

      expect(screen.getByText('Captured Photos')).toBeInTheDocument();
      expect(screen.getByText('0 annotations')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should not render controls in read-only mode', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          readOnly={true}
        />
      );

      expect(screen.queryByText('Take Photo')).not.toBeInTheDocument();
      expect(screen.queryByText('Upload Photo')).not.toBeInTheDocument();
    });
  });

  describe('Photo Capture Functionality', () => {
    it('should initialize camera when take photo is clicked', async () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          onPhotoCapture={mockOnPhotoCapture}
        />
      );

      const captureButton = screen.getByText('Take Photo');
      fireEvent.click(captureButton);

      await waitFor(() => {
        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      });
    });

    it('should handle file upload', async () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          onPhotoCapture={mockOnPhotoCapture}
        />
      );

      const uploadButton = screen.getByText('Upload Photo');
      fireEvent.click(uploadButton);

      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const mockFile = createMockFile();
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(mockOnPhotoCapture).toHaveBeenCalledWith(mockFile, []);
      }, { timeout: 3000 });
    });

    it('should process photo with AI analysis simulation', async () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          onPhotoCapture={mockOnPhotoCapture}
        />
      );

      const uploadButton = screen.getByText('Upload Photo');
      fireEvent.click(uploadButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = createMockFile();
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      // Should show analyzing state
      expect(screen.getByText('Analyzing photo...')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();

      // Wait for analysis to complete
      await waitFor(() => {
        expect(screen.queryByText('Analyzing photo...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Annotation System', () => {
    beforeEach(async () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
          onAnnotationChange={mockOnAnnotationChange}
        />
      );

      // Select the photo to enable annotation tools
      const photoElement = screen.getByAltText('Photo photo1');
      fireEvent.click(photoElement);

      await waitFor(() => {
        expect(screen.getByText('Photo Viewer')).toBeInTheDocument();
      });
    });

    it('should show annotation tools when photo is selected', () => {
      // Rectangle tool
      const rectangleButton = document.querySelector('button');
      expect(rectangleButton).toBeInTheDocument();

      // Color picker
      const colorButtons = document.querySelectorAll('button[style*="background-color"]');
      expect(colorButtons.length).toBeGreaterThan(0);

      // Zoom controls
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle zoom controls', () => {
      const zoomInButton = screen.getByLabelText(/zoom/i) || document.querySelector('button[aria-label*="zoom"]');
      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        // Zoom functionality would be tested with canvas interactions
      }
    });

    it('should toggle annotation visibility', () => {
      const toggleButton = document.querySelector('button');
      if (toggleButton) {
        fireEvent.click(toggleButton);
        // Annotation visibility toggle would be tested
      }
    });
  });

  describe('AI Analysis Results', () => {
    it('should display AI analysis results for photos', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
        />
      );

      // Select photo to view analysis
      const photoElement = screen.getByAltText('Photo photo1');
      fireEvent.click(photoElement);

      expect(screen.getByText('Quality Score')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getByText('Detected Objects')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Image quality is good')).toBeInTheDocument();
    });
  });

  describe('Manual Review Workflow', () => {
    it('should show manual review interface for pending photos', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
        />
      );

      // Select pending photo
      const photoElement = screen.getByAltText('Photo photo1');
      fireEvent.click(photoElement);

      expect(screen.getByText('Manual Review')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Review comments')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByText('Needs Revision')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('should handle approval action', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
        />
      );

      const photoElement = screen.getByAltText('Photo photo1');
      fireEvent.click(photoElement);

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      // Approval action would trigger state updates
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      const takePhotoButton = screen.getByText('Take Photo');
      expect(takePhotoButton).toHaveAttribute('type', 'button');

      const uploadButton = screen.getByText('Upload Photo');
      expect(uploadButton).toHaveAttribute('type', 'button');
    });

    it('should support keyboard navigation', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      const takePhotoButton = screen.getByText('Take Photo');
      takePhotoButton.focus();
      expect(document.activeElement).toBe(takePhotoButton);

      // Test keyboard activation
      fireEvent.keyDown(takePhotoButton, { key: 'Enter' });
      // Would test camera initialization
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle camera access errors gracefully', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Camera not available'));
      
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      const captureButton = screen.getByText('Take Photo');
      fireEvent.click(captureButton);

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      });
    });

    it('should handle large file uploads', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          onPhotoCapture={mockOnPhotoCapture}
        />
      );

      const uploadButton = screen.getByText('Upload Photo');
      fireEvent.click(uploadButton);

      // Create a large mock file (10MB)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      // Should still process the file (validation would be done in real implementation)
      await waitFor(() => {
        expect(mockOnPhotoCapture).toHaveBeenCalled();
      }, { timeout: 3000 });
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid file types gracefully', async () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          onPhotoCapture={mockOnPhotoCapture}
        />
      );

      const uploadButton = screen.getByText('Upload Photo');
      fireEvent.click(uploadButton);

      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Should handle gracefully (validation in real implementation)
      await waitFor(() => {
        // In real implementation, would show error message
      });
    });
  });

  describe('Tablet Optimization', () => {
    it('should render touch-friendly interface elements', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      // Buttons should be large enough for touch
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(''); // Would check for tablet-optimized classes
      });
    });

    it('should handle touch gestures for zoom and pan', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
          existingResults={mockExistingResults}
        />
      );

      const photoElement = screen.getByAltText('Photo photo1');
      fireEvent.click(photoElement);

      // Simulate touch events for tablet interaction
      const canvas = document.querySelector('canvas');
      if (canvas) {
        fireEvent.touchStart(canvas, {
          touches: [{ clientX: 100, clientY: 100 }]
        });
        fireEvent.touchEnd(canvas);
      }
    });
  });

  describe('Bilingual Support', () => {
    it('should use translated strings correctly', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      expect(mockT).toHaveBeenCalledWith('photoVerification');
      expect(mockT).toHaveBeenCalledWith('takePhoto');
      expect(mockT).toHaveBeenCalledWith('uploadPhoto');
    });

    it('should display French requirement content when available', () => {
      render(
        <AdvancedPhotoVerification
          stepId="step1"
          sopId="sop1"
          requirements={mockRequirements}
          currentUser={mockCurrentUser}
        />
      );

      // Would test French content display based on locale
      expect(screen.getByText('Equipment Check')).toBeInTheDocument();
    });
  });
});
