import "./polyfill"
import { PassThrough } from "stream"

test("polyfill", async () => {
	const stream = new PassThrough({ objectMode: true })
	stream.write(1)
	setTimeout(() => {
		stream.write(2)
		stream.end()
	}, 100)
	let i = 0
	for await (const data of stream) {
		++i
		expect(data).toBe(i)
		expect(data).toBeLessThan(3)
	}
})
