'use client';

import React, { useState, useRef } from 'react';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, title }) => {
  const galleryImages = images && images.length > 0 ? images : [
    '/products/spinach.webp'
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState<{ transform: string; transformOrigin: string }>({
    transform: 'scale(1)',
    transformOrigin: '50% 50%',
  });

  const thumbListRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomStyle({
      transform: 'scale(1.8)',
      transformOrigin: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transform: 'scale(1)',
      transformOrigin: '50% 50%',
    });
  };

  const scrollThumbnails = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!thumbListRef.current) return;
    const container = thumbListRef.current;
    const scrollAmount = 140;

    if (direction === 'up') {
      container.scrollTop -= scrollAmount;
    } else if (direction === 'down') {
      container.scrollTop += scrollAmount;
    } else if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
      container.scrollLeft += scrollAmount;
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
    scrollThumbnails('up');
    scrollThumbnails('left');
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
    scrollThumbnails('down');
    scrollThumbnails('right');
  };

  return (
    <div className="custom-product-gallery">
      {/* 1. MAIN IMAGE & ZOOM DISPLAY (TOP ON MOBILE) */}
      <div className="image-zoom-wrapper">
        <div
          className="custom-main-image"
          style={{ overflow: 'hidden', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <img
            id="mainProductImage"
            src={galleryImages[activeIndex] || galleryImages[0]}
            alt={title}
            style={{
              transition: 'transform 0.15s ease-out',
              transform: zoomStyle.transform,
              transformOrigin: zoomStyle.transformOrigin,
              willChange: 'transform',
              cursor: 'grab',
            }}
          />
        </div>
      </div>

      {/* 2. THUMBNAILS CONTAINER (BELOW MAIN IMAGE ON MOBILE) */}
      <div className="custom-thumbnails">
        {/* DESKTOP UP ARROW (HIDDEN ON MOBILE) */}
        <button
          className="thumb-arrow up"
          type="button"
          onClick={handlePrev}
          aria-label="Previous Image"
        >
          <svg viewBox="0 0 20 20">
            <path d="M5 12l5-5 5 5" stroke="#000" strokeWidth="2" fill="none"></path>
          </svg>
        </button>

        {/* THUMBNAIL WRAPPER */}
        <div className="thumb-wrapper">
          {/* MOBILE LEFT ARROW */}
          <button
            className="arrow-left"
            type="button"
            onClick={handlePrev}
            aria-label="Previous Image"
          >
            <svg viewBox="0 0 20 20">
              <path d="M12 5l-5 5 5 5" stroke="#000" strokeWidth="2" fill="none"></path>
            </svg>
          </button>

          {/* SINGLE THUMB LIST */}
          <div className="thumb-list" ref={thumbListRef}>
            {galleryImages.map((imgUrl, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show image ${index + 1} of ${title}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
              >
                <img src={imgUrl} alt="" className={activeIndex === index ? 'active' : ''} />
              </button>
            ))}
          </div>

          {/* MOBILE RIGHT ARROW */}
          <button
            className="arrow-right"
            type="button"
            onClick={handleNext}
            aria-label="Next Image"
          >
            <svg viewBox="0 0 20 20">
              <path d="M8 5l5 5-5 5" stroke="#000" strokeWidth="2" fill="none"></path>
            </svg>
          </button>
        </div>

        {/* DESKTOP DOWN ARROW (HIDDEN ON MOBILE) */}
        <button
          className="thumb-arrow down"
          type="button"
          onClick={handleNext}
          aria-label="Next Image"
        >
          <svg viewBox="0 0 20 20">
            <path d="M5 8l5 5 5-5" stroke="#000" strokeWidth="2" fill="none"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
