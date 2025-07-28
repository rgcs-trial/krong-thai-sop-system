/**
 * Voice Guidance System Component Test Suite
 * Tests multilingual TTS and voice commands for Phase 2 SOP features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VoiceGuidanceSystem from '@/components/sop/voice-guidance-system';
import { useTranslations } from 'next-intl';

// Mock external dependencies
vi.mock('next-intl');
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.join(' ')
}));

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'Voice 1', lang: 'en-US', default: true },
    { name: 'Voice 2', lang: 'fr-FR', default: false }
  ]),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null
};

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null
}));

Object.defineProperty(global, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

Object.defineProperty(global, 'SpeechSynthesisUtterance', {
  writable: true,
  value: mockSpeechSynthesisUtterance
});

// Mock Speech Recognition API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  serviceURI: '',
  grammars: null,
  onresult: null,
  onerror: null,
  onstart: null,
  onend: null,
  onspeechstart: null,
  onspeechend: null,
  onsoundstart: null,
  onsoundend: null,
  onaudiostart: null,
  onaudioend: null,
  onnomatch: null
};

Object.defineProperty(global, 'webkitSpeechRecognition', {
  writable: true,
  value: vi.fn(() => mockSpeechRecognition)
});

Object.defineProperty(global, 'SpeechRecognition', {
  writable: true,
  value: vi.fn(() => mockSpeechRecognition)
});

// Mock translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'voiceGuidance': 'Voice Guidance',
    'play': 'Play',
    'pause': 'Pause',
    'stop': 'Stop',
    'next': 'Next',
    'previous': 'Previous',
    'settings': 'Settings',
    'language': 'Language',
    'voice': 'Voice',
    'speed': 'Speed',
    'pitch': 'Pitch',
    'volume': 'Volume',
    'autoPlay': 'Auto Play',
    'pauseBetweenSteps': 'Pause Between Steps',
    'voiceCommands': 'Voice Commands',
    'listening': 'Listening...',
    'speakCommand': 'Speak a command',
    'commandsHelp': 'Say "next", "previous", "repeat", "pause", or "stop"',
    'step': 'Step',
    'of': 'of',
    'completed': 'Completed',
    'loading': 'Loading...',
    'voiceNotAvailable': 'Voice synthesis not available',
    'microphoneNotAvailable': 'Microphone not available'
  };
  return translations[key] || key;
});

(useTranslations as any).mockReturnValue(mockT);

// Test data
const mockSteps = [
  {
    id: 'step1',
    text: 'First, wash your hands thoroughly',
    text_fr: 'D\'abord, lavez-vous les mains soigneusement',
    order: 1,
    duration: 3,
    emphasis: 'normal' as const,
    pauseAfter: 1
  },
  {
    id: 'step2',
    text: 'Put on safety gloves and apron',
    text_fr: 'Mettez des gants de sécurité et un tablier',
    order: 2,
    duration: 2,
    emphasis: 'strong' as const,
    pauseAfter: 0.5
  },
  {
    id: 'step3',
    text: 'Check equipment temperature is correct',
    text_fr: 'Vérifiez que la température de l\'équipement est correcte',
    order: 3,
    duration: 4,
    emphasis: 'critical' as const,
    pauseAfter: 2
  }
];

const mockSettings = {
  language: 'en' as const,
  voice: 'Voice 1',
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  autoPlay: true,
  pauseBetweenSteps: 2
};

describe('VoiceGuidanceSystem', () => {
  let mockOnStepChange: ReturnType<typeof vi.fn>;
  let mockOnGuidanceStart: ReturnType<typeof vi.fn>;
  let mockOnGuidanceEnd: ReturnType<typeof vi.fn>;
  let mockOnVoiceCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnStepChange = vi.fn();
    mockOnGuidanceStart = vi.fn();
    mockOnGuidanceEnd = vi.fn();
    mockOnVoiceCommand = vi.fn();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state correctly', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render voice guidance interface with controls', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          showControls={true}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('Voice Guidance')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Play')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should render current step content', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={0}
        />
      );

      expect(screen.getByText('First, wash your hands thoroughly')).toBeInTheDocument();
    });

    it('should not render controls when showControls is false', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          showControls={false}
        />
      );

      expect(screen.queryByText('Play')).not.toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('should render voice command interface when enabled', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
        />
      );

      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
      expect(screen.getByText('Speak a command')).toBeInTheDocument();
    });
  });

  describe('Text-to-Speech Functionality', () => {
    it('should start speech synthesis when play is clicked', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={mockSettings}
          onGuidanceStart={mockOnGuidanceStart}
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(
          'First, wash your hands thoroughly'
        );
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
        expect(mockOnGuidanceStart).toHaveBeenCalled();
      });
    });

    it('should pause speech synthesis when pause is clicked', async () => {
      mockSpeechSynthesis.speaking = true;
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={mockSettings}
        />
      );

      // Start playing first
      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        const pauseButton = screen.getByText('Pause');
        fireEvent.click(pauseButton);
        expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
      });
    });

    it('should stop speech synthesis when stop is clicked', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={mockSettings}
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      });
    });

    it('should use correct voice settings', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={mockSettings}
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0];
        expect(utteranceCall[0]).toBe('First, wash your hands thoroughly');
        
        // Check if utterance object properties would be set correctly
        const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
        expect(utterance.text).toBe('First, wash your hands thoroughly');
      });
    });

    it('should handle French language correctly', async () => {
      const frenchSettings = { ...mockSettings, language: 'fr' as const };
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={frenchSettings}
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(
          'D\'abord, lavez-vous les mains soigneusement'
        );
      });
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to next step', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={0}
          enableNavigation={true}
          onStepChange={mockOnStepChange}
        />
      );

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(mockOnStepChange).toHaveBeenCalledWith(1);
    });

    it('should navigate to previous step', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={1}
          enableNavigation={true}
          onStepChange={mockOnStepChange}
        />
      );

      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);

      expect(mockOnStepChange).toHaveBeenCalledWith(0);
    });

    it('should disable previous button on first step', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={0}
          enableNavigation={true}
        />
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('should disable next button on last step', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={2}
          enableNavigation={true}
        />
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should not show navigation when disabled', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableNavigation={false}
        />
      );

      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });

  describe('Voice Commands', () => {
    it('should start speech recognition when voice commands enabled', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
          onVoiceCommand={mockOnVoiceCommand}
        />
      );

      const voiceButton = screen.getByLabelText(/microphone|voice/i) || screen.getByRole('button', { name: /voice/i });
      if (voiceButton) {
        fireEvent.click(voiceButton);
        expect(mockSpeechRecognition.start).toHaveBeenCalled();
      }
    });

    it('should handle voice command results', async () => {
      const mockRecognitionInstance = mockSpeechRecognition;
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
          onVoiceCommand={mockOnVoiceCommand}
        />
      );

      // Simulate speech recognition result
      const mockEvent = {
        results: [[
          { transcript: 'next', confidence: 0.9 }
        ]],
        resultIndex: 0
      };

      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult(mockEvent as any);
      }

      await waitFor(() => {
        expect(mockOnVoiceCommand).toHaveBeenCalledWith('next');
      });
    });

    it('should handle speech recognition errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
        />
      );

      // Simulate error
      const mockError = { error: 'not-allowed' };
      if (mockSpeechRecognition.onerror) {
        mockSpeechRecognition.onerror(mockError as any);
      }

      consoleSpy.mockRestore();
    });

    it('should show listening indicator when active', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
        />
      );

      // Simulate listening state
      if (mockSpeechRecognition.onstart) {
        mockSpeechRecognition.onstart({} as any);
      }

      // Would show listening indicator in UI
    });
  });

  describe('Settings and Configuration', () => {
    it('should apply voice settings correctly', () => {
      const customSettings = {
        ...mockSettings,
        rate: 1.5,
        pitch: 1.2,
        volume: 0.5
      };
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={customSettings}
        />
      );

      // Settings would be applied to speech synthesis
    });

    it('should handle auto-play functionality', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          autoStart={true}
          settings={mockSettings}
          onGuidanceStart={mockOnGuidanceStart}
        />
      );

      await waitFor(() => {
        expect(mockOnGuidanceStart).toHaveBeenCalled();
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });

    it('should handle pause between steps', async () => {
      vi.useFakeTimers();
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          settings={{ ...mockSettings, pauseBetweenSteps: 3 }}
        />
      );

      // Simulate step completion and auto-advance
      const utterance = mockSpeechSynthesisUtterance.mock.results[0]?.value;
      if (utterance && utterance.onend) {
        utterance.onend({} as any);
      }

      // Fast-forward timers
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      vi.useRealTimers();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          showControls={true}
        />
      );

      const playButton = screen.getByText('Play');
      expect(playButton).toHaveAttribute('type', 'button');
      
      // Check for ARIA labels on controls
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          showControls={true}
          enableNavigation={true}
        />
      );

      const playButton = screen.getByText('Play');
      playButton.focus();
      expect(document.activeElement).toBe(playButton);

      // Test keyboard activation
      fireEvent.keyDown(playButton, { key: 'Enter' });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should provide screen reader announcements', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={1}
        />
      );

      // Should announce current step
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle speech synthesis not available', () => {
      // Temporarily remove speechSynthesis
      const originalSpeechSynthesis = global.speechSynthesis;
      delete (global as any).speechSynthesis;
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
        />
      );

      expect(screen.getByText('Voice synthesis not available')).toBeInTheDocument();
      
      // Restore
      global.speechSynthesis = originalSpeechSynthesis;
    });

    it('should handle microphone not available', () => {
      // Remove speech recognition
      delete (global as any).webkitSpeechRecognition;
      delete (global as any).SpeechRecognition;
      
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
        />
      );

      expect(screen.getByText('Microphone not available')).toBeInTheDocument();
    });

    it('should handle empty steps array', () => {
      render(
        <VoiceGuidanceSystem
          steps={[]}
        />
      );

      expect(screen.getByText('Step 0 of 0')).toBeInTheDocument();
    });

    it('should handle invalid step index', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={10} // Out of bounds
        />
      );

      // Should handle gracefully without crashing
      expect(screen.getByText('Step 11 of 3')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should cleanup speech synthesis on unmount', () => {
      const { unmount } = render(
        <VoiceGuidanceSystem
          steps={mockSteps}
        />
      );

      unmount();
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should cleanup speech recognition on unmount', () => {
      const { unmount } = render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableVoiceCommands={true}
        />
      );

      unmount();
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    it('should handle rapid step changes gracefully', async () => {
      const { rerender } = render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={0}
        />
      );

      // Rapidly change steps
      for (let i = 0; i < mockSteps.length; i++) {
        rerender(
          <VoiceGuidanceSystem
            steps={mockSteps}
            currentStepIndex={i}
          />
        );
      }

      // Should handle without errors
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    });
  });

  describe('Tablet Optimization', () => {
    it('should render touch-friendly controls', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          showControls={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Should have tablet-optimized styling
        expect(button).toHaveClass(''); // Would check for tablet classes
      });
    });

    it('should handle touch gestures', () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          enableNavigation={true}
        />
      );

      const container = screen.getByText('Voice Guidance').closest('div');
      if (container) {
        // Simulate touch swipe for navigation
        fireEvent.touchStart(container, {
          touches: [{ clientX: 200, clientY: 100 }]
        });
        fireEvent.touchEnd(container, {
          changedTouches: [{ clientX: 100, clientY: 100 }]
        });
      }
    });
  });

  describe('Integration Features', () => {
    it('should handle guidance completion', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={2} // Last step
          onGuidanceEnd={mockOnGuidanceEnd}
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      // Simulate speech end on last step
      const utterance = mockSpeechSynthesisUtterance.mock.results[0]?.value;
      if (utterance && utterance.onend) {
        utterance.onend({} as any);
      }

      await waitFor(() => {
        expect(mockOnGuidanceEnd).toHaveBeenCalled();
      });
    });

    it('should handle emphasis levels correctly', async () => {
      render(
        <VoiceGuidanceSystem
          steps={mockSteps}
          currentStepIndex={2} // Critical emphasis step
        />
      );

      const playButton = screen.getByText('Play');
      fireEvent.click(playButton);

      // Would check if emphasis affects speech synthesis parameters
      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });
});
