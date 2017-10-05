// @flow

class EndOfData {}
const endOfData = new EndOfData()

function noop() {}

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
			// do not leave rejected promise unhandled on top of the event loop
			if (data instanceof Promise) {
				data.catch(noop)
			}
			results.push(data)
			pause && pause()
		}
	}

	subscribe(onData, () => onData(endOfData), error => onData(Promise.reject(error)))

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
