import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, SwitchCamera } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Photo Capture'
}) => {
  const [step, setStep] = useState<'camera' | 'preview'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      let msg = 'Could not access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please enable camera permission in device settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on your device.';
      }
      setCameraError(msg);
    }
  }, [facingMode, stopStream]);

  // Handle open / close & lifecycle
  useEffect(() => {
    if (isOpen && step === 'camera') {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, step, startCamera, stopStream]);

  // Reset states on modal close/open
  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setCapturedImage(null);
      setCameraError(null);
    }
  }, [isOpen]);

  // Capture frame from video
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    // Center-crop to high-resolution square
    const cropSize = Math.min(vWidth, vHeight);
    const startX = (vWidth - cropSize) / 2;
    const startY = (vHeight - cropSize) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    setCapturedImage(dataUrl);
    setStep('preview');
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setStep('camera');
  };

  // Confirm and upload photo
  const handleUploadPhoto = () => {
    if (!capturedImage) return;
    onCapture(capturedImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay active" 
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        touchAction: 'none'
      }} 
      onClick={onClose}
    >
      <div 
        className="modal-content animate-fade" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 400, 
          width: '100%', 
          background: '#FFFFFF', 
          borderRadius: 24, 
          overflow: 'hidden', 
          padding: 0, 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid #E2E8F0',
          touchAction: 'auto',
          transform: 'none'
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '1rem 1.25rem', background: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={19} color="#38BDF8" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
              {step === 'camera' ? title : 'Photo Preview & Confirm'}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              border: 'none', 
              color: '#FFFFFF', 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* STEP 1: LIVE CAMERA STREAM */}
        {step === 'camera' && (
          <div style={{ padding: '1.25rem', textAlign: 'center' }}>
            {cameraError ? (
              <div style={{ padding: '1.75rem 1rem', background: '#FEF2F2', borderRadius: 16, border: '1px solid #FECACA', color: '#991B1B' }}>
                <AlertCircle size={38} color="#DC2626" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 800 }}>Camera Access Required</h4>
                <p style={{ fontSize: '0.8rem', color: '#7F1D1D', margin: '0 0 1.25rem', lineHeight: 1.4 }}>{cameraError}</p>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  onClick={startCamera}
                  style={{ fontWeight: 800, padding: '0.6rem 1.25rem' }}
                >
                  <RefreshCw size={15} /> Try Again
                </button>
              </div>
            ) : (
              <div>
                {/* Viewfinder Frame */}
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 270, 
                    borderRadius: 18, 
                    overflow: 'hidden', 
                    background: '#0F172A',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                    margin: '0 auto 0.85rem'
                  }}
                >
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                    }} 
                  />

                  {/* Face Alignment Oval Guide */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      width: 155, 
                      height: 200, 
                      borderRadius: '50%', 
                      border: '2.5px dashed rgba(56, 189, 248, 0.9)', 
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35)', 
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.725rem', color: '#FFFFFF', background: 'rgba(0,0,0,0.65)', padding: '0.2rem 0.55rem', borderRadius: 100, fontWeight: 700 }}>
                      Align Face Here
                    </span>
                  </div>

                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 100,
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <SwitchCamera size={13} /> Flip
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 1rem', fontWeight: 600 }}>
                  📸 Position your face inside the frame and tap capture.
                </p>

                {/* Capture Action Bar */}
                <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={onClose} 
                    style={{ fontWeight: 700, padding: '0.65rem 1.15rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm" 
                    onClick={handleSnapPhoto}
                    style={{ 
                      fontWeight: 800, 
                      padding: '0.65rem 1.5rem', 
                      fontSize: '0.9rem',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <Camera size={16} /> Take Live Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PHOTO PREVIEW & UPLOAD (STABLE & DIRECT) */}
        {step === 'preview' && capturedImage && (
          <div style={{ padding: '1.25rem', textAlign: 'center' }}>
            {/* Captured Image Preview Box */}
            <div 
              style={{ 
                position: 'relative', 
                width: 210, 
                height: 210, 
                margin: '0 auto 1rem', 
                borderRadius: 20, 
                overflow: 'hidden', 
                background: '#F1F5F9',
                border: '3px solid #38BDF8',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'
              }}
            >
              <img 
                src={capturedImage} 
                alt="Captured Live Photo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
              />
            </div>

            <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>
              Photo Captured Successfully!
            </div>
            <p style={{ fontSize: '0.785rem', color: '#64748B', margin: '0 0 1.25rem', fontWeight: 600 }}>
              Verify your photo is clear and tap Upload Photo to attach.
            </p>

            {/* Confirm & Retake Action Buttons */}
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleRetake}
                style={{ flex: 1, fontWeight: 700, padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}
              >
                <RefreshCw size={15} /> Retake
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleUploadPhoto}
                style={{ 
                  flex: 1.6, 
                  fontWeight: 800, 
                  padding: '0.75rem 0.75rem', 
                  fontSize: '0.925rem',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#059669',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Check size={17} strokeWidth={2.8} /> Upload Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
