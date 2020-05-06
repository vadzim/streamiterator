import fetch from "node-fetch"
import http from "http"
import url from "url"
import streamiterator from "./index"

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const collect = async seq => {
	const items = []
	for await (const item of seq) items.push(item)
	return items
}

const makeResponse = items => {
	const data = items[Symbol.iterator]()
	return Promise.resolve({
		body: {
			getReader: () => ({ read: () => Promise.resolve(data.next()), cancel: () => Promise.resolve(data.return()) }),
		},
	})
}

test("works with node-fetch", async () => {
	const server = http
		.createServer(async (request, response) => {
			for (const char of request.url) {
				response.write(char)
				await sleep(20)
			}
			response.end()
		})
		.listen()

	const { address, port } = server.address()

	const link = url.format({ protocol: "http", hostname: address, port })

	try {
		expect(`${await collect(streamiterator(fetch(`${link}/ABCD`)))}`).toBe("/,A,B,C,D")
		expect(`${await collect(streamiterator(await fetch(`${link}/ABCD`)))}`).toBe("/,A,B,C,D")
		expect(`${await collect(streamiterator((await fetch(`${link}/ABCD`)).body))}`).toBe("/,A,B,C,D")

		// can it work?

		// for await (const char of streamiterator(fetch(`${url}/ABCDEFGH`))) {
		// 	expect(`${char}`).toBe("/")
		// 	break
		// }
	} finally {
		server.close()
	}
})

test("works in browser", async () => {
	expect(`${await collect(streamiterator(makeResponse([..."/ABCD"])))}`).toBe("/,A,B,C,D")

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

test("works with iterable", async () => {
	expect(`${await collect(streamiterator("ABCD"))}`).toBe("A,B,C,D")
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
	await expect(collect(streamiterator(42))).rejects.toThrow(TypeError)
})
