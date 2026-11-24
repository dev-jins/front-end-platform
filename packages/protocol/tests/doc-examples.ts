import { readFileSync } from "node:fs";
import { join } from "node:path";

// import.meta.dirname, not import.meta.url: under jsdom the module URL is not a file: URL.
const DOC = join(import.meta.dirname, "../../../docs/Test Game Front API.md");

/**
 * JSON examples under a doc heading, in document order. Schema description blocks (with `//` comments)
 * are not valid JSON and are skipped, so only real payload examples are returned.
 */
export function docExamples(heading: string): unknown[] {
    const examples: unknown[] = [];
    let current = "";
    let block: string[] | null = null;

    for (const line of readFileSync(DOC, "utf8").split("\n")) {
        if (block) {
            if (line.startsWith("```")) {
                try {
                    if (current === heading) examples.push(JSON.parse(block.join("\n")));
                } catch {
                    // schema description, not an example
                }
                block = null;
            } else {
                block.push(line);
            }
        } else if (line.startsWith("```json")) {
            block = [];
        } else if (line.startsWith("#")) {
            current = line.replace(/^#+\s*/, "");
        }
    }

    if (examples.length === 0) throw new Error(`No JSON examples under "${heading}" — did the doc change?`);
    return examples;
}

export const clone = <T>(value: T): T => structuredClone(value);
