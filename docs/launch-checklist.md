# Launch checklist — owner decisions and deployment

The local implementation is complete; this list separates it from authorization to publish real content or configure a live service.

- [ ] Confirm the second editor's identity and invitation address. Confirm Savka's preferred public name and both editors' account addresses. Do not infer privileges from Zoran Đurović's bylines.
- [ ] Approve the public about copy and the draft privacy/comment policy at `/pravila`; establish the appropriate operator/retention wording. The draft does not claim legal compliance or invent an entity.
- [ ] Approve live import of the supplied writing. Resolve source backslash/tildes and zero-width characters with the author if cleanup is wanted; current fixtures preserve them.
- [ ] Obtain the original post images, permissions, authorship/credits and useful alternative text. The CC0 paintings are labeled development illustrations, not original post images or contributor portraits. No development seeds run automatically.
- [ ] Configure transactional SMTP, sender verification and recovery on the real origin. Disable registration until delivery, verification and single-use recovery have been tested. Never point production delivery at the local Mailpit sink.
- [ ] Set real HTTPS `APP_URL` and `BETTER_AUTH_URL`, strong secrets and private backups. Check app/media disk space and host firewall. Use an approved backup retention/off-host process.
- [ ] Review and merge the reverse-proxy example into the owner's existing configuration. Set trusted proxy headers deliberately. Review DNS/TLS separately; neither has been changed by this task.
- [ ] On the target VPS, start Compose, confirm health/migrations, create the confirmed accounts through owner tooling, and test all roles. Check the actual proxy upload limit and recovery URLs.
- [ ] Decide whether to enable Umami. If enabled, use separate credentials/database, change initial credentials, configure the actual website ID, review the privacy wording and inspect genuine collection. It currently reports that statistics are not connected.
- [ ] Verify social previews, sitemap and robots on the public hostname after content approval; registration/search/private routes are excluded. No indexing or search ranking is promised.
- [ ] Back up both database and media before the first public import. Perform a restore on a separate recovery host before relying on a production backup schedule.
- [ ] Check actual browser zoom, OS reduced-motion preference, print output and a screen-reader session on the intended devices; the connected inspection browser did not expose all of these environment controls.
