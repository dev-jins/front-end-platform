import type { z } from "zod";

import type { nativeEventSchema } from "../schemas/native-event.schema";

export type NativeEvent = z.infer<typeof nativeEventSchema>;
