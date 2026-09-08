import { ProfileForm } from '@/components/profile-form';
import { editorSession } from '@/lib/editor-session';
import { PasswordForm } from '@/components/password-form';
export default async function Page() {
  const user = await editorSession();
  return (
    <div className="desk-account">
      <div className="desk-title">
        <div>
          <span className="eyebrow">Vaš nalog</span>
          <h1>{user.name}</h1>
        </div>
      </div>
      <p>{user.email}</p>
      <ProfileForm name={user.name} email={user.email} />
      <PasswordForm />
    </div>
  );
}
