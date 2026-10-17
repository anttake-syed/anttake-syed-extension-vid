import React, { useState, useEffect } from 'react';

const STEPS = [
  {
    badge: 'Welcome to AntCapture',
    badgeIcon: 'sparkles',
    title: 'Your All-in-One Capture Studio 🚀',
    description: 'Capture high-framerate screen recordings, annotate screenshots, and manage all your assets seamlessly in one place.',
    icon: 'rocket_launch',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    accentColor: '#a855f7',
    highlights: [
      { icon: 'videocam', label: 'Screen & Audio Recording' },
      { icon: 'edit', label: 'Annotate Screenshots' },
      { icon: 'cloud', label: 'Direct Cloud Sync' }
    ]
  },
  {
    badge: 'Step 1: Capture & Record',
    badgeIcon: 'videocam',
    title: 'One-Click Capture from Chrome 🎥',
    description: 'Use the AntCapture extension toolbar on any tab to capture whole screens, active browser tabs, system audio, and microphone in real time.',
    icon: 'camera_video',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    accentColor: '#38bdf8',
    highlights: [
      { icon: 'fullscreen', label: 'Full Screen & Tab Capture' },
      { icon: 'mic', label: 'Microphone & Tab Audio' },
      { icon: 'bolt', label: 'Zero-Lag Local Processing' }
    ]
  },
  {
    badge: 'Step 2: Instant Review & Cloud Save',
    badgeIcon: 'cloud_done',
    title: 'Lightning-Fast Storage & Sharing ⚡',
    description: 'Preview captures instantly, rename on the fly, and sync directly to AntCapture Cloud or Google Drive with end-to-end security.',
    icon: 'cloud_upload',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    accentColor: '#ec4899',
    highlights: [
      { icon: 'link', label: 'Instant Shareable Links' },
      { icon: 'lock', label: 'Encrypted Cloud Storage' },
      { icon: 'add_to_drive', label: 'Direct Google Drive Export' }
    ]
  },
  {
    badge: 'Step 3: Studio & Canvas',
    badgeIcon: 'draw',
    title: 'Organize in Library & VoidBoards 🎨',
    description: 'Search past recordings instantly with fuzzy search, or arrange media on infinite VoidBoards to brainstorm and present.',
    icon: 'dashboard_customize',
    gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    accentColor: '#10b981',
    highlights: [
      { icon: 'photo_library', label: 'Fast Cloud Library' },
      { icon: 'draw', label: 'Infinite VoidBoards' },
      { icon: 'devices', label: 'Cross-Device Playback' }
    ]
  }
];

const OnboardingModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setStep(0);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const nextStep = () => {
    if (!isLast) {
      setStep(s => s + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.25s ease-in-out',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #181d2f 0%, #0e121e 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          width: '100%',
          maxWidth: '520px',
          padding: '36px 32px 28px',
          color: '#f8fafc',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '320px',
            height: '240px',
            background: `radial-gradient(circle, ${currentStep.accentColor}33 0%, transparent 70%)`,
            pointerEvents: 'none',
            transition: 'background 0.4s ease'
          }}
        />

        {/* Close Icon */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 2
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
        </button>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', zIndex: 1 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${currentStep.accentColor}44`,
              color: currentStep.accentColor,
              backdropFilter: 'blur(8px)'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
              {currentStep.badgeIcon}
            </span>
            {currentStep.badge}
          </span>
        </div>

        {/* Main Icon */}
        <div
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '20px',
            background: currentStep.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: `0 12px 28px ${currentStep.accentColor}40`,
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease'
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '38px', color: '#fff' }}>
            {currentStep.icon}
          </span>
        </div>

        {/* Title & Description */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#f8fafc',
            textAlign: 'center',
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
            zIndex: 1
          }}
        >
          {currentStep.title}
        </h2>
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#94a3b8',
            textAlign: 'center',
            margin: '0 0 22px',
            zIndex: 1
          }}
        >
          {currentStep.description}
        </p>

        {/* Feature Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '26px',
            zIndex: 1
          }}
        >
          {currentStep.highlights.map((h, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: '18px', color: currentStep.accentColor }}
              >
                {h.icon}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  lineHeight: 1.3
                }}
              >
                {h.label}
              </span>
            </div>
          ))}
        </div>

        {/* Dots & Nav Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: 'auto',
            zIndex: 1
          }}
        >
          {/* Back button or Skip */}
          {step > 0 ? (
            <button
              onClick={prevStep}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_back</span>
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                padding: '10px 14px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              Skip tour
            </button>
          )}

          {/* Dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: i === step ? '22px' : '7px',
                  height: '7px',
                  borderRadius: '4px',
                  background: i === step ? currentStep.accentColor : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
              />
            ))}
          </div>

          {/* Next / Finish Button */}
          <button
            onClick={nextStep}
            style={{
              background: currentStep.gradient,
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 6px 16px ${currentStep.accentColor}55`,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 8px 22px ${currentStep.accentColor}70`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${currentStep.accentColor}55`;
            }}
          >
            {isLast ? 'Get Started ✦' : 'Next'}
            {!isLast && (
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
