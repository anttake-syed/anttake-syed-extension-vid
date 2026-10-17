import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to manage showcase active step, calculate target element coordinates,
 * and handle window resize / scroll event positioning.
 */
export function useShowcaseTour(steps = [], isOpen = false) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const currentStep = steps[stepIndex] || null;

  const updateTargetRect = useCallback(() => {
    if (!currentStep || !isOpen) {
      setTargetRect(null);
      return;
    }

    const selectors = currentStep.targetSelector.split(',').map(s => s.trim());
    let element = null;
    for (const sel of selectors) {
      const found = document.querySelector(sel);
      if (found) {
        element = found;
        break;
      }
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  // Recalculate on step switch, resize, or scroll
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    const handleScrollOrResize = () => updateTargetRect();

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [isOpen, stepIndex, updateTargetRect]);

  // Reset to step 0 when reopened
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

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
    stepIndex,
    setStepIndex,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    isLastStep: stepIndex === steps.length - 1
  };
}
