// 聊天提示音工具：基于 Web Audio 生成简单音效，避免依赖额外音频资源。
export type ChatSoundKind = "incomingCall" | "hangup" | "message" | (string & {});

let miniChatSessionId: string | null = null;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function beep(frequency: number, durationMs: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // 忽略播放失败
  }
}

const FREQUENCIES: Record<string, number> = { incomingCall: 660, hangup: 330, message: 880 };

export function setMiniChatSoundSessionId(sessionId: string | null) {
  miniChatSessionId = sessionId;
}

export function getMiniChatSoundSessionId() {
  return miniChatSessionId;
}

export function playChatSoundOnce(kind: ChatSoundKind, _session?: unknown) {
  beep(FREQUENCIES[kind] ?? 600, 250);
}

export function startChatSoundLoop(kind: ChatSoundKind, session?: unknown): () => void {
  if (typeof window === "undefined") return () => {};
  playChatSoundOnce(kind, session);
  const timer = window.setInterval(() => playChatSoundOnce(kind, session), 1500);
  return () => window.clearInterval(timer);
}

export function installChatSoundListener(): () => void {
  if (typeof window === "undefined") return () => {};
  // 浏览器要求用户交互后才能播放音频：首次交互时恢复 AudioContext
  const resume = () => {
    void getAudioContext()?.resume?.();
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  return () => {
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
  };
}
