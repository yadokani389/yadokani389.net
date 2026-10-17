import {
  cleanBuildOutputDir,
  writeAssets,
  writeRootConfig,
  writeWorkerConfig,
} from "@cloudflare/build-output-utils";
import { resolveAndParseConfig } from "@cloudflare/config";
import config from "../cloudflare.config.ts";
import { URL, fileURLToPath } from "node:url";
import { join } from "node:path";
import process from "node:process";

const root = fileURLToPath(new URL("../", import.meta.url));
const context = {
  mode: process.env.CLOUDFLARE_PREVIEW_NUMBER ? "preview" : "production",
  isPreview: false,
};
const result = await resolveAndParseConfig(config, context);
if (!result.success) throw result.error;
const { worker, accountId, complianceRegion } = result.data;
if (!worker) throw new Error("The deployment must define a Worker");

await cleanBuildOutputDir(root);
await writeAssets({ root, sourceDirectory: join(root, "dist") });
await writeWorkerConfig({ root, config: worker });
await writeRootConfig(root, { accountId, complianceRegion }, context);
