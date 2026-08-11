import { defineMiddleware } from 'astro:middleware';

const keystaticApiPrefix = '/api/keystatic/';

/**
 * @keystatic/astro currently drops the Secure option while translating the
 * core API's Set-Cookie values into Astro cookies. Restore that option at the
 * application boundary for production Keystatic responses only.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (!import.meta.env.PROD || !context.url.pathname.startsWith(keystaticApiPrefix)) {
    return next();
  }

  const setCookie = context.cookies.set.bind(context.cookies);
  context.cookies.set = (key, value, options) => {
    setCookie(key, value, { ...options, secure: true });
  };

  return next();
});
