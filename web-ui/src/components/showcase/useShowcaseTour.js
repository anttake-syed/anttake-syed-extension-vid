import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to manage showcase active step, calculate target element coordinates,
 * and handle window resize / scroll event positioning.
 */
export function useShowcaseTour(steps = [], isOpen = false) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  // Track whether the tour was open last render to detect fresh open transitions
  const wasOpen = useRef(false);

  // Resolve the current step index — while closed always use 0 so re-open never starts mid-tour
  const resolvedIndex = isOpen ? stepIndex : 0;
  const currentStep = steps[resolvedIndex] || null;

  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }

    const selectors = (currentStep.targetSelector || '').split(',').map(s => s.trim());
    let element = null;
    for (const sel of selectors) {
      if (!sel) continue;
      try {
        const found = document.querySelector(sel);
        if (found) {
          element = found;
          break;
        }
      } catch (_e) {
        // Ignore invalid CSS selector strings
      }
    }

    if (element) {
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch (_err) {
        // Fallback if scrollIntoView not supported
      }
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        });
        return;
      }
    }

    // No matching visible element — popover will center itself cleanly
    setTargetRect(null);
  }, [currentStep, isOpen]);

  // Main effect: run on open/close and step changes
  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      wasOpen.current = false;
      return;
    }

    // Reset to step 0 the moment the tour is freshly opened
    if (!wasOpen.current) {
      setStepIndex(0);
    }
    wasOpen.current = true;

    // Immediate DOM check
    updateTargetRect();

    // Second check after a layout tick (for lazy/async-rendered elements)
    const timer = setTimeout(updateTargetRect, 80);

    const handleScrollOrResize = () => {
      requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [isOpen, resolvedIndex, updateTargetRect]);

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    }
  }, [stepIndex, steps.length]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  }, [stepIndex]);

  return {
    stepIndex: resolvedIndex,
    setStepIndex,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    isLastStep: resolvedIndex === steps.length - 1
  };
}
