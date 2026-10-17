import React, { useState } from 'react';

/**
 * Rich interactive mockups for the Showcase Tour.
 * Enables live interactions (switching demo capture modes, clicking sample canvas items,
 * and testing playback controls) directly inside the tour card.
 */
export default function ShowcaseMediaPreview({ type, accentColor = '#6366f1' }) {
  // Local state for interactive capture demo
  const [captureTab, setCaptureTab] = useState('video'); // 'video' | 'screenshot'
  const [isPlaying, setIsPlaying] = useState(false);

  // Local state for interactive canvas/voidboards demo
  const [activeBoardItem, setActiveBoardItem] = useState('note');

  switch (type) {
    case 'interactive-extension':
    case 'extension':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              padding: '2px 8px',
              borderRadius: '6px',
              animation: 'pulse 2s infinite'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#818cf8' }}>
                push_pin
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc' }}>AntCapture Extension</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Pin to your toolbar to trigger instant screen &amp; webcam recordings.
          </span>
        </div>
      );

    case 'interactive-capture':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Capture Mode Toggle Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => { setCaptureTab('video'); setIsPlaying(false); }}
              style={{
                flex: 1,
                padding: '4px 8px',
                border: 'none',
                borderRadius: '6px',
                background: captureTab === 'video' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: captureTab === 'video' ? '#38bdf8' : '#64748b',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>videocam</span>
              Screen Video
            </button>
            <button
              type="button"
              onClick={() => { setCaptureTab('screenshot'); setIsPlaying(false); }}
              style={{
                flex: 1,
                padding: '4px 8px',
                border: 'none',
                borderRadius: '6px',
                background: captureTab === 'screenshot' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: captureTab === 'screenshot' ? '#38bdf8' : '#64748b',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>photo_camera</span>
              Screenshot
            </button>
          </div>

          {/* Simulated Interactive Preview Box */}
          <div style={{
            width: '100%',
            height: '84px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '8px 10px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {captureTab === 'video' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isPlaying ? '#ef4444' : '#10b981',
                      boxShadow: isPlaying ? '0 0 8px #ef4444' : 'none'
                    }} />
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#e2e8f0' }}>
                      {isPlaying ? 'Streaming Recording (1080p 60fps)' : 'Demo Recording #01'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace' }}>
                    {isPlaying ? '00:14 / 01:30' : '01:30'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.25)',
                      border: '1px solid rgba(56, 189, 248, 0.6)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#38bdf8',
                      transition: 'transform 0.15s ease'
                    }}
                    title={isPlaying ? 'Pause Demo' : 'Play Demo'}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                </div>

                {/* Simulated Progress bar */}
                <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: isPlaying ? '60%' : '15%',
                    height: '100%',
                    background: '#38bdf8',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#38bdf8' }}>
                  crop_free
                </span>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 500 }}>
                  Annotated Screenshot Preview Captured
                </span>
              </div>
            )}
          </div>
        </div>
      );

    case 'interactive-library':
    case 'library':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Simulated Search Bar */}
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#a855f7' }}>search</span>
            <span style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace' }}>
              &quot;Sprint Demo 2026&quot;
            </span>
          </div>

          {/* Simulated Video Card with Cloud Stream simulation */}
          <div style={{
            width: '100%',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>movie</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#f1f5f9' }}>Release Walkthrough.webm</span>
                <span style={{ fontSize: '9px', color: '#94a3b8' }}>14.2 MB • Cloud Stored</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.25)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              color: '#d8b4fe',
              fontWeight: 600
            }}>
              Instant Link
            </div>
          </div>
        </div>
      );

    case 'interactive-whiteboard':
    case 'interactive-voidboards':
    case 'whiteboards':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            width: '100%',
            height: '84px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(236, 72, 153, 0.45)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Clickable Mock Card 1: Capture */}
            <div
              onClick={() => setActiveBoardItem('capture')}
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: activeBoardItem === 'capture' ? 'rgba(236, 72, 153, 0.35)' : 'rgba(236, 72, 153, 0.15)',
                border: `1px solid ${activeBoardItem === 'capture' ? '#ec4899' : 'rgba(236, 72, 153, 0.4)'}`,
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                color: '#f472b6',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeBoardItem === 'capture' ? '0 0 10px rgba(236, 72, 153, 0.4)' : 'none'
              }}
            >
              🎥 Recording Frame
            </div>

            {/* Clickable Mock Card 2: Sticky Note */}
            <div
              onClick={() => setActiveBoardItem('note')}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '12px',
                background: activeBoardItem === 'note' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.15)',
                border: `1px solid ${activeBoardItem === 'note' ? '#818cf8' : 'rgba(99, 102, 241, 0.4)'}`,
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                color: '#a5b4fc',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeBoardItem === 'note' ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              📌 Note: Fix Navbar
            </div>
          </div>
          <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
            Interactive Spatial Canvas • Click elements to preview
          </span>
        </div>
      );

    case 'cloud-upgrade':
      return (
        <div style={{
          width: '100%',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>Everything Unlocked</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.25)', padding: '1px 6px', borderRadius: '4px' }}>
              From $12/mo
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#34d399' }}>check_circle</span>
              <span>Unlimited Cloud Video Storage</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#34d399' }}>check_circle</span>
              <span>Unlimited Spatial Whiteboard</span>
            </div>
          </div>
        </div>
      );

    case 'dashboard':
    default:
      return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>100%</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Cloud Health</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7' }}>Fast</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Drive Sync</div>
          </div>
        </div>
      );
  }
}
