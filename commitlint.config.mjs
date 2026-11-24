export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [2, "always", ["feat", "fix", "chore", "docs", "refactor", "style", "ci", "perf", "test"]],
        "scope-enum": [
            2,
            "always",
            ["lobby", "gameone", "protocol", "game-core", "hud", "renderer", "lobby-kit", "i18n", "workspace", "deps"],
        ],
        "subject-max-length": [2, "always", 64],
    },
};
