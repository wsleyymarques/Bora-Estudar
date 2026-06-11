// packages/tutorial-video/src/remotion-webpack-override.ts
import type { Configuration } from "webpack";

export const webpackOverride = (config: Configuration): Configuration => {
  // Make Node.js modules external for client-side bundle
  config.resolve = {
    ...config.resolve,
    fallback: {
      ...config.resolve?.fallback,
      fs: false,
      path: false,
      url: false,
      crypto: false,
      stream: false,
      util: false,
      assert: false,
      buffer: false,
      process: false,
    },
  };

  // Exclude server-only modules from client bundle
  config.externals = [
    ...(config.externals || []),
    (context: string, request: string, callback: Function) => {
      if (/^node:/.test(request)) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ];

  return config;
};