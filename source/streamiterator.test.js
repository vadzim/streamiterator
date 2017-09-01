import streamiterator from "./streamiterator"
import { PassThrough, Readable } from "stream"

test("for await loop | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	stream.write(1)
	stream.write(new Promise(resolve => setTimeout(() => resolve(2), 50)))
	stream.write(3)
	setTimeout(() => {
		stream.write(4)
		stream.write(5)
		stream.write(6)
		stream.end()
	}, 100)
	let count = 0
	for await (const data of streamiterator(stream)) {
		++count
		expect(data).toBe(count)
		expect(data).toBeLessThan(7)
	}
	expect(count).toBe(6)
})

test("for await loop | stream.push", async () => {
	const stream = new Readable({
		objectMode: true,
		read() {
			this._count |= 0
			this.push(++this._count)
			const data = ++this._count
			this.push(new Promise(resolve => setTimeout(() => resolve(data), 50)))
			this.push(++this._count)
			if (this._count > 5) {
				this.push(null)
			}
		},
	})
	let count = 0
	for await (const data of streamiterator(stream)) {
		++count
		expect(data).toBe(count)
		expect(data).toBeLessThan(7)
	}
	expect(count).toBe(6)
})

test("throwing in a loop emitted errors | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	stream.write(1)
	stream.write(new Promise(resolve => setTimeout(() => resolve(2), 50)))
	stream.write(3)
	setTimeout(() => {
		stream.write(4)
		stream.write(5)
		stream.write(6)
		stream.emit("error", 13)
		stream.write(7)
	}, 100)
	let error
	let count = 0
	try {
		for await (const data of streamiterator(stream)) {
			++count
			expect(data).toBe(count)
			expect(data).toBeLessThan(7)
		}
	} catch (e) {
		error = e
	}
	expect(error).toBe(13)
	expect(count).toBe(6)
})

test("throwing in a loop emitted errors | stream.push", async () => {
	const stream = new Readable({
		objectMode: true,
		read() {
			this._count |= 0
			this.push(++this._count)
			const data = ++this._count
			this.push(new Promise(resolve => setTimeout(() => resolve(data), 50)))
			this.push(++this._count)
			if (this._count > 5) {
				stream.emit("error", 13)
			}
		},
	})
	let error
	let count = 0
	try {
		for await (const data of streamiterator(stream)) {
			++count
			expect(data).toBe(count)
			expect(data).toBeLessThan(7)
		}
	} catch (e) {
		error = e
	}
	expect(error).toBe(13)
	expect(count).toBe(6)
})

test("reading ahead | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	setTimeout(() => {
		stream.write(1)
		stream.write(2)
		stream.write(3)
		stream.end()
	}, 100)
	const iterator = streamiterator(stream)
	const i1 = iterator.next()
	const i2 = iterator.next()
	const i3 = iterator.next()
	const i4 = iterator.next()
	const i5 = iterator.next()
	expect(await i1).toEqual({ value: 1, done: false })
	expect(await i2).toEqual({ value: 2, done: false })
	expect(await i3).toEqual({ value: 3, done: false })
	expect(await i4).toEqual({ value: undefined, done: true })
	expect(await i5).toEqual({ value: undefined, done: true })
})

test("reading ahead | stream.push", async () => {
	const stream = new Readable({
		objectMode: true,
		highWaterMark: 1,
		read() {
			this._count |= 0
			this.push(++this._count)
			if (this._count >= 3) {
				this.push(null)
			}
		},
	})
	const iterator = streamiterator(stream)
	const i1 = iterator.next()
	const i2 = iterator.next()
	const i3 = iterator.next()
	const i4 = iterator.next()
	const i5 = iterator.next()
	expect(await i1).toEqual({ value: 1, done: false })
	expect(await i2).toEqual({ value: 2, done: false })
	expect(await i3).toEqual({ value: 3, done: false })
	expect(await i4).toEqual({ value: undefined, done: true })
	expect(await i5).toEqual({ value: undefined, done: true })
})

