declare module "cloudflare:node" {
  import type { IncomingMessage, ServerResponse } from "node:http";
  export function handleAsNodeRequest(request: Request, port: number): Promise<Response>;
  export function httpServerHandler(server: any): any;
}
