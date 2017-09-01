if (!Symbol.asyncIterator) {
	Symbol.asyncIterator = Symbol("asyncIterator")
}

const makeValueRecord = value => ({ value, done: false })

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
		if (resolvers.length > 0) {
			stream.resume()
		} else {
			if (!inputClosed) {
				stream.pause()
			}
		}
	}

	function onData(data) {
		if (!inputClosed) {
			results.push(Promise.resolve(data).then(makeValueRecord))
		}
		copyResults()
	}

	function onError(error) {
		if (!inputClosed) {
			results.push(Promise.reject(error))
		}
		close()
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

	function shutdown(onSaveResult, onStreamDestroy) {
		// using onSaveResult callback instead of a Promise to not leave rejected promise unhandled on top of event loop
		return new Promise(resolve => {
			function save() {
				onSaveResult(resolve)
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
		.on("data", onData)
		.on("error", onError)
		.on("end", onEnd)
		.pause()

	const result = {
		[Symbol.asyncIterator]: () => result,
		next: () =>
			new Promise(resolve => {
				resolvers.push(resolve)
				copyResults()
			}),
		throw: error => shutdown(resolve => resolve(Promise.reject(error)), () => stream.emit("error", error)),
		return: value => shutdown(resolve => resolve({ value, done: true })),
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
