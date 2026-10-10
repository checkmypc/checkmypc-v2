import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!id || !/^media_[a-z0-9]+$/i.test(id)) {
          return new Response("Not found", { status: 404 });
        }
        const { getMedia } = await import("@/lib/server/repo");
        const file = await getMedia(id);
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(file.bytes), {
          headers: {
            "content-type": file.contentType,
            "content-disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
