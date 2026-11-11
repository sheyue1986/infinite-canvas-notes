const protocol = "2026-07-28";
const legacyProtocol = "2025-11-25";
const clientInfo = { name: "Infinite Canvas Notes", version: "0.2.1" };
const jsonObject = value => value && typeof value === "object" && !Array.isArray(value);
const headerToken = /^[!#$%&'*+.\-^_`|~0-9A-Za-z]+$/;

function encodeHeader(value) {
  const text = String(value);
  if (/^[\t\x20-\x7e]*$/.test(text) && text.trim() === text && !/^=\?base64\?.*\?=$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return "=?base64?" + btoa(binary) + "?=";
}

function toolHeaderFields(schema) {
  const fields = [];
  const names = new Set();
  function walk(node, path, allowed) {
    if (!jsonObject(node) && !Array.isArray(node)) return true;
    if (Object.hasOwn(node, "x-mcp-header")) {
      const name = node["x-mcp-header"];
      if (!allowed || !path.length || typeof name !== "string" || !headerToken.test(name) ||
          !["boolean", "integer", "string"].includes(node.type) || names.has(name.toLowerCase())) return false;
      names.add(name.toLowerCase());
      fields.push({ name, path, type: node.type });
    }
    return Object.entries(node).every(([key, value]) =>
      key === "properties" && allowed && jsonObject(value) ?
        Object.entries(value).every(([name, property]) => walk(property, [...path, name], true)) :
        walk(value, path, false));
  }
  return walk(schema, [], true) ? fields : null;
}

export function serviceUrl(value, message) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error(message); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))) {
    throw new Error(message);
  }
  return url;
}

async function rpcResult(response, id) {
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return response.json();
  const reader = response.body?.getReader();
  if (!reader) throw new Error("MCP stream missing");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer = (buffer + decoder.decode(value, { stream: !done })).replaceAll("\r\n", "\n");
      if (buffer.length > 8_000_000) throw new Error("MCP result too large");
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const data = buffer.slice(0, end).split("\n")
          .filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        buffer = buffer.slice(end + 2);
        if (!data) continue;
        const message = JSON.parse(data);
        if (message.id === id) return message;
      }
      if (done) throw new Error("MCP stream closed");
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

