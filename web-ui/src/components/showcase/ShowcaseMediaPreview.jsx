import React, { useState } from 'react';
import { DriveLogoSVG, AntCaptureCloudLogoSVG } from '../icons/StorageIcons.jsx';

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
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Mode Toggle Buttons */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => { setCaptureTab('video'); setIsPlaying(false); }}
              style={{
                flex: 1,
                padding: '6px 10px',
                border: 'none',
                borderRadius: '8px',
                background: captureTab === 'video' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: captureTab === 'video' ? '#818cf8' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>videocam</span>
              Screen Video
            </button>
            <button
              type="button"
              onClick={() => { setCaptureTab('screenshot'); setIsPlaying(false); }}
              style={{
                flex: 1,
                padding: '6px 10px',
                border: 'none',
                borderRadius: '8px',
                background: captureTab === 'screenshot' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: captureTab === 'screenshot' ? '#818cf8' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>photo_camera</span>
              Screenshot
            </button>
          </div>

          {/* Simulated Player Viewport with AntCapture Video Player Aesthetics */}
          <div style={{
            width: '100%',
            height: '110px',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, #090d16 0%, #030712 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 20px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '10px 12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {captureTab === 'video' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isPlaying ? '#ef4444' : '#10b981',
                      boxShadow: isPlaying ? '0 0 10px #ef4444' : '0 0 6px #10b981'
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc' }}>
                      {isPlaying ? 'Live Cloud Playback (1080p 60fps)' : 'Recorded Video Demo #01'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace', fontWeight: 600 }}>
                    {isPlaying ? '00:18 / 01:45' : '01:45'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.3)',
                      border: '1px solid rgba(99, 102, 241, 0.7)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#c7d2fe',
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
                      transition: 'transform 0.15s ease'
                    }}
                    title={isPlaying ? 'Pause Demo' : 'Play Demo'}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                </div>

                {/* Progress bar matching AntCapture player */}
                <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: isPlaying ? '65%' : '20%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '6px 14px',
                  borderRadius: '8px'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#818cf8' }}>
                    crop_free
                  </span>
                  <span style={{ fontSize: '11px', color: '#e0e7ff', fontWeight: 600 }}>
                    Instant Annotated Screenshot Preview
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Crop, highlight, blur &amp; copy in 1 click
                </span>
              </div>
            )}
          </div>
        </div>
      );

    case 'interactive-library':
    case 'library':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Simulated Search Bar */}
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#a855f7' }}>search</span>
            <span style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace' }}>
              &quot;Sprint Demo 2026&quot;
            </span>
          </div>

          {/* Simulated Video Card with Cloud Stream simulation */}
          <div style={{
            width: '100%',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>movie</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Feature Release Walkthrough</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>1080p HD • Cloud Streamed</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.25)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11px',
              color: '#d8b4fe',
              fontWeight: 600
            }}>
              Share Link
            </div>
          </div>
        </div>
      );

    case 'interactive-whiteboard':
    case 'interactive-voidboards':
    case 'whiteboards':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            width: '100%',
            height: '110px',
            borderRadius: '10px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            backgroundColor: '#0a0e1a',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex'
          }}>
            {/* Mini Whiteboard Sidebar / Tools */}
            <div style={{
              width: '28px',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '6px',
              gap: '6px'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#ec4899' }}>draw</span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#94a3b8' }}>sticky_note_2</span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#94a3b8' }}>near_me</span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#94a3b8' }}>pan_tool</span>
            </div>

            {/* Canvas Area with Clickable Elements */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Clickable Mock Card 1: Capture */}
              <div
                onClick={() => setActiveBoardItem('capture')}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '14px',
                  background: activeBoardItem === 'capture' ? 'rgba(236, 72, 153, 0.35)' : 'rgba(236, 72, 153, 0.18)',
                  border: `1px solid ${activeBoardItem === 'capture' ? '#ec4899' : 'rgba(236, 72, 153, 0.45)'}`,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#f472b6',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeBoardItem === 'capture' ? '0 0 12px rgba(236, 72, 153, 0.4)' : 'none'
                }}
              >
                🎥 Recording Frame
              </div>

              {/* Clickable Mock Card 2: Sticky Note */}
              <div
                onClick={() => setActiveBoardItem('note')}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '16px',
                  background: activeBoardItem === 'note' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.18)',
                  border: `1px solid ${activeBoardItem === 'note' ? '#818cf8' : 'rgba(99, 102, 241, 0.45)'}`,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#a5b4fc',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeBoardItem === 'note' ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none'
                }}
              >
                📌 Note: Flow Approved
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
            Infinite Spatial Canvas • Drag frames, pin notes, and connect diagrams
          </span>
        </div>
      );

    case 'interactive-settings':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#10b981' }}>cloud_upload</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Storage Destination</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Sync directly to Google Drive or AntCapture Cloud</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
              Configurable
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1,
              background: 'rgba(0, 102, 218, 0.1)',
              border: '1px solid rgba(0, 102, 218, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <DriveLogoSVG size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>Google Drive</span>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <AntCaptureCloudLogoSVG size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#818cf8' }}>Ant Cloud</span>
            </div>
          </div>
        </div>
      );

    case 'cloud-upgrade':
      return (
        <div style={{
          width: '100%',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>Cloud Plan Quotas</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '4px' }}>
              $10/mo (billed yearly) or $12/mo
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#34d399' }}>check_circle</span>
              <span>25 GB High-Speed Cloud Storage</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#34d399' }}>check_circle</span>
              <span>Up to 1,000 Spatial Whiteboards</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#34d399' }}>check_circle</span>
              <span>Up to 5,000 Objects Per Board</span>
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
