# Contributing

Wisp Benchmark accompanies the experimental Wisp v0.1.2 release. Please keep model labels and comparison conditions clear when contributing.

Issues and pull requests are welcome.

This project uses [pnpm](https://pnpm.io) (not npm or Bun):

```bash
pnpm install
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

- Copy `.env.example` to `.env.local` for local settings. Never commit `.env.local` or API keys.
- Provider code lives in `src/app/api/*`. In local development these routes run on the contributor's machine; in a hosted deployment they run on the site host. Keep provider keys server-side and document where request text is processed.
- Keep the app local-first: no analytics and no Wisp inference hosted by this project. A hosted interface may call a remote provider only when its operator explicitly configures that provider; document that submitted text passes through the host and provider.

By contributing you agree that your contribution is licensed under the repository's licence.
