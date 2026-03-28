import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { config } from '../config/index.js';

const logger = pino({
  level: config.logging.level,
  transport:
    config.app.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      },
      `${req.method} ${req.path} ${res.statusCode}`
    );
  });

  next();
}

export { logger };
export default requestLoggingMiddleware;