test("returning ahead | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	setTimeout(() => {
		stream.write(1)
		stream.write(2)
		stream.write(3)
		stream.write(4)
		// unfinished stream
	}, 100)
	let closed = false
	stream.on("close", () => {
		closed = true
	})
	const iterator = streamiterator(stream)
	const i1 = iterator.next()
	const i2 = iterator.next()
	const i3 = iterator.return(42)
	const i4 = iterator.next()
	const i5 = iterator.next()
	expect(await i1).toEqual({ value: 1, done: false })
	expect(await i2).toEqual({ value: 2, done: false })
	expect(await i3).toEqual({ value: 42, done: true })
	expect(closed).toBe(true)
	expect(await i4).toEqual({ value: undefined, done: true })
	expect(await i5).toEqual({ value: undefined, done: true })
})

test("returning ahead | stream.push", async () => {
	let closed = false
	const stream = new Readable({
		objectMode: true,
		highWaterMark: 1,
		read() {
			this._count |= 0
			this.push(++this._count)
		},
		destroy(error, callback) {
			closed = true
			callback()
		},
	})
	const iterator = streamiterator(stream)
	const i1 = iterator.next()
	const i2 = iterator.next()
	const i3 = iterator.return(42)
	const i4 = iterator.next()
	const i5 = iterator.next()
	expect(await i1).toEqual({ value: 1, done: false })
	expect(await i2).toEqual({ value: 2, done: false })
	expect(await i3).toEqual({ value: 42, done: true })
	expect(closed).toBe(true)
	expect(await i4).toEqual({ value: undefined, done: true })
	expect(await i5).toEqual({ value: undefined, done: true })
})

test("throwing ahead | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	setTimeout(() => {
		stream.write(1)
		stream.write(2)
		stream.write(3)
		stream.write(4)
		// unfinished stream
	}, 100)
	let closed = false
	stream.on("close", () => {
		closed = true
	})
	const onerror = new Promise(resolve => stream.on("error", resolve))
	const iterator = streamiterator(stream)
	const i1 = iterator.next()
	const i2 = iterator.next()
	const i3 = iterator.throw(13)
	const i4 = iterator.next()
	const i5 = iterator.next()
	expect(await i1).toEqual({ value: 1, done: false })
	expect(await i2).toEqual({ value: 2, done: false })
	expect(await i3.then(result => ({ result }), error => error)).toBe(13)
	expect(closed).toBe(true)
	expect(await i4).toEqual({ value: undefined, done: true })
	expect(await i5).toEqual({ value: undefined, done: true })
	expect(await onerror).toBe(13)
})

test("closing stream on loop break | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	setTimeout(() => {
		stream.write(1)
		stream.write(2)
		stream.write(3)
		// unfinished stream
	}, 100)
	let count = 0
	let closed = false
	stream.on("close", () => {
		closed = true
	})
	for await (const data of streamiterator(stream)) {
		++count
		expect(data).toBe(1)
		break
	}
	expect(count).toBe(1)
	expect(closed).toBe(true)
})

test("closing stream on throwing in a loop | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	setTimeout(() => {
		stream.write(1)
		stream.write(2)
		stream.write(3)
		// unfinished stream
	}, 100)
	let count = 0
	let closed = false
	stream.on("close", () => {
		closed = true
	})
	let error
	try {
		for await (const data of streamiterator(stream)) {
			++count
			expect(data).toBe(1)
			throw 13
		}
	} catch (e) {
		error = e
	}
	expect(count).toBe(1)
	expect(error).toBe(13)
	expect(closed).toBe(true)
})

test("reading buffered data after emitting error | stream.write", async () => {
	const stream = new PassThrough({ objectMode: true })
	process.nextTick(async () => {
		await new Promise(resolve => setTimeout(resolve, 20))
		stream.write(1)
		await new Promise(resolve => setTimeout(resolve, 20))
		stream.write(2)
		await new Promise(resolve => setTimeout(resolve, 20))
		stream.write(3)
		await new Promise(resolve => setTimeout(resolve, 20))
		stream.emit("error", 13)
	})
	let count = 0
	let error
	try {
		for await (const data of streamiterator(stream)) {
			if (count === 0) {
				await new Promise(resolve => setTimeout(resolve, 100))
			}
			++count
			expect(data).toBe(count)
			expect(data).toBeLessThan(4)
		}
	} catch (e) {
		error = e
	}
	expect(count).toBe(3)
	expect(error).toBe(13)
})
