import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, RotateCw, X, AlertCircle, Sparkles, SwitchCamera, Crop, Maximize2 } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Photo Capture'
}) => {
  const [step, setStep] = useState<'camera' | 'crop'>('camera');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Crop rectangle state (in pixels relative to container)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 340, height: 340 });
  const [cropBox, setCropBox] = useState<CropBox>({ x: 20, y: 20, width: 260, height: 260 });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; box: CropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0, y: 0, width: 0, height: 0 }
  });
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '3:4'>('1:1');
  const [rotation, setRotation] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const naturalImageRef = useRef<HTMLImageElement | null>(null);

  // Stop camera tracks helper
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
        msg = 'Camera permission was denied. Please allow camera permissions in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on your system.';
      }
      setCameraError(msg);
    }
  }, [facingMode, stopStream]);

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

  // Capture frame from video
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    stopStream();
    setRawImage(dataUrl);
    setRotation(0);
    setAspectRatio('1:1');

    // Preload image to calculate viewport fit & initial crop box
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      naturalImageRef.current = img;
      const maxW = 340;
      const maxH = 340;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const dispW = Math.round(img.width * scale);
      const dispH = Math.round(img.height * scale);

      setContainerSize({ width: dispW, height: dispH });
      
      // Default crop box: centered square
      const boxSize = Math.min(dispW, dispH) * 0.85;
      const initialBox: CropBox = {
        x: Math.round((dispW - boxSize) / 2),
        y: Math.round((dispH - boxSize) / 2),
        width: Math.round(boxSize),
        height: Math.round(boxSize)
      };
      setCropBox(initialBox);
      setStep('crop');
    };
  };

  // Adjust crop box for chosen aspect ratio
  const handleSelectAspectRatio = (ratio: 'free' | '1:1' | '3:4') => {
    setAspectRatio(ratio);
    const { width: cW, height: cH } = containerSize;

    if (ratio === 'free') return;

    let targetW = cropBox.width;
    let targetH = cropBox.height;

    if (ratio === '1:1') {
      const size = Math.min(cW * 0.85, cH * 0.85);
      targetW = size;
      targetH = size;
    } else if (ratio === '3:4') {
      const maxH = cH * 0.9;
      targetH = maxH;
      targetW = maxH * (3 / 4);
      if (targetW > cW) {
        targetW = cW * 0.9;
        targetH = targetW * (4 / 3);
      }
    }

    targetW = Math.round(targetW);
    targetH = Math.round(targetH);
    const newX = Math.max(0, Math.min(cW - targetW, Math.round((cW - targetW) / 2)));
    const newY = Math.max(0, Math.min(cH - targetH, Math.round((cH - targetH) / 2)));

    setCropBox({
      x: newX,
      y: newY,
      width: targetW,
      height: targetH
    });
  };

  // Rotate image by 90 degrees
  const handleRotate = () => {
    if (!rawImage || !naturalImageRef.current) return;
    const img = naturalImageRef.current;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = img.height;
    rotCanvas.height = img.width;
    const ctx = rotCanvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotatedData = rotCanvas.toDataURL('image/jpeg', 0.95);
    setRawImage(rotatedData);

    const newImg = new Image();
    newImg.src = rotatedData;
    newImg.onload = () => {
      naturalImageRef.current = newImg;
      const maxW = 340;
      const maxH = 340;
      const scale = Math.min(maxW / newImg.width, maxH / newImg.height);
      const dispW = Math.round(newImg.width * scale);
      const dispH = Math.round(newImg.height * scale);

      setContainerSize({ width: dispW, height: dispH });
      const boxSize = Math.min(dispW, dispH) * 0.85;
      setCropBox({
        x: Math.round((dispW - boxSize) / 2),
        y: Math.round((dispH - boxSize) / 2),
        width: Math.round(boxSize),
        height: Math.round(boxSize)
      });
    };
  };

  // Reset to full image
  const handleResetFull = () => {
    setCropBox({
      x: 0,
      y: 0,
      width: containerSize.width,
      height: containerSize.height
    });
    setAspectRatio('free');
  };

  // MOUSE & TOUCH DRAGGING ENGINE FOR CROP HANDLES & BOX
  const onPointerDown = (mode: DragMode, clientX: number, clientY: number) => {
    setDragMode(mode);
    setDragStart({
      mouseX: clientX,
      mouseY: clientY,
      box: { ...cropBox }
    });
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    if (!dragMode) return;
    const dx = clientX - dragStart.mouseX;
    const dy = clientY - dragStart.mouseY;
    const { box } = dragStart;
    const { width: cW, height: cH } = containerSize;
    const minSize = 40;

    let nextBox = { ...box };

    if (dragMode === 'move') {
      nextBox.x = Math.max(0, Math.min(cW - box.width, box.x + dx));
      nextBox.y = Math.max(0, Math.min(cH - box.height, box.y + dy));
    } else if (dragMode === 'se') {
      let newW = Math.max(minSize, Math.min(cW - box.x, box.width + dx));
      let newH = Math.max(minSize, Math.min(cH - box.y, box.height + dy));
      if (aspectRatio === '1:1') {
        const side = Math.min(newW, newH);
        newW = side;
        newH = side;
      } else if (aspectRatio === '3:4') {
        newH = newW * (4 / 3);
        if (box.y + newH > cH) {
          newH = cH - box.y;
          newW = newH * (3 / 4);
        }
      }
      nextBox.width = Math.round(newW);
      nextBox.height = Math.round(newH);
    } else if (dragMode === 'sw') {
      let newW = Math.max(minSize, Math.min(box.x + box.width, box.width - dx));
      let newH = Math.max(minSize, Math.min(cH - box.y, box.height + dy));
      if (aspectRatio === '1:1') {
        const side = Math.min(newW, newH);
        newW = side;
        newH = side;
      }
      nextBox.x = Math.round(box.x + (box.width - newW));
      nextBox.width = Math.round(newW);
      nextBox.height = Math.round(newH);
    } else if (dragMode === 'ne') {
      let newW = Math.max(minSize, Math.min(cW - box.x, box.width + dx));
      let newH = Math.max(minSize, Math.min(box.y + box.height, box.height - dy));
      if (aspectRatio === '1:1') {
        const side = Math.min(newW, newH);
        newW = side;
        newH = side;
      }
      nextBox.y = Math.round(box.y + (box.height - newH));
      nextBox.width = Math.round(newW);
      nextBox.height = Math.round(newH);
    } else if (dragMode === 'nw') {
      let newW = Math.max(minSize, Math.min(box.x + box.width, box.width - dx));
      let newH = Math.max(minSize, Math.min(box.y + box.height, box.height - dy));
      if (aspectRatio === '1:1') {
        const side = Math.min(newW, newH);
        newW = side;
        newH = side;
      }
      nextBox.x = Math.round(box.x + (box.width - newW));
      nextBox.y = Math.round(box.y + (box.height - newH));
      nextBox.width = Math.round(newW);
      nextBox.height = Math.round(newH);
    } else if (dragMode === 'e') {
      nextBox.width = Math.max(minSize, Math.min(cW - box.x, box.width + dx));
    } else if (dragMode === 'w') {
      const newW = Math.max(minSize, Math.min(box.x + box.width, box.width - dx));
      nextBox.x = Math.round(box.x + (box.width - newW));
      nextBox.width = Math.round(newW);
    } else if (dragMode === 's') {
      nextBox.height = Math.max(minSize, Math.min(cH - box.y, box.height + dy));
    } else if (dragMode === 'n') {
      const newH = Math.max(minSize, Math.min(box.y + box.height, box.height - dy));
      nextBox.y = Math.round(box.y + (box.height - newH));
      nextBox.height = Math.round(newH);
    }

    setCropBox(nextBox);
  };

  const onPointerUp = () => setDragMode(null);

  // Global mousemove/mouseup listeners during active drag
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragMode) onPointerMove(e.clientX, e.clientY);
    };
    const handleWindowMouseUp = () => {
      if (dragMode) onPointerUp();
    };

    if (dragMode) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragMode, dragStart, containerSize, aspectRatio]);

  // Retake photo
  const handleRetake = () => {
    setRawImage(null);
    setStep('camera');
  };

  // Perform Exact Pixel Cut on Confirm
  const handleConfirmCropAndUpload = () => {
    if (!rawImage || !naturalImageRef.current) return;
    const img = naturalImageRef.current;

    const scaleX = img.width / containerSize.width;
    const scaleY = img.height / containerSize.height;

    const cropX = Math.max(0, Math.round(cropBox.x * scaleX));
    const cropY = Math.max(0, Math.round(cropBox.y * scaleY));
    const cropW = Math.min(img.width - cropX, Math.round(cropBox.width * scaleX));
    const cropH = Math.min(img.height - cropY, Math.round(cropBox.height * scaleY));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = 512;
    outCanvas.height = Math.round(512 * (cropH / cropW));
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outCanvas.width, outCanvas.height);
    const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.95);

    onCapture(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content animate-fade" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 460, width: '92%', background: '#FFFFFF', borderRadius: 'var(--radius-xl)', overflow: 'hidden', padding: 0, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.15rem 1.4rem', background: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={20} color="#38BDF8" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#FFFFFF', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: LIVE CAMERA STREAM */}
        {step === 'camera' && (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            {cameraError ? (
              <div style={{ padding: '2rem 1rem', background: '#FEF2F2', borderRadius: 'var(--radius-lg)', border: '1px solid #FECACA', color: '#991B1B' }}>
                <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>Camera Access Error</h4>
                <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: '0 0 1.25rem' }}>{cameraError}</p>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={startCamera}
                  style={{ fontWeight: 700 }}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
              </div>
            ) : (
              <div>
                {/* Viewfinder Frame */}
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 310, 
                    borderRadius: 'var(--radius-lg)', 
                    overflow: 'hidden', 
                    background: '#0F172A',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
                    margin: '0 auto 1.25rem'
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
                      width: 180, 
                      height: 240, 
                      borderRadius: '50%', 
                      border: '2.5px dashed rgba(56, 189, 248, 0.85)', 
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.4)', 
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#FFFFFF', background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                      Align Face Here
                    </span>
                  </div>

                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '999px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <SwitchCamera size={14} /> Flip
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem', fontWeight: 600 }}>
                  📸 Align your face inside the frame and click capture.
                </p>

                {/* Capture Action Bar */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={onClose} 
                    style={{ fontWeight: 700, padding: '0.75rem 1.25rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSnapPhoto}
                    style={{ 
                      fontWeight: 800, 
                      padding: '0.75rem 1.75rem', 
                      fontSize: '1rem',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <Camera size={18} /> Take Live Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: MOBILE-STYLE RECTANGULAR BOX CROPPER */}
        {step === 'crop' && rawImage && (
          <div style={{ padding: '1.25rem 1.4rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Crop size={16} color="#2563EB" /> Crop & Cut Photo:
              </span>
              
              {/* Aspect Ratio Presets */}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button 
                  type="button" 
                  onClick={() => handleSelectAspectRatio('1:1')}
                  style={{ 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid #CBD5E1', 
                    background: aspectRatio === '1:1' ? '#2563EB' : '#F1F5F9',
                    color: aspectRatio === '1:1' ? '#FFFFFF' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  1:1 Square
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSelectAspectRatio('3:4')}
                  style={{ 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid #CBD5E1', 
                    background: aspectRatio === '3:4' ? '#2563EB' : '#F1F5F9',
                    color: aspectRatio === '3:4' ? '#FFFFFF' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  3:4 Passport
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSelectAspectRatio('free')}
                  style={{ 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid #CBD5E1', 
                    background: aspectRatio === 'free' ? '#2563EB' : '#F1F5F9',
                    color: aspectRatio === 'free' ? '#FFFFFF' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  Free Cut
                </button>
              </div>
            </div>

            {/* Mobile-Style Interactive Crop Area */}
            <div 
              ref={imageContainerRef}
              style={{ 
                position: 'relative', 
                width: containerSize.width, 
                height: containerSize.height, 
                margin: '0 auto 1rem', 
                borderRadius: 'var(--radius-md)', 
                overflow: 'hidden', 
                background: '#0F172A',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                userSelect: 'none',
                touchAction: 'none'
              }}
              onTouchMove={(e) => {
                if (dragMode && e.touches.length === 1) {
                  onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={() => onPointerUp()}
            >
              {/* Underlying Captured Image */}
              <img 
                src={rawImage} 
                alt="Captured" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} 
              />

              {/* 4 Darkened Scrim Overlays around Crop Box */}
              {/* Top Scrim */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cropBox.y, background: 'rgba(15, 23, 42, 0.65)', pointerEvents: 'none' }} />
              {/* Bottom Scrim */}
              <div style={{ position: 'absolute', top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', pointerEvents: 'none' }} />
              {/* Left Scrim */}
              <div style={{ position: 'absolute', top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height, background: 'rgba(15, 23, 42, 0.65)', pointerEvents: 'none' }} />
              {/* Right Scrim */}
              <div style={{ position: 'absolute', top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height, background: 'rgba(15, 23, 42, 0.65)', pointerEvents: 'none' }} />

              {/* The Active Crop Selection Box */}
              <div 
                style={{ 
                  position: 'absolute', 
                  top: cropBox.y, 
                  left: cropBox.x, 
                  width: cropBox.width, 
                  height: cropBox.height, 
                  border: '2px solid #38BDF8', 
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.8), inset 0 0 12px rgba(56, 189, 248, 0.25)',
                  cursor: 'move',
                  boxSizing: 'border-box'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onPointerDown('move', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    onPointerDown('move', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                {/* 3x3 Rule-of-Thirds Grid */}
                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', pointerEvents: 'none' }}>
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)', borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)', borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)', borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)', borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div style={{ borderRight: '1px dashed rgba(255,255,255,0.45)' }} />
                  <div />
                </div>

                {/* 4 Corner Cutting Handles (Thick Mobile Style) */}
                {/* NW Corner */}
                <div 
                  style={{ position: 'absolute', top: -7, left: -7, width: 18, height: 18, background: '#FFFFFF', border: '3px solid #2563EB', borderRadius: 3, cursor: 'nwse-resize', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                  onMouseDown={(e) => { e.stopPropagation(); onPointerDown('nw', e.clientX, e.clientY); }}
                  onTouchStart={(e) => { if (e.touches.length === 1) { e.stopPropagation(); onPointerDown('nw', e.touches[0].clientX, e.touches[0].clientY); } }}
                />
                {/* NE Corner */}
                <div 
                  style={{ position: 'absolute', top: -7, right: -7, width: 18, height: 18, background: '#FFFFFF', border: '3px solid #2563EB', borderRadius: 3, cursor: 'nesw-resize', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                  onMouseDown={(e) => { e.stopPropagation(); onPointerDown('ne', e.clientX, e.clientY); }}
                  onTouchStart={(e) => { if (e.touches.length === 1) { e.stopPropagation(); onPointerDown('ne', e.touches[0].clientX, e.touches[0].clientY); } }}
                />
                {/* SW Corner */}
                <div 
                  style={{ position: 'absolute', bottom: -7, left: -7, width: 18, height: 18, background: '#FFFFFF', border: '3px solid #2563EB', borderRadius: 3, cursor: 'nesw-resize', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                  onMouseDown={(e) => { e.stopPropagation(); onPointerDown('sw', e.clientX, e.clientY); }}
                  onTouchStart={(e) => { if (e.touches.length === 1) { e.stopPropagation(); onPointerDown('sw', e.touches[0].clientX, e.touches[0].clientY); } }}
                />
                {/* SE Corner */}
                <div 
                  style={{ position: 'absolute', bottom: -7, right: -7, width: 18, height: 18, background: '#FFFFFF', border: '3px solid #2563EB', borderRadius: 3, cursor: 'nwse-resize', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                  onMouseDown={(e) => { e.stopPropagation(); onPointerDown('se', e.clientX, e.clientY); }}
                  onTouchStart={(e) => { if (e.touches.length === 1) { e.stopPropagation(); onPointerDown('se', e.touches[0].clientX, e.touches[0].clientY); } }}
                />

                {/* 4 Edge Handles */}
                {aspectRatio === 'free' && (
                  <>
                    <div 
                      style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 26, height: 10, background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: 2, cursor: 'ns-resize' }}
                      onMouseDown={(e) => { e.stopPropagation(); onPointerDown('n', e.clientX, e.clientY); }}
                    />
                    <div 
                      style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 26, height: 10, background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: 2, cursor: 'ns-resize' }}
                      onMouseDown={(e) => { e.stopPropagation(); onPointerDown('s', e.clientX, e.clientY); }}
                    />
                    <div 
                      style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', height: 26, width: 10, background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: 2, cursor: 'ew-resize' }}
                      onMouseDown={(e) => { e.stopPropagation(); onPointerDown('w', e.clientX, e.clientY); }}
                    />
                    <div 
                      style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', height: 26, width: 10, background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: 2, cursor: 'ew-resize' }}
                      onMouseDown={(e) => { e.stopPropagation(); onPointerDown('e', e.clientX, e.clientY); }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions (Rotate, Full Reset) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#F8FAFC', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', fontSize: '0.75rem', color: '#475569' }}>
              <span>👆 Drag corners to cut exact photo area</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  type="button" 
                  onClick={handleRotate}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RotateCw size={13} /> Rotate 90°
                </button>
                <button 
                  type="button" 
                  onClick={handleResetFull}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Maximize2 size={13} /> Full
                </button>
              </div>
            </div>

            {/* Confirm & Retake Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleRetake}
                style={{ flex: 1, fontWeight: 700, padding: '0.75rem' }}
              >
                <RefreshCw size={16} /> Retake
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmCropAndUpload}
                style={{ 
                  flex: 2, 
                  fontWeight: 800, 
                  padding: '0.75rem', 
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#059669',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Check size={18} /> Cut & Upload Cropped Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
