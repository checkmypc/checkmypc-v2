import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadProductImageManifest, productGallery } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { studioFallbackImage, themedImage } from "@/lib/theme-images";
import type { Product } from "@/lib/types";

type ProductImageProps = {
  product: Product;
  className: string;
  loading?: "eager" | "lazy";
  controls?: boolean;
};

export function ProductImage({
  product,
  className,
  loading = "lazy",
  controls = false,
}: ProductImageProps) {
  const { theme } = useI18n();
  const [manifest, setManifest] = useState<Awaited<ReturnType<typeof loadProductImageManifest>>>();
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const images = productGallery(product, manifest)
    .map((image) => themedImage(image, theme))
    .filter((image) => !failedImages.has(image));
  const activeImage = images[imageIndex] ?? images[0];

  useEffect(() => {
    let active = true;
    setImageIndex(0);
    setFailedImages(new Set());
    setManifestLoaded(false);
    void loadProductImageManifest()
      .then((loadedManifest) => {
        if (!active) return;
        setManifest(loadedManifest);
        setManifestLoaded(true);
      })
      .catch((error: unknown) => {
        console.error("Unable to load product image manifest", error);
        if (active) setManifestLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  function move(delta: number) {
    if (images.length < 2) return;
    setImageIndex((index) => (index + delta + images.length) % images.length);
  }

  function handleImageError(image: string, element: HTMLImageElement) {
    const current = element.getAttribute("src") ?? image;
    const fallback = studioFallbackImage(current);
    if (fallback !== current) {
      element.src = fallback;
      return;
    }
    setFailedImages((failed) => new Set(failed).add(current));
    setImageIndex(0);
  }

  function imageContent() {
    if (!manifestLoaded) {
      return (
        <span className={`product-image-loading ${className}`} role="status" aria-busy="true" />
      );
    }
    if (!activeImage) {
      return (
        <span
          className={`product-photo-placeholder ${className}`}
          role="img"
          aria-label={`${product.name} photo unavailable`}
        >
          {product.brand}
        </span>
      );
    }
    return (
      <img
        key={activeImage}
        src={activeImage}
        alt={product.name}
        className={className}
        loading={loading}
        decoding="async"
        onError={(event) => handleImageError(activeImage, event.currentTarget)}
      />
    );
  }

  if (!controls) return imageContent();

  return (
    <span
      className="product-image-carousel"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start !== null && end !== undefined && Math.abs(end - start) > 40) {
          move(end < start ? 1 : -1);
        }
      }}
    >
      <Link
        to="/products/$id"
        params={{ id: product.id }}
        className="absolute inset-0"
        aria-label={`${product.name} details`}
      >
        {imageContent()}
      </Link>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="product-image-arrow product-image-arrow--previous"
            aria-label={`Previous photo of ${product.name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              move(-1);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="product-image-arrow product-image-arrow--next"
            aria-label={`Next photo of ${product.name}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              move(1);
            }}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span
            className="product-image-dots"
            aria-label={`Photo ${imageIndex + 1} of ${images.length}`}
          >
            {images.map((image, index) => (
              <span key={image} className={index === imageIndex ? "is-active" : ""} />
            ))}
          </span>
        </>
      )}
    </span>
  );
}
