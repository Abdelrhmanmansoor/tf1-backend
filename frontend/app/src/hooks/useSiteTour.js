import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'site_tour_';

/**
 * Custom hook for managing site tour functionality
 * @param {Array} steps - Array of tour steps with { selector, title, content }
 * @param {string} tourKey - Unique key for this tour (used for localStorage)
 * @param {Object} options - Additional options
 * @returns {Object} Tour state and controls
 */
export const useSiteTour = (steps = [], tourKey = 'default', options = {}) => {
  const {
    autoStart = true,
    onComplete = () => {},
    onSkip = () => {},
    scrollBehavior = 'smooth',
    scrollBlock = 'center',
    highlightPadding = 8,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  const resizeObserverRef = useRef(null);
  const storageKey = `${STORAGE_PREFIX}${tourKey}`;

  // Check if tour was completed/skipped before
  const isTourCompleted = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) === 'completed' ||
             localStorage.getItem(storageKey) === 'skipped';
    } catch {
      return false;
    }
  }, [storageKey]);

  // Mark tour as completed
  const markAsCompleted = useCallback((status = 'completed') => {
    try {
      localStorage.setItem(storageKey, status);
    } catch (e) {
      console.warn('Failed to save tour status to localStorage:', e);
    }
  }, [storageKey]);

  // Calculate tooltip position based on target element
  const calculateTooltipPosition = useCallback((element) => {
    if (!element) return { top: 0, left: 0, placement: 'bottom' };

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = 200; // Approximate height
    const tooltipWidth = 400; // Approximate width
    const margin = 20;

    let placement = 'bottom';
    let top = rect.bottom + margin;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Check if tooltip fits below
    if (rect.bottom + tooltipHeight + margin > viewportHeight) {
      // Try above
      if (rect.top - tooltipHeight - margin > 0) {
        placement = 'top';
        top = rect.top - tooltipHeight - margin;
      } else {
        // Try right
        if (rect.right + tooltipWidth + margin < viewportWidth) {
          placement = 'right';
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + margin;
        } else {
          // Try left
          placement = 'left';
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - margin;
        }
      }
    }

    // Ensure tooltip stays within viewport
    left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));

    return { top, left, placement };
  }, []);

  // Find and highlight target element
  const updateTargetElement = useCallback(() => {
    if (!isActive || !steps[currentStepIndex]) return;

    const selector = steps[currentStepIndex].selector;
    const element = document.querySelector(selector);

    if (element) {
      setTargetElement(element);

      // Get bounding rect
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top - highlightPadding,
        left: rect.left - highlightPadding,
        width: rect.width + (highlightPadding * 2),
        height: rect.height + (highlightPadding * 2),
        originalRect: rect
      });

      // Calculate tooltip position
      setTooltipPosition(calculateTooltipPosition(element));

      // Scroll into view if needed
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isInViewport) {
        element.scrollIntoView({
          behavior: scrollBehavior,
          block: scrollBlock,
        });

        // Recalculate after scroll
        setTimeout(() => {
          const newRect = element.getBoundingClientRect();
          setTargetRect({
            top: newRect.top - highlightPadding,
            left: newRect.left - highlightPadding,
            width: newRect.width + (highlightPadding * 2),
            height: newRect.height + (highlightPadding * 2),
            originalRect: newRect
          });
          setTooltipPosition(calculateTooltipPosition(element));
        }, 300);
      }
    } else {
      console.warn(`Tour: Element not found for selector "${selector}"`);
      setTargetElement(null);
      setTargetRect(null);
    }
  }, [isActive, currentStepIndex, steps, highlightPadding, scrollBehavior, scrollBlock, calculateTooltipPosition]);

  // Initialize tour on mount
  useEffect(() => {
    if (autoStart && steps.length > 0 && !isTourCompleted()) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, steps.length, isTourCompleted]);

  // Update target when step changes
  useEffect(() => {
    updateTargetElement();
  }, [updateTargetElement]);

  // Handle window resize
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      updateTargetElement();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isActive, updateTargetElement]);

  // Observe target element for position changes
  useEffect(() => {
    if (!targetElement || !isActive) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      updateTargetElement();
    });

    resizeObserverRef.current.observe(targetElement);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [targetElement, isActive, updateTargetElement]);

  // Navigation functions
  const next = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, steps.length]);

  const prev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const skip = useCallback(() => {
    markAsCompleted('skipped');
    setIsActive(false);
    setTargetElement(null);
    setTargetRect(null);
    onSkip();
  }, [markAsCompleted, onSkip]);

  const finish = useCallback(() => {
    markAsCompleted('completed');
    setIsActive(false);
    setTargetElement(null);
    setTargetRect(null);
    onComplete();
  }, [markAsCompleted, onComplete]);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to reset tour status:', e);
    }
    setCurrentStepIndex(0);
    setIsActive(true);
  }, [storageKey]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prev();
          break;
        case 'Escape':
          e.preventDefault();
          skip();
          break;
        case 'Enter':
          e.preventDefault();
          if (currentStepIndex === steps.length - 1) {
            finish();
          } else {
            next();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, next, prev, skip, finish, currentStepIndex, steps.length]);

  return {
    // State
    isActive,
    currentStep: steps[currentStepIndex] || null,
    currentStepIndex,
    totalSteps: steps.length,
    targetElement,
    targetRect,
    tooltipPosition,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    progress: steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0,

    // Actions
    next,
    prev,
    goToStep,
    skip,
    finish,
    startTour,
    resetTour,

    // Utilities
    isTourCompleted,
  };
};

export default useSiteTour;
