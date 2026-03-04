import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('cms_session', { path: '/' });
  return redirect('/cms', 303);
};
