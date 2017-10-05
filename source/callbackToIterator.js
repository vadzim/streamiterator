// @flow

// do not leave rejected promise unhandled on top of event loop
const noop = () => {}
const makeError = error => {
	const result = Promise.reject(error)
	result.catch(noop)
	return result
}

class EndOfData {}
const endOfData = new EndOfData()

export default function callbackToIterator<D>({
	subscribe,
	destroy,
	pause,
	resume,
}: {|
	subscribe: (onData: (data: D) => void, onEnd: () => void, onError: (error: mixed) => void) => void,
	destroy?: () => ?Promise<mixed>,
	pause?: () => void,
	resume?: () => void,
|}): AsyncIterable<D> {
	const results = []
	const resolves = []

	const onWaiting = resolveCallback => {
		resolves.push(resolveCallback)
		resume && resume()
	}

	const onData = data => {
		if (resolves.length > 0) {
			resolves.shift()(data)
		} else {
			results.push(data)
			pause && pause()
		}
	}

	subscribe(onData, () => onData(endOfData), error => onData(makeError(error)))

	return (async function*() {
		try {
			while (true) {
				const data = await (results.length > 0 ? results.shift() : new Promise(onWaiting))
				if (data instanceof EndOfData) {
					break
				}
				yield data
			}
		} finally {
			destroy && (await destroy())
		}
	})()
}
