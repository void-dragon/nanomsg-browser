# nanomsg-browser

This library is a convenient wrapper around a standart websocket, for
easier connection with nanomsg sockets.

Supported and testes are the following client side protocols:

+ REQ
+ PAIR
+ SUB

## install

Install via command line.

```sh
npm install nanomsg-browser
```

And include the module in your html.

```html
<script src="node_modules/nanomsg-browser/dist/nanomsg.js" charset="utf-8"></script>
```

## configurataion
```html
<script type="text/javascript">
  // Milliseconds between reconnects.
  nanomsg.reconnectTime = 10 * 1000;
  // Show some debug logging in the console.
  nanomsg.debug = true;
</script>
```

## Examples

### Subscription

```js
const sub = new nanomsg.Socket(nanomsg.SUB);
sub.connect('ws://myhost:8080/');
sub.on('data', (msg) => {
  console.log('got =>', msg);
});
```

### Req/Rep

```js
const req = new nanomsg.Socket(nanomsg.REQ);
req.connect('ws://myhost:8080');
req.on('data', (msg) => {
  console.log('got =>', msg);
});

req.send('some cool msg');
```

### Pair

```js
const pair = new nanomsg.Socket(nanomsg.PAIR);
pair.connect('ws://myhost:8080');
pair.on('data', (msg) => {
  console.log('got =>', msg);
});

pair.send('some cool msg');
```
