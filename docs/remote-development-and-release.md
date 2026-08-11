# Remote development and release contract

This repository contains the application-facing half of Kherin's remote-first
workflow. Host accounts, Tailscale policy, nginx slot switching, runtime secrets,
and the restricted deployment wrapper are provisioned separately on the VPS.

## Remote development

- Install the exact Node version in `mise.toml` with `mise install`.
- Run `npm ci` from `/home/dev/src/kherin`.
- Forward local port 4323 to remote `127.0.0.1:4323` in Zed.
- Run the `dev: tmux on localhost:4323` Zed task. It creates or attaches to the
  persistent `kherin-dev` tmux session.
- Bootstrap, check, and build tasks use `/usr/local/bin/dev-heavy`, which queues
  on the VPS-wide `/run/lock/dev-heavy.lock` so only one heavy project job runs
  at a time.

The development account does not need Docker or production-file access.

## Keystatic GitHub mode

`keystatic.config.ts` stores content in `kherin/kherin`. The production runtime
requires the documented Keystatic GitHub App variables:

```dotenv
KEYSTATIC_GITHUB_CLIENT_ID=
KEYSTATIC_GITHUB_CLIENT_SECRET=
KEYSTATIC_SECRET=
PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=
```

`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, and
`KEYSTATIC_SECRET` are root-owned runtime credentials. The app slug is public,
required at build time, and embedded into the generated Keystatic client. Pass
it as the Docker build argument of the same name; never pass the other three
credentials to Docker builds.

The current Keystatic Astro adapter does not preserve the upstream cookie
`Secure` option. Production middleware restores it for the Keystatic API before
Astro serializes cookies, and the container smoke test verifies both the OAuth
redirect and its `Set-Cookie` header.

The GitHub App must be installed only on `kherin/kherin`, with the callback URLs
required by Keystatic for `https://kherin.com`. Repository write access is the
CMS authorization boundary; the retired site-wide CMS password is not used.

Before enabling the new image in production, compare the old Docker
`blog_content` volume with `src/content/blog` and commit any drift. The image
contains the committed content and does not mount a writable content volume.
Keep the old volume inert until GitHub-backed edits and a fresh deployment have
both been verified.

## CI and immutable releases

Pull requests run Astro checks, the application build, and a `linux/amd64`
container smoke test. The smoke test runs the image as non-root with a read-only
root filesystem and no content volume.

A successful `CI` run for a trusted push to `main` starts `Release`:

1. Require the validated SHA to be the exact current remote `main`, then check
   out that commit. This rejects late completion or reruns of superseded CI.
2. Push `ghcr.io/kherin/kherin:sha-<full-commit-sha>` with exact OCI source and
   revision labels.
3. Generate and verify GitHub provenance for the registry digest.
4. Recheck remote `main`, then join Tailscale through GitHub OIDC as the
   ephemeral `tag:ci-kherin` node.
5. Send only `deploy sha256:<64 lowercase hex characters>` to
   `deploy-kherin` on the VPS, with the workflow actor and short-lived GitHub
   token as two newline-delimited stdin fields for a private GHCR pull.

The workflow requires these repository settings; no credential belongs in the
repository:

| Kind     | Name                               | Purpose                                      |
| -------- | ---------------------------------- | -------------------------------------------- |
| Secret   | `TS_OAUTH_CLIENT_ID`               | Tailscale federated identity client ID       |
| Secret   | `TS_AUDIENCE`                      | Tailscale federated identity audience        |
| Variable | `TS_DEPLOY_HOST`                   | VPS MagicDNS name or Tailscale IP            |
| Variable | `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Required public Keystatic Docker build input |

Both deployment workflows use the exact GitHub environment name `Production`.
Create the Tailscale workload identity with GitHub's OIDC issuer,
the exact subject `repo:kherin/kherin:environment:Production`, repository claim
`kherin/kherin`, and ref claim `refs/heads/main`. Grant it only the `auth_keys`
scope and issue only `tag:ci-kherin`. Tailnet grants must let that tag reach only
the deployment host and map Tailscale SSH only to `deploy-kherin`.

Kherin remains public. That is what makes GitHub-native artifact attestations
available on GitHub Free; making the repository private requires a paid plan or
an explicitly reviewed replacement signing design before release automation can
continue. The `Production` environment is restricted to `main`, and both the
automatic release condition and manual rollback workflow enforce `main` in the
workflow itself.

The root-owned host wrapper fixes the image repository, validates the digest,
deploys the inactive 4321/4322 slot, verifies `/healthz`, switches nginx
atomically, soaks the public URL, and records the previous healthy slot. It must
accept exactly these remote commands:

```text
deploy sha256:<64 lowercase hex characters>
rollback
```

For `deploy`, the wrapper must read exactly two stdin lines: GHCR username and
token. It must pass them to `docker login --password-stdin` using an ephemeral
Docker config, never log or persist them, and remove that config on every exit.

The manual `Roll back production` workflow requires the `rollback-previous`
confirmation and invokes only `rollback`; callers cannot select an arbitrary
image or run a shell command. The release and rollback workflows share one
non-cancelling production concurrency group.

Runtime Keystatic variables remain in a root-owned VPS env file. GHCR pull
credentials and the blue/green Compose definitions also remain on the host. The
repository's `docker-compose.yml` is a hardened local/reference definition; it
no longer owns Dozzle or persistent content.
