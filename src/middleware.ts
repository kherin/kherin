import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isProtected =
    pathname.startsWith('/keystatic') ||
    pathname.startsWith('/api/keystatic');

  if (isProtected) {
    const session = context.cookies.get('cms_session')?.value;
    const secret = process.env.KEYSTATIC_SECRET;

    if (!secret || !session || session !== secret) {
      return context.redirect('/cms');
    }
  }

  return next();
});
