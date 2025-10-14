import type { IncomingMessage, ServerResponse } from 'http';

declare module 'express' {
  export interface Request extends IncomingMessage {
    path: string;
  }

  export interface Response extends ServerResponse {
    status(code: number): Response;
    json(body: unknown): Response;
  }

  export type NextFunction = () => void;
  export type RequestHandler = (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => void | Promise<void>;

  export interface Router {
    get(path: string, handler: RequestHandler): this;
    use(handler: Router | RequestHandler): this;
  }

  export interface Application extends Router {
    listen(port: number, callback?: () => void): import('http').Server;
  }

  interface ExpressNamespace {
    (): Application;
    Router(): Router;
  }

  const express: ExpressNamespace;

  export default express;
}
