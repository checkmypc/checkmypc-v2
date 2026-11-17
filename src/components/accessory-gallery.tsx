import { ChevronLeft, ChevronRight, ImageIcon, ZoomIn, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AccessoryGallery({
  images,
  name,
  compact = false,
}: {
  images: string[];
  name: string;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const activeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const image = images[activeIndex];

  useEffect(() => {
    if (!zoomed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowLeft" && images.length > 1) {
        setIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        setIndex((current) => (current + 1) % images.length);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed, images.length]);

  useEffect(() => {
    if (!zoomed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed]);

  function move(delta: number) {
    if (images.length < 2) return;
    setIndex((current) => (current + delta + images.length) % images.length);
  }

  return (
    <div>
      <div className={`product-gallery-main ${compact ? "accessory-gallery-compact" : ""}`}>
        {image && compact ? (
          <img
            src={image}
            alt={name}
            className="product-gallery-image pointer-events-none transition-opacity duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : image ? (
          <button
            type="button"
            className="absolute inset-0 flex size-full cursor-zoom-in items-center justify-center"
            aria-label={`View ${name} image full screen`}
            onClick={() => setZoomed(true)}
          >
            <img
              key={image}
              src={image}
              alt={name}
              className="product-gallery-image transition-opacity duration-300"
              loading={compact ? "lazy" : "eager"}
              decoding="async"
            />
            <span className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-fg shadow-[var(--shadow-border)]">
              <ZoomIn className="size-4" aria-hidden="true" />
            </span>
          </button>
        ) : (
          <div className="product-gallery-fallback">
            <ImageIcon className="size-8 opacity-50" aria-hidden="true" />
            <span>Product photos coming soon</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="product-gallery-arrow product-gallery-arrow--previous pointer-events-auto z-20"
              aria-label={`Previous photo of ${name}`}
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-5 rtl-flip" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="product-gallery-arrow product-gallery-arrow--next pointer-events-auto z-20"
              aria-label={`Next photo of ${name}`}
              onClick={() => move(1)}
            >
              <ChevronRight className="size-5 rtl-flip" aria-hidden="true" />
            </button>
            <div
              className="product-gallery-dots"
              aria-label={`Photo ${activeIndex + 1} of ${images.length}`}
            >
              {images.map((photo, photoIndex) => (
                <button
                  key={`${photo}-${photoIndex}`}
                  type="button"
                  className={`pointer-events-auto relative z-20 ${photoIndex === activeIndex ? "is-active" : ""}`}
                  aria-label={`View photo ${photoIndex + 1}`}
                  aria-pressed={photoIndex === activeIndex}
                  onClick={() => setIndex(photoIndex)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {!compact && images.length > 1 && (
        <div className="product-gallery-thumbnails" role="group" aria-label={`${name} photos`}>
          {images.map((photo, photoIndex) => (
            <button
              key={`${photo}-${photoIndex}`}
              type="button"
              className={`product-gallery-thumbnail pointer-events-auto ${photoIndex === activeIndex ? "is-selected" : ""}`}
              aria-label={`View photo ${photoIndex + 1} of ${name}`}
              aria-pressed={photoIndex === activeIndex}
              onClick={() => setIndex(photoIndex)}
            >
              <img src={photo} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
      {zoomed && image && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} product image`}
          className="product-gallery-zoom-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setZoomed(false);
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{name}</p>
            <button
              type="button"
              className="product-gallery-zoom-close"
              aria-label="Close full-screen image"
              onClick={() => setZoomed(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="product-gallery-zoom-stage">
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute start-0 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:start-3"
                  aria-label="Previous photo"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft className="size-6 rtl-flip" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="absolute end-0 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:end-3"
                  aria-label="Next photo"
                  onClick={() => move(1)}
                >
                  <ChevronRight className="size-6 rtl-flip" aria-hidden="true" />
                </button>
              </>
            )}
            <img
              key={image}
              src={image}
              alt={name}
              className="product-gallery-zoom-image"
              decoding="async"
            />
          </div>
          {images.length > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto py-2" role="group" aria-label={`${name} photos`}>
              {images.map((photo, photoIndex) => (
                <button
                  key={`${photo}-${photoIndex}`}
                  type="button"
                  className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 p-1 ${
                    photoIndex === activeIndex ? "border-primary" : "border-white/20"
                  }`}
                  aria-label={`View photo ${photoIndex + 1}`}
                  aria-pressed={photoIndex === activeIndex}
                  onClick={() => setIndex(photoIndex)}
                >
                  <img src={photo} alt="" className="size-full object-contain" />
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
