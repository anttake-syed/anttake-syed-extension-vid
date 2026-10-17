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
    setStepIndex,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    isLastStep
  } = useShowcaseTour(steps, isOpen);

  if (!isOpen || !currentStep) return null;

  // Calculate popover positioning relative to targetRect
  const popoverPositionStyle = useMemo(() => {
    if (!targetRect) {
      // Fallback: center in viewport
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const pad = 14;
    const popoverWidth = 360;
    const popoverHeight = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;

    if (currentStep.preferredPosition === 'bottom') {
      top = targetRect.bottom + pad;
      left = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);
    } else if (currentStep.preferredPosition === 'right') {
      top = targetRect.top + (targetRect.height / 2) - 100;
      left = targetRect.right + pad;
    } else {
      top = targetRect.bottom + pad;
      left = targetRect.left;
    }

    // Boundary protections
    if (left + popoverWidth > vw - 16) left = vw - popoverWidth - 16;
    if (left < 16) left = 16;
    if (top + popoverHeight > vh - 16) top = Math.max(16, targetRect.top - popoverHeight - pad);
    if (top < 16) top = 16;

    return {
      top: `${top}px`,
      left: `${left}px`
    };
  }, [targetRect, currentStep]);

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

  return (
    <div className={`showcase-backdrop ${isOpen ? 'active' : ''}`}>
      {/* SVG Spotlight Mask */}
      <svg className="showcase-svg-mask">
        <defs>
          <mask id="showcase-mask">
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
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.72)"
          mask="url(#showcase-mask)"
        />
      </svg>

      {/* Target Highlight Pulse Ring */}
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
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onClose}
        onActionClick={(step) => {
          if (step.id === 'extension-anchor') {
            // Optional callback hook
          }
        }}
      />
    </div>
  );
}
