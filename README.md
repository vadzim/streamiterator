# streamiterator
Converts ReadableStream into AsyncIterator.

### Using ###

With this module you can [iterate](https://github.com/tc39/proposal-async-iteration) over a nodejs stream (file, http response, etc) with a plain loop:

```js
import streamiterator from "streamiterator"
import split from "split"

async function DoIt() {
	// iterate over lines in a file
	for await (const line of streamiterator(
		fs.createReadStream("data.txt").pipe(split())
	)) {
		console.log(`Read: ${line}`)
	}
}
```

As of August, 2017 you need smth like either [babel](http://babeljs.io/) or [node.js 8.4.0 or higher](https://nodejs.org/) with `--harmony_async_iteration` switch to be able to use `for await` operator.

A bit of code with iterables can be seen in [tests](https://github.com/vadzim/streamiterator/blob/master/source/streamiterator.test.js).

It's possible to iterate without `for await`, though it is not so nice as using syntactic suger:

```js
import streamIterator from "streamiterator"

async function DoIt(stream) {
	for (
		let done, value, iterator = streamIterator(stream);
		{done, value} = await iterator.next(), !done;
	) {
		console.log(`Read: ${value}`)
	}
}
```

If the stream emits an error, it will be thrown while looping. Wrap your loop in `try..catch` to deal with it.

If eventually streams will support async iteration natively then this module will just redirect iteration to that native mechanism. No overhead will be added.

### Polyfill ###

But if you believe that writing `streamIterator(...)` everywhere is a bullshit, and in your world streams have to be iterable from the scratch right now, then you can import `streamiterator/polyfill` in the root of your project and iterate just on streams:

```js
import "streamiterator/polyfill"
import fs from "fs"

async function DoIt() {
	for await (const data of fs.createReadStream("./data.txt")) {
		console.log(data)
	}
}
```

Note that you don't need to import `streamiterator/polyfill` in every file of your project. Just in the `main.js` or similar.

### Contributing ###

__Please contribute!__
All contributions are greatly appreciated no matter how small or large the contribution is.
Whether it's a small grammar fix in the README, a huge bug fix, or just an issue report, you will be recognized as a 'Contributor' to this project.

Please, feel free to [open an issue](https://github.com/vadzim/streamiterator/issues) or email me to developer@vadzim.info if you have any question.
