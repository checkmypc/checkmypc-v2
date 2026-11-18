import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { DataBanner } from "@/components/data-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { getPublicAppearance } from "@/lib/api";
import { useBuild } from "@/lib/store";
import { useOps } from "@/lib/ops";
import appCss from "../styles.css?url";

const APP_NAME = "CHECKMYPC";

function HydrateBuild() {
  const hydrate = useBuild((s) => s.hydrate);
  useEffect(() => {
    hydrate();
    const on = () => hydrate();
    window.addEventListener("cmp:build", on);
    return () => window.removeEventListener("cmp:build", on);
  }, [hydrate]);
  return null;
}

function HydrateOps() {
  const hydrate = useOps((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

function AppChrome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <DataBanner />}
      {!isAdmin && <SiteHeader />}
      {isAdmin ? (
        <Outlet />
      ) : (
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      )}
      {!isAdmin && <SiteFooter />}
    </>
  );
}

export const Route = createRootRoute({
  loader: () => getPublicAppearance(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "CHECKMYPC.MA — Moroccan PC price comparison, builder, used inspection, assembly and cleaning. Check before you buy.",
      },
      { name: "theme-color", content: loaderData === "dark" ? "#000000" : "#f5f5f7" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  const appearance = Route.useLoaderData();
  const theme = appearance === "light" ? "light" : "dark";
  return (
    <html
      lang="en"
      className={`${theme === "dark" ? "dark " : ""}antialiased`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.removeItem("cmp.theme.v1");var l=localStorage.getItem("cmp.lang.v1");if(l==="en"||l==="fr"||l==="ar"){document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <I18nProvider initialTheme={theme}>
            <HydrateBuild />
            <HydrateOps />
            <AppChrome />
            <AppToaster />
          </I18nProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppToaster() {
  const { theme } = useI18n();
  return <Toaster theme={theme} position="bottom-center" />;
}
