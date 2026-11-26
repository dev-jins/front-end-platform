import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: ["**/dist", "**/out-tsc", "**/vite.config.*.timestamp*", "**/vitest.config.*.timestamp*"],
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
                    depConstraints: [
                        // Dependencies point down only (docs/frontend-architecture.html §2).
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: [
                                "type:ui",
                                "type:renderer",
                                "type:core",
                                "type:protocol",
                                "type:mapper",
                                "type:util",
                            ],
                        },
                        {
                            sourceTag: "type:ui",
                            onlyDependOnLibsWithTags: ["type:ui", "type:core", "type:protocol", "type:util"],
                        },
                        {
                            sourceTag: "type:renderer",
                            onlyDependOnLibsWithTags: ["type:core", "type:protocol", "type:util"],
                        },
                        { sourceTag: "type:core", onlyDependOnLibsWithTags: ["type:protocol", "type:util"] },
                        { sourceTag: "type:protocol", onlyDependOnLibsWithTags: [] },
                        // Provider mappers translate one provider's API into the protocol; only apps pick them.
                        { sourceTag: "type:mapper", onlyDependOnLibsWithTags: ["type:protocol"] },
                        { sourceTag: "type:util", onlyDependOnLibsWithTags: [] },
                    ],
                },
            ],
        },
    },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts", "**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
        // Override or add rules here
        rules: {},
    },
];
