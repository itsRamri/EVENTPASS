import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({ value, size = 180 }) => {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then((svg: string) => {
        // Prevent drag, selection, and ghosting on mobile & desktop
        const styledSvg = svg.replace('<svg ', '<svg draggable="false" style="user-select:none;-webkit-user-drag:none;-webkit-user-select:none;pointer-events:none;touch-action:none;display:block;width:100%;height:100%;" ');
        setSvgString(styledSvg);
      })
      .catch((err: any) => {
        console.error('QR code generation error:', err);
      });
  }, [value]);

  if (!svgString) {
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#FFFFFF', 
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
          Generating Secure QR...
        </span>
      </div>
    );
  }

  return (
    <div
      draggable={false}
      onDragStart={e => e.preventDefault()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'none',
        touchAction: 'none'
      }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
};
