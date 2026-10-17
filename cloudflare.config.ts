import { defineConfig } from "cf/config";
import process from "node:process";

export default defineConfig(({ mode }) => {
  if (mode !== undefined && mode !== "production" && mode !== "preview") {
    throw new Error(`Unsupported deployment mode: ${mode}`);
  }
  const isPreview = mode === "preview";
  const previewNumber = process.env.CLOUDFLARE_PREVIEW_NUMBER;
  if (isPreview && !/^[1-9]\d*$/.test(previewNumber ?? "")) {
    throw new Error("Preview builds require a valid CLOUDFLARE_PREVIEW_NUMBER");
  }

  return {
    worker: {
      name: isPreview
        ? `yadokani389-net-preview-${previewNumber}`
        : "yadokani389-net",
      compatibilityDate: "2026-01-20",
      assets: { notFoundHandling: "404-page" },
      workersDev: true,
      domains: isPreview ? [] : ["yadokani389.net", "www.yadokani389.net"],
    },
  };
});