export async function connectMcp(address, token, signal, t) {
  const url = serviceUrl(address, t("请输入有效的 MCP 地址。远程服务使用 HTTPS。", "Enter an MCP URL. Remote servers require HTTPS."));
  let revision = protocol;
  let session;
  let requestId = 0;
  const unavailable = () => t("MCP 服务器未返回工具结果。", "The MCP server did not return a tool result.");
  async function rpc(method, params, requestSignal, notification = false, extraHeaders = {}) {
    const id = notification ? undefined : ++requestId;
    const modern = revision === protocol;
    const payload = { jsonrpc: "2.0", id, method, params: modern ? {
      ...params, _meta: {
        "io.modelcontextprotocol/protocolVersion": protocol,
        "io.modelcontextprotocol/clientInfo": clientInfo,
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    } : params };
    const response = await fetch(url, {
      method: "POST", credentials: "omit", redirect: "error", signal: requestSignal,
      headers: {
        "Content-Type": "application/json", Accept: "application/json, text/event-stream",
        ...(token && { Authorization: "Bearer " + token }),
        ...(method !== "initialize" && { "MCP-Protocol-Version": revision }),
        ...(modern && { "Mcp-Method": method }),
        ...(modern && method === "tools/call" && { "Mcp-Name": encodeHeader(params.name), ...extraHeaders }),
        ...(!modern && session && { "Mcp-Session-Id": session }),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = new Error(t("MCP 连接失败", "MCP request failed") + " (HTTP " + response.status + ")");
      error.status = response.status;
      throw error;
    }
    if (notification) return;
    if (method === "initialize") session = response.headers.get("Mcp-Session-Id");
    const reply = await rpcResult(response, id);
    if (reply?.id !== id || reply.error || !jsonObject(reply.result)) {
      const error = new Error(unavailable());
      error.rpcCode = reply?.error?.code;
      throw error;
    }
    return reply.result;
  }

  let page;
  try {
    page = await rpc("tools/list", {}, signal);
  } catch (error) {
    if (signal.aborted || !(error instanceof TypeError || [400, 404, 405, 406, 415].includes(error.status) ||
        [-32601, -32602].includes(error.rpcCode))) throw error;
    revision = legacyProtocol;
    const hello = await rpc("initialize", { protocolVersion: revision, capabilities: {}, clientInfo }, signal);
    if (![legacyProtocol, "2025-06-18", "2025-03-26"].includes(hello.protocolVersion)) throw new Error(unavailable());
    revision = hello.protocolVersion;
    await rpc("notifications/initialized", undefined, signal, true);
    page = await rpc("tools/list", {}, signal);
  }
  const tools = [];
  for (let round = 0; round < 5; round++) {
    if (!Array.isArray(page.tools)) throw new Error(unavailable());
    for (const tool of page.tools) {
      if (typeof tool?.name !== "string" || !tool.name || tool.name.length > 160 ||
          !jsonObject(tool.inputSchema) || tool.inputSchema.type !== "object" ||
          tools.some(item => item.name === tool.name)) continue;
      const headers = revision === protocol ? toolHeaderFields(tool.inputSchema) : [];
      if (!headers) continue;
      tools.push({
        name: tool.name, modelName: "mcp_tool_" + (tools.length + 1),
        description: [tool.name, typeof tool.description === "string" ? tool.description : ""].join(" — ").slice(0, 2500),
        parameters: tool.inputSchema, headers,
      });
      if (tools.length === 100) break;
    }
    if (!page.nextCursor || tools.length === 100 || round === 4) break;
    page = await rpc("tools/list", { cursor: page.nextCursor }, signal);
  }
  return {
    tools,
    call(tool, args, requestSignal) {
      if (!jsonObject(args) || JSON.stringify(args).length > 100_000) throw new Error(unavailable());
      const headers = {};
      for (const { name, path, type } of tool.headers) {
        const value = path.reduce((object, key) => jsonObject(object) && Object.hasOwn(object, key) ? object[key] : undefined, args);
        if (value == null) continue;
        if (type === "integer" ? !Number.isSafeInteger(value) : typeof value !== type) throw new Error(unavailable());
        headers["Mcp-Param-" + name] = encodeHeader(value);
      }
      return rpc("tools/call", { name: tool.name, arguments: args }, requestSignal, false, headers);
    },
  };
}

export async function modelWithMcp(complete, messages, mcp, signal, vision, t) {
  const tools = mcp?.client.tools.filter(tool => mcp.allowed.includes(tool.name)) ?? [];
  const definitions = tools.map(tool => ({
    type: "function", function: { name: tool.modelName, description: tool.description, parameters: tool.parameters },
  }));
  let count = 0;
  for (let round = 0; round <= 4; round++) {
    const choice = await complete(messages, round < 4 && definitions.length ? definitions : undefined);
    const calls = choice?.message?.tool_calls;
    if (!calls?.length) return choice;
    if (round === 4 || count + calls.length > 8) throw new Error(t("模型已达到本次 MCP 调用上限。", "The MCP call limit was reached."));
    count += calls.length;
    messages.push({ role: "assistant", content: choice.message.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const tool = tools.find(item => item.modelName === call.function?.name);
      if (!tool) throw new Error(t("模型请求了未启用的 MCP 工具。", "The model requested a disabled MCP tool."));
      let result;
      try { result = await mcp.client.call(tool, JSON.parse(call.function.arguments), signal); }
      catch (error) { if (signal.aborted) throw error; result = { isError: true, content: [{ type: "text", text: error.message }] }; }
      const content = Array.isArray(result.content) ? result.content : [];
      const text = JSON.stringify({ isError: result.isError, structuredContent: result.structuredContent,
        content: content.filter(part => part?.type === "text") }).slice(0, 48000);
      const images = vision ? content.filter(part => part?.type === "image" &&
        /^image\/(png|jpeg|webp|gif)$/.test(part.mimeType) && typeof part.data === "string" && part.data.length <= 7_000_000).slice(0, 3) : [];
      messages.push({
        role: "tool", tool_call_id: call.id,
        content: images.length ? [{ type: "text", text }, ...images.map(part => ({
          type: "image_url", image_url: { url: "data:" + part.mimeType + ";base64," + part.data },
        }))] : text,
      });
    }
  }
}
