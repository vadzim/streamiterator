import idx from "idx"

if (!Symbol.asyncIterator) {
	Symbol.asyncIterator = Symbol("asyncIterator")
}

const makeValueRecord = value => ({ value, done: false })

// use thenable for storing errors instead of Promise.reject to not leave rejected promise unhandled on top of event loop
const makeError = error => ({ then: (_, reject) => reject(error) })

function createStreamIterator(stream) {
	const resolvers = []
	const results = []
	let inputClosed = false

	function copyResults() {
		while (resolvers.length > 0 && results.length > 0) {
			// results can be cleaned up in a callback created in shutdown()
			resolvers.shift()(results.shift())
		}
		if (inputClosed) {
			while (resolvers.length > 0) {
				resolvers.shift()({ value: undefined, done: true })
			}
		}
	}

	function onData(data) {
		if (!inputClosed) {
			results.push(Promise.resolve(data).then(makeValueRecord))
			copyResults()
			if (resolvers.length === 0) {
				stream.pause()
			}
		}
	}

	function onError(error) {
		if (!inputClosed) {
			stream.pause()
			// Flush stream buffer. This is hacky, but I don't know a better way right now.
			const buffer = idx(stream, _ => _._readableState.buffer)
			if (buffer) {
				for (let data; (data = buffer.shift()), data != null; ) {
					results.push(Promise.resolve(data).then(makeValueRecord))
				}
			}
			results.push(makeError(error))
			close()
			if (typeof stream.destroy === "function") {
				stream.destroy()
			}
		}
	}

	function onEnd() {
		close()
	}

	function close() {
		if (!inputClosed) {
			inputClosed = true
			stream //
				.removeListener("data", onData)
				.removeListener("error", onError)
				.removeListener("end", onEnd)
		}
		copyResults()
	}

	function shutdown(result, onStreamDestroy) {
		return new Promise(resolve => {
			function save() {
				resolve(result)
			}
			function done() {
				results.length = 0
				if (inputClosed || typeof stream.destroy !== "function") {
					close()
					save()
				} else {
					close()
					stream.destroy(null, save)
				}
				onStreamDestroy && onStreamDestroy()
			}
			if (resolvers.length === 0) {
				done()
			} else {
				const last = resolvers.pop()
				resolvers.push(value => {
					last(value)
					done()
				})
			}
		})
	}

	stream //
		.pause()
		.on("data", onData)
		.on("error", onError)
		.on("end", onEnd)

	const result = {
		[Symbol.asyncIterator]: () => result,
		next: () =>
			new Promise(resolve => {
				resolvers.push(resolve)
				copyResults()
				if (resolvers.length > 0) {
					stream.resume()
				}
			}),
		throw: error => shutdown(makeError(error), () => stream.emit("error", error)),
		return: value => shutdown({ value, done: true }),
	}
	return result
}

export default function streamiterator(stream) {
	if (typeof stream[Symbol.asyncIterator] === "function") {
		return stream
	} else {
		return createStreamIterator(stream)
	}
}

Object.assign(streamiterator, { createStreamIterator })
