export type MailAction = { label: string; url: string };
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function brandedMail(subject: string, text: string, origin: string, action?: MailAction) {
  const site = new URL(origin);
  if (!['http:', 'https:'].includes(site.protocol)) throw new Error('Neispravna adresa sajta.');
  if (action) {
    const url = new URL(action.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== site.origin)
      throw new Error('Neispravan link u poruci.');
  }
  const safeOrigin = escapeHtml(site.origin);
  const html = `<!doctype html><html lang="cnr-Latn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f6f2e9;color:#20251f;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;border-top:6px solid #173a2b"><tr><td style="padding:28px 24px;background:#fffdf8"><a href="${safeOrigin}" style="color:#173a2b;text-decoration:none"><img src="${safeOrigin}/identity/wordmark-generated.png" alt="Žilet" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0"></a><p style="color:#626359;font-size:12px;letter-spacing:1px">KNJIŽEVNOST · UMJETNOST · KULTURA</p><h1 style="font:normal 28px/1.25 Georgia,serif;color:#173a2b;margin:30px 0 20px">${escapeHtml(subject.replace(/^Žilet — /, ''))}</h1>${text
    .split('\n\n')
    .map(
      (p) =>
        `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`,
    )
    .join(
      '',
    )}${action ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#173a2b;color:#fffdf8;padding:14px 20px;text-decoration:none;font-weight:bold;border-radius:2px">${escapeHtml(action.label)}</a></p><p style="font-size:12px;line-height:1.6;color:#626359;overflow-wrap:anywhere;word-break:break-all">Ako dugme ne otvara stranicu, kopirajte link:<br><a style="color:#173a2b" href="${escapeHtml(action.url)}">${escapeHtml(action.url)}</a></p>` : ''}</td></tr><tr><td style="padding:20px 24px;border-top:1px solid #c9c2b6;color:#626359;font-size:13px;line-height:1.6">Žilet · Književni časopis<br><a href="${safeOrigin}" style="color:#173a2b">${escapeHtml(site.host)}</a></td></tr></table></td></tr></table></body></html>`;
  return {
    html,
    text: action
      ? `${text}\n\n${action.label}:\n${action.url}\n\nŽilet · ${site.origin}`
      : `${text}\n\nŽilet · ${site.origin}`,
  };
}
