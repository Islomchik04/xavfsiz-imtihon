// "O'tdi" natijasi belgilanganda chiqadigan vizual (konfetti/pufak) va
// tovush effekti. Ikkalasi ham faqat brauzerda ishlaydi va xato bo'lsa ham
// asosiy funksionallikka (natijani saqlash) ta'sir qilmasligi kerak.

export function otdiEffekti() {
  if (typeof window === "undefined") return;

  import("canvas-confetti")
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 42,
        origin: { y: 0.6 },
        colors: ["#16a34a", "#22c55e", "#facc15", "#0ea5e9", "#ffffff"],
      });
      confetti({ particleCount: 35, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 35, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    })
    .catch(() => {});

  ovozChal();
}

function ovozChal() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notalar = [523.25, 659.25, 783.99]; // Do-Mi-Sol — quvonchli akkord
    notalar.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const boshlanish = now + i * 0.08;
      gain.gain.setValueAtTime(0, boshlanish);
      gain.gain.linearRampToValueAtTime(0.18, boshlanish + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, boshlanish + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(boshlanish);
      osc.stop(boshlanish + 0.55);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    // Ovoz ishlamasa (masalan brauzer bloklasa) jim o'tkazamiz
  }
}
