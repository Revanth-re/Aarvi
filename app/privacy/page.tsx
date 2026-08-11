import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Screen, ScreenTitle } from "@/components/kit";

export const metadata = { title: "Privacy Policy — SWARA FM" };

// Static, publicly reachable at /privacy (no auth required) — this is
// the URL you paste into the Play Console listing and the Data Safety
// form. Update the contact email and "Last updated" date, and revisit
// the data table any time a new feature starts collecting something
// new (e.g. a future payments provider).
const LAST_UPDATED = "11 August 2026";
const CONTACT_EMAIL = "support@swarafm.app"; // TODO: replace with your real support inbox

export default function PrivacyPolicyPage() {
  return (
    <Screen>
      <Link href="/settings" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={14}/>Back
      </Link>

      <ScreenTitle sub={`Last updated ${LAST_UPDATED}`}>Privacy Policy</ScreenTitle>

      <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, fontSize: 13.5, lineHeight: 1.7, color: "var(--text2)" }}>
        <p>
          SWARA FM (&quot;we&quot;, &quot;us&quot;) provides an app for listening to audio
          dramas, shorts, and community content. This policy explains what
          information we collect, why, and how you can control it.
        </p>

        <Section title="Information we collect">
          <List items={[
            "Account details: name, email or mobile number, and profile photo, whether you sign up with Google or with a mobile/email + password.",
            "Verification: a one-time password (OTP) sent to your email or mobile to confirm it's really you. We don't store the OTP itself after it's verified or expires.",
            "Profile content: your @handle, bio, followed creators, playlists, favorites, and any avatar image you upload.",
            "Activity: listening progress and history, likes, saved shorts, coin balance and coin transactions, and direct messages you send to other users.",
            "Content you create: series, episodes, shorts, and text \"thoughts\" you publish if you use Creator tools.",
            "Device data: push notification tokens (if you enable notifications) and basic technical data like IP address and app version, used for security and diagnostics.",
          ]}/>
        </Section>

        <Section title="How we use it">
          <List items={[
            "To create and secure your account, and verify it's you via OTP.",
            "To operate core features: playback and progress sync, your library, coins, messages, notifications, and social features like following and profiles.",
            "To personalize what's shown to you (e.g. language preferences, Discover recommendations).",
            "To send notifications you've opted into (new episodes, replies, coin rewards) via push, if enabled.",
            "To keep the service safe — detecting abuse, spam, and violations of our terms.",
          ]}/>
        </Section>

        <Section title="What we don't do">
          <List items={[
            "We don't sell your personal data to third parties.",
            "We don't share your private messages or listening history with other users beyond what you've explicitly made public (e.g. public thoughts, public profile activity, if you've enabled it in Settings → Privacy).",
          ]}/>
        </Section>

        <Section title="Third-party services">
          <List items={[
            "Cloudinary — hosts uploaded images (avatars, cover art).",
            "Google — used only if you choose \"Sign in with Google\".",
            "Push notification delivery (Web Push) — if you enable notifications, your browser/device push service (e.g. Google's FCM) relays them; we don't see the message content of that transport layer.",
          ]}/>
          <p style={{ margin: "8px 0 0" }}>
            Each of these processes data under its own privacy policy in
            addition to ours.
          </p>
        </Section>

        <Section title="Your controls">
          <List items={[
            "Settings → Privacy lets you control who can message you, whether your listening activity and thoughts are public, and whether your account is private.",
            "Settings → Notifications lets you turn push notifications on or off per category.",
            "Settings → Account lets you log out or permanently delete your account and associated data.",
          ]}/>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your account data for as long as your account is
            active. If you delete your account, we remove your personal
            profile data; some records (like coin transaction history)
            may be retained where needed for legal, security, or
            accounting reasons.
          </p>
        </Section>

        <Section title="Children">
          <p>
            SWARA FM is not directed at children under 13, and we don&apos;t
            knowingly collect data from them.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes materially, we&apos;ll update the date at
            the top of this page and, where appropriate, notify you in
            the app.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>{title}</h2>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}
