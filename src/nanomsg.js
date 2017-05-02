const nanomsg = {
  REQ: 'rep.sp.nanomsg.org',
  PAIR: 'pair.sp.nanomsg.org',
  SUB: 'pub.sp.nanomsg.org',
}

nanomsg.Socket = class {
  constructor(protocol) {
    this.protocol = protocol;
    this.wss = new Map();
    this.reqIdHeader = null;
    this.cbs = {
      data: [],
    };

    this.handleMessage = this.handleMessage.bind(this);

    if (this.protocol == nanomsg.REQ) {
      this.reqIdHeader = new Uint8Array(4);
      window.crypto.getRandomValues(this.reqIdHeader);
    }
  }

  handleMessage(e) {
    const reader = new FileReader();

    reader.addEventListener('loadend', () => {
      let data = reader.result;

      if (this.protocol == nanomsg.REQ) {
        data = data.substr(4);
      }

      this.cbs.data.forEach(cb => cb(data));
    });

    reader.readAsText(e.data);
  }

  connect(url) {
    if (!this.wss.has(url)) {
      console.log('nanomsg connect to: ' + url);
      const ws = new WebSocket(url, [this.protocol]);

      ws.onopen = () => {
        console.log('nanomsg connected: ' + url);
        this.wss.set(url, ws);
      };
      ws.onmessage = this.handleMessage;
      ws.onerror = (e) => {
        console.log('nanomsg error', e);
      };
      ws.onclose = () => {
        console.log('nanomsg close: ' + ws.url);

        if (this.wss.has(ws.url)) {
          this.wss.delete(ws.url);
        }
        // setTimeout(() => {
        //   console.log('nanomsg reconnect: ' + ws.url);
        //   this.connect(ws.url);
        // }, 1000);
      };

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

    // this is a good one: https://www.freelists.org/post/nanomsg/WebSocket-test-case-not-working,3
    if (this.protocol === nanomsg.REQ) {
      const data = new Uint8Array(msg.length + 4);
      data.set(this.reqIdHeader, 0);

      for (let i = 4; i < msg.length + 4; ++i) {
        data[i] = msg.charCodeAt(i - 4);
      }

      msg = data;
    }

    for (let ws of this.wss.values()) {
      if (ws.readyState === 1) {
        ws.send(msg);
      } else if (ws.readyState > 1) {
        if (this.wss.has(ws.url)) {
          this.wss.delete(ws.url);
        }
        console.log('nanomsg: could not send, because of closed connection (' + ws.url + ')');
      }
    }
  }
};
