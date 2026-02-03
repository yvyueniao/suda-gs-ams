import type { Connect } from "vite";
import type { ServerResponse } from "http";

export type ApiOk<T> = {
  code: 200;
  msg: string;
  data: T;
  timestamp: number;
};

export type ApiFail = {
  code: number;
  msg: string;
  data: null;
  timestamp: number;
};

export function ok<T>(data: T, msg = "成功"): ApiOk<T> {
  return { code: 200, msg, data, timestamp: Date.now() };
}

export function fail(msg: string, code = 400): ApiFail {
  return { code, msg, data: null, timestamp: Date.now() };
}

export async function parseJson(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function sendJson(res: ServerResponse, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
