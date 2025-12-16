'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ImageViewerProps {
  imagePath: string;
  alt: string;
  lowConfidenceBlocks?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

export default function ImageViewer({ imagePath, alt, lowConfidenceBlocks = [] }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setZoom((prev) => Math.min(5, prev * 1.2));
  const zoomOut = () => setZoom((prev) => Math.max(0.5, prev / 1.2));
  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Controls */}
      <div className="p-2 bg-white border-b flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          title="Zoom Out (Ctrl+-)"
        >
          −
        </button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          title="Zoom In (Ctrl++)"
        >
          +
        </button>
        <button
          onClick={resetZoom}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s',
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <div className="relative">
            <img
              src={imagePath}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              draggable={false}
              style={{ userSelect: 'none' }}
            />
            
            {/* Overlay low confidence areas */}
            {lowConfidenceBlocks.length > 0 && (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ opacity: 0.3 }}
              >
                {lowConfidenceBlocks
                  .filter((block) => block.width > 0 && block.height > 0)
                  .map((block, i) => (
                    <rect
                      key={i}
                      x={Math.max(0, block.x)}
                      y={Math.max(0, block.y)}
                      width={Math.max(1, block.width)}
                      height={Math.max(1, block.height)}
                      fill="yellow"
                      stroke="orange"
                      strokeWidth="2"
                    />
                  ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-2 bg-white border-t text-xs text-gray-600">
        <p>💡 Scroll to zoom • Click and drag to pan • Yellow highlights: low confidence areas</p>
      </div>
    </div>
  );
}

