import { Message } from '@/core/types';

type StreamEvent =
  | { type: 'ready' }
  | { type: 'delta'; client_msg_id?: string; text: string }
  | { type: 'final'; client_msg_id?: string; text: string }
  | { type: 'error'; error: string; details?: string }
  | { type: 'pong' };

export class TextStreamService {
  private ws: WebSocket | null = null;
  private url: string;
  private chatId: string | null = null;
  private isOpen = false;
  private pending: Array<() => void> = [];
  private onDelta?: (text: string, clientMsgId?: string) => void;
  private onFinal?: (text: string, clientMsgId?: string) => void;

  constructor(url: string) {
    this.url = url;
  }

  initialize(chat_id: string, handlers: {
    onDelta?: (text: string, clientMsgId?: string) => void,
    onFinal?: (text: string, clientMsgId?: string) => void,
  }) {
    this.chatId = chat_id;
    this.onDelta = handlers.onDelta;
    this.onFinal = handlers.onFinal;
    if (!this.ws || this.ws.readyState > 1) {
      this.connect();
    }
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.isOpen = true;
      this.pending.splice(0).forEach((fn) => fn());
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as StreamEvent;
        if (msg.type === 'delta') {
          this.onDelta?.(msg.text, msg.client_msg_id);
        } else if (msg.type === 'final') {
          this.onFinal?.(msg.text, msg.client_msg_id);
        }
      } catch {}
    };
    this.ws.onclose = () => { this.isOpen = false; };
    this.ws.onerror = () => { this.isOpen = false; };
  }

  sendMessage(text: string, client_msg_id?: string, mode: string = 'text') {
    if (!this.chatId) throw new Error('TextStreamService not initialized');
    const payload = { type: 'send_message', chat_id: this.chatId, text, client_msg_id, mode };
    const send = () => this.ws?.send(JSON.stringify(payload));
    if (this.isOpen && this.ws?.readyState === WebSocket.OPEN) send();
    else this.pending.push(send);
  }

  dispose() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.isOpen = false;
    this.pending = [];
  }
}

export const textStreamService = new TextStreamService((() => {
  const url = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL || '';
  // Expect functions endpoint, convert to WS
  return url.replace(/^https?:\/\//, 'wss://') + '/chat-ws';
})());


