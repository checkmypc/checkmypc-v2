import { useEffect, useState } from "react";
import { categoryImage, loadProductImageManifest, productGallery } from "@/lib/catalog";
import type { Product } from "@/lib/types";

type ProductImageProps = {
  product: Product;
  className: string;
  loading?: "eager" | "lazy";
};

export function ProductImage({ product, className, loading = "lazy" }: ProductImageProps) {
  const [manifest, setManifest] = useState<Awaited<ReturnType<typeof loadProductImageManifest>>>();
  const [imageIndex, setImageIndex] = useState(0);
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const images = productGallery(product, manifest);

  useEffect(() => {
    let active = true;
    setImageIndex(0);
    setManifestLoaded(false);
    void loadProductImageManifest()
      .then((loadedManifest) => {
        if (active) {
          setManifest(loadedManifest);
          setManifestLoaded(true);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load product image manifest", error);
        if (active) setManifestLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  if (images.length === 0) {
    if (!manifestLoaded) {
      return (
        <span
          className={`product-image-loading ${className}`}
          role="img"
          aria-label={`${product.name} photo loading`}
          aria-busy="true"
        />
      );
    }
    return <FallbackImage product={product} className={className} />;
  }

  if (imageIndex >= images.length) {
    return <FallbackImage product={product} className={className} loading={loading} />;
  }

  return (
    <img
      src={images[imageIndex]}
      alt={product.name}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setImageIndex((index) => index + 1)}
    />
  );
}

function FallbackImage({
  product,
  className,
  loading = "lazy",
}: ProductImageProps) {
  return (
    <img
      src={categoryImage(product.category)}
      alt={`${product.name} — product photo unavailable`}
      className={`${className} rounded-xl bg-surface-2 p-2 opacity-70`}
      loading={loading}
      decoding="async"
    />
  );
}
