import React, { useState, useEffect } from 'react';

const OnboardingModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setStep(0);
    } else {
      setTimeout(() => setIsVisible(false), 300); // Wait for fade out
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const steps = [
    {
      title: 'Welcome to AntCapture! 🎉',
      description: 'Your ultimate tool for screen recording and cloud storage. Let us show you around so you can start capturing moments instantly.',
      icon: 'rocket_launch'
    },
    {
      title: 'Capture Instantly',
      description: 'Use the Chrome extension to record your screen or take screenshots with just one click. Everything saves securely to the cloud.',
      icon: 'capture'
    },
    {
      title: 'Organize Your Library',
      description: 'Find all your recordings and screenshots in your library. Use our fast fuzzy search to find exactly what you need.',
      icon: 'video_library'
    },
    {
      title: 'Share Anywhere',
      description: 'Grab a secure link and share your captures with anyone. It works seamlessly across all platforms.',
      icon: 'share'
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    opacity: isOpen ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out'
  };

  const modalStyle = {
    background: 'linear-gradient(145deg, #1e1e2f, #151522)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
    width: '90%',
    maxWidth: '500px',
    padding: '40px',
    textAlign: 'center',
    color: '#fff',
    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    position: 'relative',
    overflow: 'hidden'
  };

  const glowStyle = {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(123, 97, 255, 0.15) 0%, transparent 60%)',
    zIndex: 0,
    pointerEvents: 'none'
  };

  const iconWrapStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7b61ff, #00d2ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 10px 20px rgba(123, 97, 255, 0.3)',
    position: 'relative',
    zIndex: 1
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '16px',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    zIndex: 1,
    letterSpacing: '-0.5px'
  };

  const descStyle = {
    fontSize: '16px',
    lineHeight: 1.6,
    color: '#a0a0b8',
    marginBottom: '32px',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    zIndex: 1
  };

  const dotsWrapStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
    position: 'relative',
    zIndex: 1
  };

  const dotStyle = (index) => ({
    width: index === step ? '24px' : '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: index === step ? '#7b61ff' : '#3a3a4d',
    transition: 'all 0.3s ease'
  });

  const buttonStyle = {
    background: 'linear-gradient(135deg, #7b61ff 0%, #00d2ff 100%)',
    color: '#fff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 8px 15px rgba(123, 97, 255, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    zIndex: 1
  };

  const skipStyle = {
    background: 'transparent',
    color: '#6e6e80',
    border: 'none',
    fontSize: '14px',
    marginTop: '16px',
    cursor: 'pointer',
    textDecoration: 'underline',
    position: 'relative',
    zIndex: 1,
    transition: 'color 0.2s'
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={glowStyle} />
        
        <div style={iconWrapStyle}>
          <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#fff' }}>
            {steps[step].icon}
          </span>
        </div>
        
        <h2 style={titleStyle}>{steps[step].title}</h2>
        <p style={descStyle}>{steps[step].description}</p>
        
        <div style={dotsWrapStyle}>
          {steps.map((_, i) => (
            <div key={i} style={dotStyle(i)} />
          ))}
        </div>
        
        <button 
          style={buttonStyle}
          onClick={nextStep}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 20px rgba(123, 97, 255, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 15px rgba(123, 97, 255, 0.4)';
          }}
        >
          {step === steps.length - 1 ? 'Get Started' : 'Next'}
        </button>
        
        {step < steps.length - 1 && (
          <button 
            style={skipStyle} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6e6e80'}
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
