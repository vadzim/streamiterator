// @ // flow - still no ?. support in flow

import type { Readable } from "stream"
import callbackToIterator from "@vadzim/callback-to-iterator"
import getAsyncIterable from "@vadzim/get-async-iterable"

function createStreamIterator<D>(stream: Readable): AsyncIterable<D> {
	stream.pause()

	const emitError = error => {
		// Flush stream buffer. This is hacky, but I don't know a better way right now.
		const buffer: D[] = (stream._readableState?.buffer: any)
		if (buffer) {
			while (buffer.length > 0) {
				emitData(buffer.shift())
			}
		}
		onError(error)
	}

	const { iterable, emitData, emitEnd, emitError: onError } = callbackToIterator({
		resume: () => void stream.resume(),
		pause: () => void stream.pause(),
		destroy: () => {
			stream.removeListener("data", emitData)
			stream.removeListener("end", emitEnd)
			stream.removeListener("error", emitError)
			if (typeof stream.destroy === "function") {
				return new Promise(resolve => (stream: any).destroy(null, resolve))
			}
		},
	})

	stream.addListener("data", emitData)
	stream.addListener("end", emitEnd)
	stream.addListener("error", emitError)

	return iterable
}

export default function streamiterator<D>(stream: Readable): AsyncIterable<D> {
	return getAsyncIterable(stream) || createStreamIterator(stream)
}

Object.assign(streamiterator, { createStreamIterator })
