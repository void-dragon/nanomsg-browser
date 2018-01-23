const nanomsg = {
  debug: false,
  reconnectTime: 1000,
  receiveArrayBuffer: false,
  REQ: 'rep.sp.nanomsg.org',
  PAIR: 'pair.sp.nanomsg.org',
  SUB: 'pub.sp.nanomsg.org',
}

nanomsg.Socket = class {
  constructor(protocol) {
    this.protocol = protocol;
    this.wss = new Map();
    this.reqIdHeader = null;
    this.promise = null;
    this.cbs = {
      data: [],
      end: [],
      error: [],
    };

    if (this.protocol == nanomsg.REQ) {
      this.reqIdHeader = new Uint8Array(4);
      window.crypto.getRandomValues(this.reqIdHeader);
      // the first bit HAS TO BE one, in order to get a response
      this.reqIdHeader[0] |= 1 << 7;
    }
  }

  connect(url) {
    if (!this.wss.has(url)) {
      return new Promise((resolve, reject) => {
        if (nanomsg.debug) {
          console.log('nanomsg connect to: ' + url);
        }

        const tryConnect = () => {
          try {
            this.__setupSocketConnection(url, resolve);
          } catch (e) {
            console.log(e);
            this.wss.delete(url);

            setTimeout(tryConnect, nanomsg.reconnectTime);
          }
        };

        tryConnect();
      });
    }
  }

  __setupSocketConnection(url, resolve) {
    const ws = new WebSocket(url, [this.protocol]);
    ws.initialUrl = url; // evil hack of evilness, to access the original used url

    if (nanomsg.receiveArrayBuffer) {
      ws.binaryType = 'arraybuffer';
    }

    this.wss.set(url, ws);

    ws.onopen = () => {
      if (nanomsg.debug) {
        console.log('nanomsg connected: ' + url);
      }

      resolve();
    };

    ws.onmessage = (e) => {
      let data = null;

      if (this.protocol == nanomsg.REQ) {
        data = e.data.slice(4);
      } else {
        data = e.data;
      }

      if (nanomsg.receiveArrayBuffer) {
        this.__resolveNewData(data);
      } else {
        const reader = new FileReader();

        reader.onload = (event) => {
          this.__resolveNewData(event.target.result);
        };

        reader.readAsText(data);
      }
    };

    ws.onerror = (e) => {
      if (nanomsg.debug) {
        console.log('nanomsg error', e);
      }

      this.cbs.error.forEach(cb => cb(e));
    };

    ws.onclose = () => {
      if (nanomsg.debug) {
        console.log('nanomsg close: ' + ws.initialUrl);
      }

      if (this.wss.has(ws.initialUrl)) {
        if (nanomsg.debug) {
          console.log('nanomsg reconnect: ' + ws.initialUrl);
        }

        this.wss.delete(ws.initialUrl);
        this.connect(ws.initialUrl);
      }

      this.cbs.end.forEach(cb => cb(ws.initialUrl));
    };
  }

  __resolveNewData(data) {
    if (data) {
      if (this.promise) {
        this.promise.resolve(data);
        this.promise = null;
      }

      this.cbs.data.forEach(cb => cb(data));
    }
  }

  disconnect(url) {
    const ws = this.wss.get(url);

    if (ws) {
      this.wss.delete(url);
      ws.close();
    }
  }

  bind() {
    throw new Error('WHOAAAA!!! Nice try, but NO, we do not support these!');
  }

  on(type, cb) {
    const cbs = this.cbs[type];

    if (cbs) {
      cbs.push(cb);
    }
  }

  send(msg) {
    if (this.protocol === nanomsg.SUB) {
      throw new Exception('SUB socket can not send');
    }

    if (this.wss.size < 1) {
      throw new Exception('you are not connected to any socket');
    }

    // this is a good one: https://www.freelists.org/post/nanomsg/WebSocket-test-case-not-working,3
    if (this.protocol === nanomsg.REQ) {
      const length = msg.length || msg.byteLength;
      const data = new Uint8Array(length + 4);
      data.set(this.reqIdHeader, 0);

      if (typeof msg === 'string' || msg instanceof String) {
        for (let i = 4; i < msg.length + 4; ++i) {
          data[i] = msg.charCodeAt(i - 4);
        }

      } else {
        data.set(msg, 4);
      }

      msg = data;
    }

    if (nanomsg.debug) {
      console.log('nanomsg send =>', msg);
    }

    for (let ws of this.wss.values()) {
      if (ws.readyState === 1) {
        ws.send(msg);
      } else if (ws.readyState > 1) {
        if (this.wss.has(ws.url)) {
          this.wss.delete(ws.url);
        }

        if (nanomsg.debug) {
          console.log('nanomsg: could not send, because of closed connection (' + ws.url + ')');
        }
      }
    }

    if (this.protocol === nanomsg.REQ || this.protocol === nanomsg.PAIR) {
      return new Promise((resolve, reject) => {
        this.promise = { resolve, reject };
      });
    }
  }
};
