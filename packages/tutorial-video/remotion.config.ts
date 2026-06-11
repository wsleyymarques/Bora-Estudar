import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./src/remotion-webpack-override";

// Override webpack for custom needs (e.g., Node.js module fallbacks)
Config.overrideWebpackConfig(webpackOverride);

// Set the entry point for the Remotion project
Config.setEntryPoint("./src/index.ts");

// Set the public directory for static assets
Config.setPublicDir("./public");