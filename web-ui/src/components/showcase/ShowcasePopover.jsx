import React from 'react';
import ShowcaseMediaPreview from './ShowcaseMediaPreview.jsx';

export default function ShowcasePopover({
  step,
  stepIndex,
  totalSteps,
  positionStyle,
  variant = 'standard',
  onNext,
  onPrev,
  onSkip,
  onActionClick
}) {
  const isLast = stepIndex === totalSteps - 1;
  const isStandard = variant === 'standard';

  return (
    <div className="showcase-popover" style={positionStyle}>
      {/* Header with Step Badge & Close */}
      <div className="showcase-header">
        <span
          className="showcase-badge"
          style={{
            color: step.accentColor,
            borderColor: `${step.accentColor}44`,
            background: `${step.accentColor}18`
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
            {step.badgeIcon || 'info'}
          </span>
          {step.badge}
        </span>
        {!isStandard && (
          <button className="showcase-close-btn" onClick={onSkip} aria-label="Dismiss tour">
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      {/* Content */}
      <h3 className="showcase-title">{step.title}</h3>
      <p className="showcase-desc">{step.description}</p>

      {/* Media Preview Box */}
      {step.mediaType && (
        <div className="showcase-media-box">
          <ShowcaseMediaPreview type={step.mediaType} accentColor={step.accentColor} />
        </div>
      )}

      {/* Footer Controls */}
      <div className="showcase-footer">
        {/* Progress Dots */}
        <div className="showcase-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`showcase-dot ${i === stepIndex ? 'active' : ''}`}
              style={i === stepIndex ? { background: step.accentColor } : {}}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {stepIndex > 0 ? (
            <button className="showcase-btn-ghost" onClick={onPrev}>
              Back
            </button>
          ) : (
            <button className="showcase-btn-ghost" onClick={onSkip}>
              Skip
            </button>
          )}

          {step.actionUrl && (
            <a
              href={step.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="showcase-btn-secondary"
              style={{
                textDecoration: 'none',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#f1f5f9',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                padding: '9px 15px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onClick={() => onActionClick && onActionClick(step)}
            >
              <span>{step.primaryActionText || 'Install'}</span>
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>open_in_new</span>
            </a>
          )}

          <button
            className="showcase-btn-primary"
            style={{
              background: `linear-gradient(135deg, ${step.accentColor} 0%, #4338ca 100%)`,
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}
            onClick={onNext}
          >
            <span>{isLast ? 'Done ✦' : 'Next'}</span>
            {!isLast && (
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>arrow_forward</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
