export class WebSocketManager {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.messageHandlers = new Map();
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  onMessage(callback) {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
  }

  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  handleMessage(data) {
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data);
    }
  }
}