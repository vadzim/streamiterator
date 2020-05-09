import nodeFetch from "node-fetch"
import http from "http"
import url from "url"
import streamiterator from "./index"

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const collect = async seq => {
	const items = []
	for await (const item of seq) items.push(item)
	return items
}

const createServer = data =>
	http
		.createServer(async (request, response) => {
			for (const chunk of data) {
				response.write(chunk)
				await sleep(20)
			}
			response.end()
		})
		.listen()

test("works with node-fetch", async () => {
	const server = createServer("ABCD")
	const { address, port } = server.address()
	const link = url.format({ protocol: "http", hostname: address, port })

	try {
		expect(`${await collect(streamiterator(nodeFetch(link)))}`).toBe("A,B,C,D")
		expect(`${await collect(streamiterator(await nodeFetch(link)))}`).toBe("A,B,C,D")
		expect(`${await collect(streamiterator((await nodeFetch(link)).body))}`).toBe("A,B,C,D")

		// can it work?

		// for await (const char of streamiterator(nodeFetch(link))) {
		// 	expect(`${char}`).toBe("A")
		// 	break
		// }
	} finally {
		server.close()
	}
})

const makeReader = items => {
	const data = items[Symbol.iterator]()
	return { read: () => Promise.resolve(data.next()), cancel: () => Promise.resolve(data.return()) }
}

const makeStream = items => ({
	getReader: () => makeReader(items),
})

const makeResponse = items =>
	Promise.resolve({
		body: makeStream(items),
	})

test("works in browser", async () => {
	expect(`${await collect(streamiterator(makeResponse("ABCD")))}`).toBe("A,B,C,D")
	expect(`${await collect(streamiterator(await makeResponse("ABCD")))}`).toBe("A,B,C,D")
	expect(`${await collect(streamiterator((await makeResponse("ABCD")).body))}`).toBe("A,B,C,D")
	expect(`${await collect(streamiterator((await makeResponse("ABCD")).body.getReader()))}`).toBe("A,B,C,D")

	const isNotCalled = jest.fn()
	const isCalledOnce = jest.fn()

	for await (const char of streamiterator(
		makeResponse(
			(function* () {
				try {
					yield "A"
					isNotCalled()
				} finally {
					isCalledOnce()
				}
			})(),
		),
	)) {
		expect(`${char}`).toBe("A")
		break
	}

	expect(isNotCalled).toHaveBeenCalledTimes(0)
	expect(isCalledOnce).toHaveBeenCalledTimes(1)
})

test("works with blob", async () => {
	expect(`${await collect(streamiterator({ stream: () => makeStream("ABCD") }))}`).toBe("A,B,C,D")
})

test("works with iterable", async () => {
	expect(`${await collect(streamiterator([..."ABCD"]))}`).toBe("A,B,C,D")
})

test("works with async iterable", async () => {
	expect(
		`${await collect(
			streamiterator(
				(async function* () {
					yield* "ABCD"
				})(),
			),
		)}`,
	).toBe("A,B,C,D")
})

test("throws on wrong argument", async () => {
	expect.assertions(2)
	await expect(collect(streamiterator(42))).rejects.toThrow(TypeError)
	await expect(collect(streamiterator({ stream: () => 42 }))).rejects.toThrow(TypeError)
})
