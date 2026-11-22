// Content negotiation for the home page: agents that ask for Markdown get the prerendered /index.md, everyone else
// gets the static HTML. wrangler.jsonc runs this only for "/"; every other path is served straight from the assets.
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const markdown = /\btext\/markdown\b/i.test(request.headers.get("Accept") ?? "");
    const asset = markdown ? new Request(new URL("/index.md", request.url), request) : request;
    const served = await env.ASSETS.fetch(asset);
    // Copy the response: the one from the binding has immutable headers.
    const response = new Response(served.body, served);
    response.headers.append("Vary", "Accept");
    return response;
  },
};
