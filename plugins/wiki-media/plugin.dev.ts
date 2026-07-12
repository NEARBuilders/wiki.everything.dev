import "dotenv/config";
import type { PluginConfigInput } from "every-plugin";
import packageJson from "./package.json" with { type: "json" };
import type Plugin from "./src/index";

export default {
  pluginId: packageJson.name,
  port: Number(process.env.PORT) || 3012,
  config: {
    variables: {
      storageUrl: "https://cdn.wiki.everything.dev",
    },
    secrets: {
      storageApiKey: process.env.WIKI_MEDIA_STORAGE_API_KEY || "dev-key",
    },
  } satisfies PluginConfigInput<typeof Plugin>,
};
