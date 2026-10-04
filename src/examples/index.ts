// The IDE's "load example" menu. Examples are discovered from this folder, not
// registered by hand: drop NN_name.cuff (or NN_name/main.cuff + more files) in here
// and it shows up. Menu text lives in labels.json. See discover.ts for the rules.
import labels from "./labels.json";
import { buildExamples, type ExampleProject } from "./discover";

export type { ExampleProject };

// With `import: "default"` + `eager: true` every value is the file's text. The cast keeps this
// independent of how a given Vite version happens to type glob()'s overloads.
const sources = import.meta.glob("./**/*.cuff", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export const EXAMPLES: ExampleProject[] = buildExamples(sources, labels);
