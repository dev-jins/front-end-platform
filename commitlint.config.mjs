export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [2, "always", ["feat", "fix", "chore", "docs", "refactor", "style", "ci", "perf", "test"]],
        "scope-enum": [
            2,
            "always",
            [
                "lobby",
                "gameone",
                "crashone",
                "protocol",
                "game-core",
                "hud",
                "renderer",
                "lobby-kit",
                "i18n",
                "mapper-provider-a",
                "workspace",
                "deps",
            ],
        ],
        "subject-max-length": [2, "always", 64],
    },
};
