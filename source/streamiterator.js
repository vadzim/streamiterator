// @flow

import idx from "idx"
import type { Readable } from "stream"
import callbackToIterator from "./callbackToIterator"

function createStreamIterator<D>(stream: Readable): AsyncIterable<D> {
	let events
	stream.pause()

	return callbackToIterator({
		subscribe(onData, onEnd, onError) {
			events = {
				data: onData,
				end: onEnd,
				error: error => {
					// Flush stream buffer. This is hacky, but I don't know a better way right now.
					const buffer: Array<D> = (idx((stream: any), _ => _._readableState.buffer): any)
					if (buffer) {
						while (buffer.length > 0) {
							onData(buffer.shift())
						}
					}
					onError(error)
				},
			}
			stream.addListener("data", events.data)
			stream.addListener("end", events.end)
			stream.addListener("error", events.error)
		},
		destroy() {
			stream.removeListener("data", events.data)
			stream.removeListener("end", events.end)
			stream.removeListener("error", events.error)
			if (typeof stream.destroy === "function") {
				return new Promise(resolve => (stream: any).destroy(null, resolve))
			}
		},
		pause() {
			stream.pause()
		},
		resume() {
			stream.resume()
		},
	})
}

export default function streamiterator<D>(stream: Readable): AsyncIterable<D> {
	if (typeof (stream: any)[(Symbol: any).asyncIterator] === "function") {
		return (stream: any)
	} else {
		return createStreamIterator(stream)
	}
}

Object.assign(streamiterator, { createStreamIterator })
