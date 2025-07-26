/**
 * Optimized Image Component with Lazy Loading
 * Performance-optimized image loading for SOP media content on tablets
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { offlineStorage } from '@/lib/offline-storage';
import { performanceMonitor } from '@/lib/performance-monitor';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  quality?: number;
  // SOP-specific props
  sopId?: string;
  mediaId?: string;
  critical?: boolean;
  // Lazy loading props
  lazy?: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  sopId,
  mediaId,
  critical = false,
  lazy = true,
  rootMargin = '50px',
  threshold = 0.1,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy || priority);
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, isVisible, rootMargin, threshold]);

  // Check for cached/offline image
  useEffect(() => {
    if (!isVisible) return;

    const loadImage = async () => {
      setLoadStartTime(Date.now());

      try {
        // Try to load from offline cache first
        if (mediaId) {
          const cachedBlob = await offlineStorage.getCachedMedia(src);
          if (cachedBlob) {
            const cachedUrl = URL.createObjectURL(cachedBlob);
            setImageSrc(cachedUrl);
            
            // Track offline image load performance
            performanceMonitor.trackUserInteraction('image-offline-load', {
              sopId,
              mediaId,
              src,
              loadTime: Date.now() - loadStartTime,
            });
            
            return;
          }
        }

        // If online and not cached, use original src
        if (navigator.onLine) {
          setImageSrc(src);
          
          // Cache the image for offline use
          if (mediaId && (critical || sopId)) {
            cacheImageForOffline(src, mediaId);
          }
        } else {
          // Offline and no cache - show error state
          setIsError(true);
        }
      } catch (error) {
        console.error('[OptimizedImage] Failed to load image:', error);
        setIsError(true);
      }
    };

    loadImage();
  }, [isVisible, src, mediaId, sopId, critical, loadStartTime]);

  const cacheImageForOffline = async (imageUrl: string, id: string) => {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        
        // Cache for 30 days (longer for critical images)
        const expirationDays = critical ? 90 : 30;
        await offlineStorage.cacheMedia(imageUrl, blob, mimeType, expirationDays);
        
        console.log(`[OptimizedImage] Cached image for offline: ${id}`);
      }
    } catch (error) {
      console.error('[OptimizedImage] Failed to cache image:', error);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    
    // Track image load performance
    const loadTime = Date.now() - loadStartTime;
    performanceMonitor.trackUserInteraction('image-load', {
      sopId,
      mediaId,
      src,
      loadTime,
      cached: imageSrc !== src,
    });
    
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    
    // Track image load errors
    performanceMonitor.trackUserInteraction('image-error', {
      sopId,
      mediaId,
      src,
      isOffline: !navigator.onLine,
    });
    
    onError?.();
  };

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <div
      className={cn(
        'bg-gray-200 animate-pulse flex items-center justify-center',
        className
      )}
      style={{ width, height }}
    >
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );

  // Error placeholder
  const ErrorPlaceholder = () => (
    <div
      className={cn(
        'bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-col text-gray-400',
        className
      )}
      style={{ width, height }}
    >
      <svg
        className="w-8 h-8 mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <div className="text-xs text-center">
        {navigator.onLine ? 'Failed to load' : 'Not available offline'}
      </div>
    </div>
  );

  // Offline placeholder for non-critical images
  const OfflinePlaceholder = () => (
    <div
      className={cn(
        'bg-gray-50 border border-gray-200 flex items-center justify-center flex-col text-gray-500',
        className
      )}
      style={{ width, height }}
    >
      <svg
        className="w-6 h-6 mb-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="text-xs">Offline</div>
    </div>
  );

  if (isError) {
    return !navigator.onLine && !critical ? <OfflinePlaceholder /> : <ErrorPlaceholder />;
  }

  if (!isVisible) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-gray-100', className)}
        style={{ width, height }}
      />
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {!isLoaded && <LoadingPlaceholder />}
      
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}

// SOP-specific image gallery component
interface SOPImageGalleryProps {
  images: Array<{
    id: string;
    url: string;
    alt: string;
    caption?: string;
  }>;
  sopId: string;
  className?: string;
}

export function SOPImageGallery({ images, sopId, className }: SOPImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (!images?.length) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main gallery grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => setSelectedImage(index)}
          >
            <OptimizedImage
              src={image.url}
              alt={image.alt}
              width={300}
              height={200}
              className="rounded-lg group-hover:scale-105 transition-transform duration-200"
              sopId={sopId}
              mediaId={image.id}
              critical={index < 2} // First 2 images are critical
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            
            {/* Caption */}
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-lg">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen modal */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <OptimizedImage
              src={images[selectedImage].url}
              alt={images[selectedImage].alt}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
              sopId={sopId}
              mediaId={images[selectedImage].id}
              critical={true}
              priority={true}
              lazy={false}
            />
            
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            
            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => 
                      prev === 0 ? images.length - 1 : prev! - 1
                    );
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => 
                      prev === images.length - 1 ? 0 : prev! + 1
                    );
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}
            
            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
              {selectedImage + 1} / {images.length}
            </div>
            
            {/* Caption */}
            {images[selectedImage].caption && (
              <div className="absolute bottom-16 left-4 right-4 text-white bg-black bg-opacity-70 p-3 rounded-lg text-center">
                {images[selectedImage].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}