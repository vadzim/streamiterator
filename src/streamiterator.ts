export function streamiterator(stream: PromiseLike<Body>): AsyncGenerator<string | Buffer | Uint8Array>
export function streamiterator(stream: Body): AsyncGenerator<string | Buffer | Uint8Array>
export function streamiterator<T>(stream: ReadableStream<T>): AsyncGenerator<T>
export function streamiterator<T>(stream: ReadableStreamDefaultReader<T>): AsyncGenerator<T>
export function streamiterator(stream: Blob): AsyncGenerator<string | Buffer | Uint8Array>
export function streamiterator<T>(stream: AsyncIterable<T>): AsyncGenerator<T>
export function streamiterator<T>(stream: Iterable<PromiseLike<T> | T>): AsyncGenerator<T>

export async function* streamiterator<T = string | Buffer | Uint8Array>(
	stream:
		| PromiseLike<Body>
		| Body
		| ReadableStream<T>
		| ReadableStreamDefaultReader<T>
		| Blob
		| Iterable<PromiseLike<T> | T>
		| AsyncIterable<T>,
): AsyncGenerator<T> {
	const resolved = await stream

	const reader = getStream(resolved) ?? getStream((resolved as Body)?.body)

	if (!reader) {
		throw new TypeError("argument is not a ReadableStream")
	} else if (isIterable<T>(reader)) {
		// do not use async iteration over sync iterator
		// https://github.com/tc39/ecma262/issues/1849
		for (const chunk of reader) yield chunk
	} else if (isAsyncIterable<T>(reader)) {
		for await (const chunk of reader) yield chunk
	} else if (isReader<T>(reader)) {
		let needClose
		try {
			for (;;) {
				needClose = true
				const x = await reader.read()
				if (x.done) break
				needClose = false
				yield x.value
			}
		} finally {
			if (!needClose) await reader.cancel?.()
		}
	} else {
		throw new TypeError("argument is not a ReadableStream")
	}
}

function getStream<T>(value: unknown): Iterable<T> | AsyncIterable<T> | ReadableStreamDefaultReader<T> | undefined {
	if (!value) {
		return undefined
	}
	if (isReadable<T>(value)) {
		return value
	}
	if (isReadableStream<T>(value)) {
		return value.getReader()
	}
	if (isBlob(value)) {
		return value.stream()?.getReader?.()
	}
	return undefined
}

function isIterable<T>(value: unknown): value is Iterable<T> {
	return typeof (value as Iterable<T>)[Symbol.iterator] === "function"
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
}

function isReadableStream<T>(value: unknown): value is ReadableStream<T> {
	return typeof (value as ReadableStream<T>).getReader === "function"
}

function isBlob(value: unknown): value is Blob {
	return typeof (value as Blob).stream === "function"
}

function isReader<T>(value: unknown): value is ReadableStreamDefaultReader<T> {
	return typeof (value as ReadableStreamDefaultReader<T>).read === "function"
}

function isReadable<T>(value: unknown): value is Iterable<T> | AsyncIterable<T> | ReadableStreamDefaultReader<T> {
	return isIterable(value) || isAsyncIterable(value) || isReader(value)
}
