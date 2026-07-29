"use client";
import { ReactNode } from "react";
import { Palette, Bell, Headphones, Timer, Download, Shield, Sun, Moon, Monitor, Layers } from "lucide-react";
import { ThemeMode, TabBarStyle, UserSettings } from "@/types";
import { useApp } from "@/store";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

const MODES: { key: ThemeMode; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "light",  label: "Light",  Icon: Sun },
  { key: "dark",   label: "Dark",   Icon: Moon },
  { key: "system", label: "System", Icon: Monitor },
];

const SLEEP_PRESETS = [
  { label: "Off", value: 0 }, { label: "15 min", value: 15 },
  { label: "30 min", value: 30 }, { label: "45 min", value: 45 },
  { label: "End of episode", value: -1 },
];

export default function SettingsScreen() {
  const settings = useApp(s => s.settings);
  const setSettings = useApp(s => s.setSettings);
  const setThemeMode = useApp(s => s.setThemeMode);
  const setTabBarStyle = useApp(s => s.setTabBarStyle);

  // Every toggle writes to the local store, which applies instantly;
  // SettingsSync pushes it to the server in the background.
  const setGroup = <K extends keyof UserSettings>(group: K, patch: Partial<UserSettings[K]>) => {
    setSettings({ [group]: { ...(settings[group] as object), ...patch } } as Partial<UserSettings>);
  };

  return (
    <>
      <TopBar title="Settings"/>
      <Screen>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Settings
        </h1>

        {/* ── Appearance ── */}
        <Group icon={<Palette size={15}/>} title="Appearance" sub="Mode and tab bar style">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {MODES.map(({ key, label, Icon }) => {
              const on = settings.themeMode === key;
              return (
                <button key={key} onClick={() => setThemeMode(key)}
                  style={{
                    padding: "12px 6px", borderRadius: 14, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    background: on ? "var(--grad)" : "var(--surface2)",
                    color: on ? "#fff" : "var(--text2)",
                    border: `1px solid ${on ? "transparent" : "var(--border2)"}`,
                  }}>
                  <Icon size={16}/>{label}
                </button>
              );
            })}
          </div>

          <Label>Tab bar style</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["transparent", "normal"] as TabBarStyle[]).map(k => {
              const on = settings.tabBarStyle === k;
              return (
                <button key={k} onClick={() => setTabBarStyle(k)}
                  style={{
                    padding: "11px 8px", borderRadius: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", fontFamily: "inherit",
                    background: on ? "var(--grad)" : "var(--surface2)",
                    color: on ? "#fff" : "var(--text2)",
                    border: `1px solid ${on ? "transparent" : "var(--border2)"}`,
                  }}>
                  <Layers size={14}/>{k}
                </button>
              );
            })}
          </div>
        </Group>

        {/* ── Notifications ── */}
        <Group icon={<Bell size={15}/>} title="Notifications" sub="What we ping you about">
          <Toggle label="New episode drops" on={settings.notif.episodeDrops} set={v => setGroup("notif", { episodeDrops: v })}/>
          <Toggle label="Creator stories & messages" on={settings.notif.creatorStories} set={v => setGroup("notif", { creatorStories: v })}/>
          <Toggle label="Coin rewards & streaks" on={settings.notif.coinRewards} set={v => setGroup("notif", { coinRewards: v })}/>
          <Toggle label="Replies to my 💬 thoughts" on={settings.notif.thoughtReplies} set={v => setGroup("notif", { thoughtReplies: v })}/>
          <Toggle label="Weekly recap" on={settings.notif.weeklyRecap} set={v => setGroup("notif", { weeklyRecap: v })} last/>
        </Group>

        {/* ── Playback ── */}
        <Group icon={<Headphones size={15}/>} title="Playback" sub="How your audio behaves">
          <Toggle label="Autoplay next episode" on={settings.playback.autoplayNext} set={v => setGroup("playback", { autoplayNext: v })}/>
          <Toggle label="Skip intro automatically" on={settings.playback.skipIntro} set={v => setGroup("playback", { skipIntro: v })}/>
          <Toggle label="Fade out on sleep timer" on={settings.playback.fadeOnSleep} set={v => setGroup("playback", { fadeOnSleep: v })}/>
          <Toggle label="Data saver streaming" on={settings.playback.dataSaver} set={v => setGroup("playback", { dataSaver: v })} last/>
        </Group>

        {/* ── Sleep timer ── */}
        <Group icon={<Timer size={15}/>} title="Sleep timer default" sub="Applied when you start a night session">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SLEEP_PRESETS.map(p => (
              <button key={p.label} className="chip"
                data-active={settings.sleepTimerDefault === p.value}
                onClick={() => setSettings({ sleepTimerDefault: p.value })}>
                {p.label}
              </button>
            ))}
          </div>
        </Group>

        {/* ── Downloads ── */}
        <Group icon={<Download size={15}/>} title="Downloads" sub="Offline listening">
          <Toggle label="Download over Wi-Fi only" on={settings.downloads.wifiOnly} set={v => setGroup("downloads", { wifiOnly: v })}/>
          <Toggle label="Auto-download next 3 episodes" on={settings.downloads.autoDownloadNext} set={v => setGroup("downloads", { autoDownloadNext: v })} last/>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, lineHeight: 1.6 }}>
            These preferences are saved, but offline downloads themselves
            aren&apos;t implemented yet — audio still streams.
          </p>
        </Group>

        {/* ── Privacy ── */}
        <Group icon={<Shield size={15}/>} title="Privacy" sub="You're in control">
          <Toggle label="Private listening (hide activity)" on={settings.privacy.privateListening} set={v => setGroup("privacy", { privateListening: v })}/>
          <Toggle label="Allow messages from anyone" on={settings.privacy.allowMessages} set={v => setGroup("privacy", { allowMessages: v })}/>
          <Toggle label="Show my 💬 thoughts publicly" on={settings.privacy.publicThoughts} set={v => setGroup("privacy", { publicThoughts: v })} last/>
        </Group>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text3)" }}>SWARA FM · v1.0.0</p>
      </Screen>
    </>
  );
}

function Group({
  icon, title, sub, children,
}: { icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ color: "var(--accent)", display: "flex" }}>{icon}</span>
        <span>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{title}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>{sub}</span>
        </span>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>{children}</div>
  );
}

function Toggle({
  label, on, set, last,
}: { label: string; on: boolean; set: (v: boolean) => void; last?: boolean }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "11px 0", cursor: "pointer",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13.5, color: "var(--text)" }}>{label}</span>
      <span className="toggle">
        <input type="checkbox" checked={on} onChange={e => set(e.target.checked)}/>
        <span className="toggle-track"/>
      </span>
    </label>
  );
}
