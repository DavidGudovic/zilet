# Launch checklist — owner decisions and deployment

The local implementation and VPS container are complete. The owner authorized deployment and the two supplied works with current credited illustrations on 2026-09-06. Public Nginx/TLS and the automatic deployment timer still require working sudo authentication; see deployment.md.

- [ ] Confirm the second editor's identity and invitation address. Confirm Savka's preferred public name and both editors' account addresses. Do not infer privileges from Zoran Đurović's bylines.
- [ ] Approve the public about copy and the draft privacy/comment policy at `/pravila`; establish the appropriate operator/retention wording. The draft does not claim legal compliance or invent an entity.
- [x] Owner approved and imported the supplied writing into production. Resolve source backslash/tildes and zero-width characters with the author if cleanup is wanted; current fixtures preserve them.
- [x] Owner approved the current credited CC0 illustration for publication. Original post images remain unavailable and are not claimed as supplied. No development seeds run automatically.
- [ ] Configure transactional SMTP, sender verification and recovery on the real origin. Disable registration until delivery, verification and single-use recovery have been tested. Never point production delivery at the local Mailpit sink.
- [x] Set real HTTPS `APP_URL` and `BETTER_AUTH_URL`, strong server-generated secrets and private on-host backups. App/database are not publicly exposed. Off-host backup destination and retention still need an owner decision.
- [ ] Review and merge the reverse-proxy example into the owner's existing configuration. Set trusted proxy headers deliberately. Review DNS/TLS separately; neither has been changed by this task.
- [x] Started production Compose, confirmed health/migrations and imported the approved content.
- [ ] Create confirmed accounts after SMTP setup; verify actual proxy upload limits and recovery URLs.
- [ ] Decide whether to enable Umami. If enabled, use separate credentials/database, change initial credentials, configure the actual website ID, review the privacy wording and inspect genuine collection. It currently reports that statistics are not connected.
- [ ] Verify social previews, sitemap and robots on the public hostname after content approval; registration/search/private routes are excluded. No indexing or search ranking is promised.
- [ ] Back up both database and media before the first public import. Perform a restore on a separate recovery host before relying on a production backup schedule.
- [ ] Check actual browser zoom, OS reduced-motion preference, print output and a screen-reader session on the intended devices; the connected inspection browser did not expose all of these environment controls.
