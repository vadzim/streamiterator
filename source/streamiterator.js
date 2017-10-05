// @flow

import idx from "idx"
import type { Readable } from "stream"
import callbackToIterator from "@vadzim/callback-to-iterator"

function createStreamIterator<D>(stream: Readable): AsyncIterable<D> {
	stream.pause()

	const emitError = error => {
		// Flush stream buffer. This is hacky, but I don't know a better way right now.
		const buffer: Array<D> = (idx(stream, (_: any) => _._readableState.buffer): any)
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
	if (typeof (stream: any)[(Symbol: any).asyncIterator] === "function") {
		return (stream: any)
	} else {
		return createStreamIterator(stream)
	}
}

Object.assign(streamiterator, { createStreamIterator })
