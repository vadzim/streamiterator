export async function* streamiterator(stream) {
	const resolved = await stream

	const reader = getStream(resolved) || getStream(resolved?.body)

	if (!reader) {
		throw new TypeError("argument is not a ReadableStream")
	} else if (typeof reader[Symbol.iterator] === "function") {
		// do not use async iteration over sync iterator
		// https://github.com/tc39/ecma262/issues/1849
		for (const chunk of reader) yield chunk
	} else if (typeof reader[Symbol.asyncIterator] === "function") {
		yield* reader
	} else if (typeof reader.read === "function") {
		let value
		let done
		try {
			// eslint-disable-next-line no-sequences
			for (; (done = true), ({ value, done } = await reader.read()), !done; ) yield value
		} finally {
			if (!done) await reader.cancel?.()
		}
	} else {
		throw new TypeError("argument is not a ReadableStream")
	}
}

const getStream = value => {
	if (!value) {
		return undefined
	}
	if (isReadable(value)) {
		return value
	}
	if (typeof value.getReader === "function") {
		return value.getReader()
	}
	if (typeof value.stream === "function") {
		return value.stream()
	}
	return undefined
}

const isReadable = value =>
	typeof value[Symbol.iterator] === "function" ||
	typeof value[Symbol.asyncIterator] === "function" ||
	typeof value.read === "function"
