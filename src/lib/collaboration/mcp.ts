// Typed MCP JSON-RPC envelope and collaboration message shapes.
// Standalone (no runtime deps) to keep type-check strict and fast.

export type JsonRpcId = string | number;

export interface JsonRpcRequest<M extends string = string, P = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: M;
  params?: P;
}

export interface JsonRpcResult<R = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: R;
}

export interface JsonRpcError {
  jsonrpc: '2.0';
  id: JsonRpcId | null;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResult | JsonRpcError;

// Collaboration method names
export type CollabMethod =
  | 'collab/subscribe'
  | 'collab/update'
  | 'collab/awareness'
  | 'collab/sync'
  | 'collab/heartbeat'
  | 'collab/room.info';

export interface SubscribeParams {
  roomId: string;
  sessionId?: string;
  token?: string;
  capabilities?: readonly string[];
  client?: { name: string; version: string };
}

export interface UpdateParams {
  roomId: string;
  seq: number;
  sid?: string;
  payloadB64?: string; // base64-encoded Yjs update if not using binary frames
}

export interface AwarenessParams {
  roomId: string;
  seq: number;
  sid?: string;
  payloadB64?: string; // base64-encoded awareness update
}

export interface HeartbeatParams { ts: number }

export interface AckResult { applied: boolean; version?: number; traceId?: string }

export interface RoomInfoResult {
  roomId: string;
  participants: number;
  roles?: readonly string[];
  rateLimit?: { points: number; durationSec: number };
}

export function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function encodeB64(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  // btoa is available in browsers
  // eslint-disable-next-line
  // @ts-ignore
  return btoa(s);
}

export function decodeB64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  // eslint-disable-next-line
  // @ts-ignore
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}
