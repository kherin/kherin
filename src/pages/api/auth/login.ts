import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const data = await request.formData();
  const password = data.get('password')?.toString() ?? '';

  const correctPassword = process.env.CMS_PASSWORD;
  const secret = process.env.KEYSTATIC_SECRET;

  if (!correctPassword || !secret) {
    return redirect('/cms?error=config', 303);
  }

  if (password === correctPassword) {
    cookies.set('cms_session', secret, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return redirect('/keystatic', 303);
  }

  return redirect('/cms?error=1', 303);
};
