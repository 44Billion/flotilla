# Flotilla

A discord-like nostr client based on the idea of "relays as groups".

If you would like to be interoperable with Flotilla, please check out this guide: https://habla.news/u/hodlbod@coracle.social/1741286140797

## Environment

You can also optionally create an `.env.local` file and populate it with the following environment variables (see `.env.template` for examples):

**Platform branding**
- `VITE_PLATFORM_URL` - The url where the app will be hosted
- `VITE_PLATFORM_NAME` - The name of the app
- `VITE_PLATFORM_LOGO` - A logo url for the app. Can be a local path or https link. Must be a PNG file.
- `VITE_PLATFORM_ACCENT` - A hex color for the app's accent color
- `VITE_PLATFORM_DESCRIPTION` - A description of the app
- `VITE_PLATFORM_TERMS` - URL to your terms of service page
- `VITE_PLATFORM_PRIVACY` - URL to your privacy policy page

**Platform mode**
- `VITE_PLATFORM_RELAYS` - A comma-separated list of relay urls that will make flotilla operate in "platform mode". Disables all space browse/add/select functionality and makes the first platform relay the home page.

**Defaults**
- `VITE_DEFAULT_PUBKEYS` - A comma-separated list of hex pubkeys for bootstrapping web of trust
- `VITE_DEFAULT_SPACES` - A comma-separated list of relay urls that new users will be automatically joined to on signup
- `VITE_DEFAULT_RELAYS` - A comma-separated list of relay urls used as default outbox/inbox relays
- `VITE_DEFAULT_MESSAGING_RELAYS` - A comma-separated list of relay urls used for encrypted direct messages
- `VITE_DEFAULT_BLOSSOM_SERVERS` - A comma-separated list of blossom server urls used for file uploads

**Infrastructure**
- `VITE_INDEXER_RELAYS` - A comma-separated list of relay urls used for user profile/key lookup
- `VITE_SIGNER_RELAYS` - A comma-separated list of relay urls used for NIP-55 remote signers
- `VITE_BLOCKED_RELAYS` - A comma-separated list of relay urls that will be blocked
- `VITE_PUSH_SERVER` - URL of the push notification server
- `VITE_PUSH_BRIDGE` - WebSocket URL of the push notification relay bridge
- `VITE_VAPID_PUBLIC_KEY` - VAPID public key for web push notifications
- `VITE_POMADE_SIGNERS` - A comma-separated list of Pomade signer server URLs (3+ required to enable email signup)
- `VITE_THUMBNAIL_URL` - URL of the image thumbnail service

These values **won't** be used for a built version. Instead, env variables should be provided to `build.sh` directly or to the built container.

If you're deploying a custom version of flotilla, be sure to remove the `plausible.coracle.social` script from `app.html`. This sends analytics to a server hosted by the developer.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deployment

To run your own Flotilla, it's as simple as:

```sh
pnpm install
pnpm run build
pnpm run start
```

Or, if you prefer to use a container:

```sh
docker run -d -p 3000:3000 gitea.coracle.social/coracle/flotilla:latest
```

Alternatively, you can copy the build files into a directory of your choice and serve it yourself:

```sh
mkdir ./mount
docker run -v ./mount:/app/mount gitea.coracle.social/coracle/flotilla:latest bash -c 'cp -r build/* mount'
```
