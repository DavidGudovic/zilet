# Submission correspondence and email review — 12 September 2026

Verified the built disposable application at `http://localhost:3010`, with its isolated PostgreSQL database and local Mailpit inbox. No production content, accounts or email recipients were used.

`tests/integration/correspondence-ui.ts` exercised the browser controls for submitting a poem, selecting the rubric, sending an editorial question, following the notification link, replying as the reader, deciding against publication, and permanently deleting the test submission. The browser verified the signed-in page and expected controls after each transition. Its test fixture was removed after the run.

All 28 viewport measurements passed at 320, 390, 768 and 1440 CSS pixels: editorial question/decision, reader question/reply/decision and both email templates. A long uninterrupted URL remained within the page and email widths. The reply form disappeared after the decision. No browser page errors occurred.

The question and decision emails were retrieved from Mailpit as actually delivered HTML, rendered in Chromium and captured. The branded logo loaded, action links targeted the exact reader submission, fallback links remained readable, and plain-text messages retained the editorial content. The desktop decision email, narrow question email and reader decision screenshots were visually inspected. Reply/decision screenshots focus on the newest message so the long test URL does not obscure the completed action.

The separate HTTP submission suite also passed acceptance/rejection email delivery, private ownership guards, stale-version conflicts, honest unavailable delivery, retries without resending already-sent mail and conversation deletion. This review does not claim rendering verification in Outlook, Gmail, Apple Mail or other email clients.

Evidence: `correspondence-results.json`, `conversation-*.png`, `email-question-*.png`, and `email-decision-*.png` in this directory.
