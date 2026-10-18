# Remote development and deployment

## Remote development

- Install the exact Node version in `mise.toml` with `mise install`.
- Run `npm ci` from `/home/dev/src/kherin`.
- Forward local port 4323 to remote `127.0.0.1:4323` in Zed.
- Run the `dev: tmux on localhost:4323` Zed task. It creates or attaches to the
  persistent `kherin-dev` tmux session.
- Bootstrap, check, and build tasks use `/usr/local/bin/dev-heavy`, which queues
  on the VPS-wide `/run/lock/dev-heavy.lock` so only one heavy project job runs
  at a time.

## CI

The `CI` workflow runs on every pull request and every push to `main`:
`npm ci`, `npm run check` (Astro checks), and `npm run build`. It deploys
nothing.

## Deployment (Vercel)

The site is built with the `@astrojs/vercel` adapter and deployed by Vercel's
GitHub integration. There is no deployment workflow in this repository and no
deployment credential belongs in it.

- Every push to `main` creates a production deployment on `kherin.com`.
- Every other branch and pull request gets a preview deployment, linked from
  the pull request.
- Roll back by promoting an earlier deployment in the Vercel dashboard
  (Deployments → ⋯ → Promote to Production), or with `vercel rollback`.
- Environment variables are managed in the Vercel project settings. For local
  work, `vercel env pull` writes them to `.env.local`, which is ignored by git;
  `.env.example` documents the variables and stays tracked.

DNS is managed at Namecheap: the apex `kherin.com` points to Vercel
(`216.150.1.1`) and `www` is a CNAME to `cname.vercel-dns.com`. Other
subdomains still point to the VPS, which no longer hosts this site.
