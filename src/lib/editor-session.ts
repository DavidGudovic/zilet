import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { requireUser, HttpError } from './security';
export async function editorSession(role: 'editor' | 'maintainer' = 'editor') {
  try {
    return await requireUser(await headers(), role);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect('/nalog?returnTo=/redakcija');
    notFound();
  }
}
