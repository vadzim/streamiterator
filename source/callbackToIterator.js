// @flow

class EndOfData {}
const endOfData = new EndOfData()

function noop() {}

export default function callbackToIterator<D>({
	resume,
	pause,
	destroy,
}: {|
	resume?: () => void,
	pause?: () => void,
	destroy?: () => ?Promise<mixed>,
|}): {|
	iterable: AsyncIterable<D>,
	emitData: (data: D) => void,
	emitEnd: () => void,
	emitError: (error: mixed) => void,
|} {
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

	return {
		iterable: (async function*() {
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
		})(),
		emitData: onData,
		emitEnd: () => onData(endOfData),
		emitError: error => onData(Promise.reject(error)),
	}
}
