import { handleRequest } from "../_core/handler";

type Env = Record<string, string | undefined> & { DB?: unknown };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};