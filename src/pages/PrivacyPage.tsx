import { Link } from 'react-router-dom'
import { publicSiteOrigin } from '../lib/site'
import './PrivacyPage.css'

export function PrivacyPage() {
  return (
    <main className="privacy">
      <p className="privacy__back">
        <Link to="/">100 Days of 100%</Link>
      </p>
      <h1>Privacy policy</h1>
      <p className="privacy__updated">Last updated October 26, 2026.</p>

      <p>
        100 Days of 100% is a personal habit challenge. This policy covers the
        website at {publicSiteOrigin()} and the iOS app.
      </p>

      <h2>What is stored</h2>
      <p>
        When you create an account, we store your email address and a sign-in
        credential. After that, the app stores what you write: life-area goals,
        your list, notes on rules, daily checkoffs, journal entries, weekly
        goals, streak dates, and exception or hyper-drive notes.
      </p>
      <p>
        That information is kept in Supabase so you can sign in on another
        device and keep the same run. Passwords are handled by Supabase Auth
        and are not readable by the app.
      </p>

      <h2>Who can see it</h2>
      <p>
        Your list, notes, and journal are private. You can choose to share the
        selected daily habits with the coach. The journal is never included in
        that share. Sharing is off until you turn it on, and you can turn it
        off again in the menu.
      </p>
      <p>We do not sell personal information, and the app does not show ads or use tracking.</p>

      <h2>Notifications</h2>
      <p>
        Reminders are scheduled on your device. They are not sent from a push
        server. You can turn the daily reminder off in the menu, and you can
        turn notifications off in iPhone Settings.
      </p>

      <h2>Deleting your account</h2>
      <p>
        Open the menu and choose Delete Account. That permanently removes the
        account and the data stored for it, including the list, notes, weekly
        goals, logs, streak, and journal. This cannot be undone.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data:{' '}
        <a href="mailto:rawlight@gmail.com">rawlight@gmail.com</a>.
      </p>
    </main>
  )
}
