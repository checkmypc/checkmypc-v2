import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const staticPaths = [
          "/",
          "/builder",
          "/compare",
          "/products",
          "/prebuilts",
          "/used",
          "/inspection",
          "/assembly",
          "/cleaning",
          "/guides",
          "/deals",
          "/search",
          "/contact",
        ];
        let extra: string[] = [];
        try {
          const { loadPublicSnapshot } = await import("@/lib/server/repo");
          const snap = await loadPublicSnapshot();
          extra = [
            ...snap.products.map((p) => `/products/${p.id}`),
            ...snap.recipes.map((r) => `/prebuilts/${r.id}`),
            ...snap.reports.filter((r) => r.published).map((r) => `/reports/${r.publicId || r.id}`),
          ];
        } catch {
          extra = [];
        }
        const urls = [...staticPaths, ...extra]
          .map(
            (path) =>
              `  <url><loc>${origin}${path}</loc><changefreq>daily</changefreq></url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
