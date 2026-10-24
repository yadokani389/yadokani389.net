import { defineConfig } from "cf/config";

export default defineConfig(({ mode, isPreview }) => {
  if (mode !== undefined && mode !== "production" && mode !== "preview") {
    throw new Error(`Unsupported deployment mode: ${mode}`);
  }
  if (mode === "preview" && !isPreview) {
    throw new Error("Preview mode requires CLOUDFLARE_PREVIEW_BUILD=true");
  }
  const isProduction = mode === "production" && !isPreview;

  return {
    worker: {
      name: "yadokani389-net",
      compatibilityDate: "2026-01-20",
      assets: { notFoundHandling: "404-page" },
      workersDev: true,
      previewUrls: true,
      domains: isProduction ? ["yadokani389.net", "www.yadokani389.net"] : [],
    },
  };
});
