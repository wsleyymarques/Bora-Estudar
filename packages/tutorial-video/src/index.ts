// packages/tutorial-video/src/index.ts
import { registerRoot } from "remotion";
import { RecipeVideoRoot } from "./compositions/RecipeVideo";

// Register the root component for Remotion
registerRoot(RecipeVideoRoot);

export { RecipeVideoRoot } from "./compositions/RecipeVideo";
export * from "./components";
// Note: recipe-loader is server-only (for Lambda rendering), not included in browser bundle