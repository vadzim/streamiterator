# streamiterator

Turns browser fetch stream into asynchronous iterator. Works with `node-fetch` also.

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
