import { useEffect, useState } from "react";
import { categoryImage, loadProductImageManifest, productGallery } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function ProductGallery({ product }: { product: Product }) {
  const { t } = useI18n();
  const [manifest, setManifest] = useState<Awaited<ReturnType<typeof loadProductImageManifest>>>();
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [selectedImage, setSelectedImage] = useState<string>();
  const candidates = productGallery(product, manifest);
  const images = candidates.filter((image) => !failedImages.has(image));
  const activeImage = images.includes(selectedImage ?? "") ? selectedImage : images[0];

  useEffect(() => {
    let active = true;
    setManifestLoaded(false);
    setFailedImages(new Set());
    setSelectedImage(undefined);
    void loadProductImageManifest()
      .then((loadedManifest) => {
        if (active) setManifest(loadedManifest);
        if (active) setManifestLoaded(true);
      })
      .catch((error: unknown) => {
        console.error("Unable to load product image manifest", error);
        if (active) setManifestLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  function markFailed(image: string) {
    setFailedImages((failed) => new Set(failed).add(image));
    setSelectedImage((selected) => (selected === image ? undefined : selected));
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        {activeImage ? (
          <img
            key={activeImage}
            src={activeImage}
            alt={product.name}
            className="product-gallery-image"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => markFailed(activeImage)}
          />
        ) : !manifestLoaded ? (
          <div className="product-gallery-loading" role="status" aria-busy="true" />
        ) : (
          <div className="product-gallery-fallback" role="img" aria-label={`${product.name} — ${t("ui.photoUnavailable")}`}>
            <img src={categoryImage(product.category)} alt="" aria-hidden="true" />
            <span>{t("ui.photoUnavailable")}</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="product-gallery-thumbnails" role="group" aria-label={t("ui.productPhotos")}>
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              className={`product-gallery-thumbnail ${image === activeImage ? "is-selected" : ""}`}
              aria-label={`${product.name}: ${t("ui.viewPhoto")} ${index + 1}`}
              aria-pressed={image === activeImage}
              onClick={() => setSelectedImage(image)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  const next = images[(index + 1) % images.length];
                  setSelectedImage(next);
                  event.currentTarget.parentElement?.querySelectorAll("button")[((index + 1) % images.length)]?.focus();
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const previousIndex = (index - 1 + images.length) % images.length;
                  setSelectedImage(images[previousIndex]);
                  event.currentTarget.parentElement?.querySelectorAll("button")[previousIndex]?.focus();
                }
              }}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => markFailed(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
