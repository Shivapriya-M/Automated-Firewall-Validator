import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; message = 'Invalid identifier or value';
  } else if (err.code === 11000) {
    status = 409; message = 'A record with that value already exists';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413; message = 'Request body too large';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (env.NODE_ENV === 'production') message = 'Internal server error'; // never leak internals
  }
  res.status(status).json({ message, ...(details ? { details } : {}), ...(env.NODE_ENV === 'development' && status >= 500 ? { stack: err.stack } : {}) });
}
