import { Readable } from "stream"
import { streamiterator } from "./streamiterator"

if (typeof Readable.prototype[Symbol.asyncIterator] !== "function") {
	Object.defineProperty(Readable.prototype, Symbol.asyncIterator, {
		writable: true,
		configurable: true,
		value: function asyncIterator() {
			return streamiterator.createStreamIterator(this)[Symbol.asyncIterator]()
		},
	})
}
