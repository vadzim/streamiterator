import streamIterator from "./streamiterator"
import { Readable } from "stream"

if (typeof Readable.prototype[Symbol.asyncIterator] !== "function") {
	Object.defineProperty(Readable.prototype, Symbol.asyncIterator, {
		writable: true,
		configurable: true,
		value: function asyncIterator() {
			return streamIterator.createStreamIterator(this)[Symbol.asyncIterator]()
		},
	})
}
