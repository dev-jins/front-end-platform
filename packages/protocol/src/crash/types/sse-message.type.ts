/** One dispatched Server-Sent Events message. `id` is the last id seen on the stream, if any. */
export interface SseMessage {
    id?: string;
    data: string;
}
