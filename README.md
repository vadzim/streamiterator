# streamiterator

Turns browser streams into asynchronous iterator. This works with `fetch` responses, `fetch` body, files, blobs, readable streams.
For compatibility reasons works with `node-fetch` too.

```js
import { streamiterator } from "streamiterator"
import split from "split"

async function DoIt() {
	for await (const chunk of streamiterator(fetch('https://api/data'))) {
		console.log('Read chunk:', chunk)
	}
}

// or in more verbose but more explicit way:

async function DoIt() {
	const response = await fetch('https://api/data')
	for await (const chunk of streamiterator(response.body.getReader())) {
		console.log('Read chunk:', chunk)
	}
}
```
