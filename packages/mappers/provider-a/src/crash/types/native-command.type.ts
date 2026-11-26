/** A canonical command translated to Provider A: path under `/game/{sessionKey}/crash/` and its JSON body. */
export interface NativeCommand {
    path: "bet" | "cancelBet" | "push";
    body: Record<string, string>;
}
