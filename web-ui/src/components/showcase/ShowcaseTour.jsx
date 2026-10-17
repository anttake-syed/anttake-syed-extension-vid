import React, { useMemo } from 'react';
import './showcaseStyles.css';
import { SHOWCASE_STEPS } from './showcaseSteps.js';
import { useShowcaseTour } from './useShowcaseTour.js';
import ShowcasePopover from './ShowcasePopover.jsx';

export default function ShowcaseTour({
  isOpen,
  variant = 'standard',
  onClose,
  onNavigate
}) {
  const steps = useMemo(() => {
    return SHOWCASE_STEPS[variant] || SHOWCASE_STEPS.standard;
  }, [variant]);

  const {
    stepIndex,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    isLastStep
  } = useShowcaseTour(steps, isOpen);

  // Calculate popover positioning relative to targetRect
  const popoverPositionStyle = useMemo(() => {
    if (!isOpen) return {};

    const popoverWidth = 360;
    const popoverHeight = 320;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    if (!targetRect) {
      // Fallback: center in viewport
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const pad = 14;
    let top = 0;
    let left = 0;

    if (currentStep?.preferredPosition === 'bottom') {
      top = targetRect.bottom + pad;
      left = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);
    } else if (currentStep?.preferredPosition === 'right') {
      top = targetRect.top + (targetRect.height / 2) - 100;
      left = targetRect.right + pad;
    } else {
      top = targetRect.bottom + pad;
      left = targetRect.left;
    }

    // Boundary protections against screen clipping
    if (left + popoverWidth > vw - 16) left = vw - popoverWidth - 16;
    if (left < 16) left = 16;
    if (top + popoverHeight > vh - 16) top = Math.max(16, targetRect.top - popoverHeight - pad);
    if (top < 16) top = 16;

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed'
    };
  }, [targetRect, currentStep, isOpen]);

  // Don't render at all when not open
  if (!isOpen) return null;
  // If steps haven't resolved yet, show centered popover with loading
  if (!currentStep) return null;

  // Handle Next step with optional subpage navigation
  const handleNext = () => {
    if (currentStep.navigateTo && onNavigate) {
      onNavigate(currentStep.navigateTo);
    }
    if (isLastStep) {
      onClose();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    prevStep();
  };

  const pad = 8;
  const rx = 10;

  const isStandard = variant === 'standard';

  return (
    <div
      className="showcase-backdrop active"
      onClick={(e) => {
        // Standard/free tour prevents accidental dismissals from backdrop clicks
        if (isStandard) return;
        // Clicking the dark backdrop (not the popover) closes the tour
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* SVG Full-screen Spotlight Mask */}
      <svg
        className="showcase-svg-mask"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="showcase-cutout-mask">
            {/* White = show the dark overlay; black = transparent cutout (spotlight) */}
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - pad}
                y={targetRect.top - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx={rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay — cut out by mask above */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#showcase-cutout-mask)"
        />
      </svg>

      {/* Glowing Pulse Ring around the highlighted target element */}
      {targetRect && (
        <div
          className="showcase-pulse-ring"
          style={{
            top: `${targetRect.top - pad}px`,
            left: `${targetRect.left - pad}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`
          }}
        />
      )}

      {/* Floating Popover Card */}
      <ShowcasePopover
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        positionStyle={popoverPositionStyle}
        variant={variant}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onClose}
        onActionClick={(step) => {
          if (step.actionUrl) {
            window.open(step.actionUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      />
    </div>
  );
}
