export async function* streamiterator<T>(stream: Iterable<PromiseLike<T> | T>): AsyncIterable<T>
export async function* streamiterator<T>(stream: AsyncIterable<T>): AsyncIterable<T>

export async function* streamiterator(stream: PromiseLike<Body>): AsyncIterable<string | Buffer | Uint8Array>
export async function* streamiterator(stream: Body): AsyncIterable<string | Buffer | Uint8Array>

export async function* streamiterator(stream: Blob): AsyncIterable<string | Buffer | Uint8Array>
export async function* streamiterator<T>(stream: ReadableStream<T>): AsyncIterable<T>
export async function* streamiterator<T>(stream: ReadableStreamDefaultReader<T>): AsyncIterable<T>
