import callbackToIterator from "@vadzim/callback-to-iterator"
import getAsyncIterable from "@vadzim/get-async-iterable"

export function createStreamIterator(stream) {
	stream.pause()

	const emitError = error => {
		// Flush stream buffer. This is hacky, but I don't know a better way right now.
		// eslint-disable-next-line no-underscore-dangle
		const buffer = stream._readableState?.buffer
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
				return new Promise(resolve => stream.destroy(null, resolve))
			}
			return undefined
		},
	})

	stream.addListener("data", emitData)
	stream.addListener("end", emitEnd)
	stream.addListener("error", emitError)

	return iterable
}

export function streamiterator(stream) {
	return getAsyncIterable(stream) || createStreamIterator(stream)
}
