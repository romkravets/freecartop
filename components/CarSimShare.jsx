'use client';

import { useState } from 'react';

function fmt(n)  { return Number(n).toLocaleString('en-US'); }
function fmtD(n) { return `$${fmt(n)}`; }

export default function CarSimShare({ car1Result, car2Result, car1Profile, car2Profile }) {
  const [copied, setCopied] = useState(false);

  const isRace  = Boolean(car2Result);
  const winner  = isRace
    ? (car1Result.perMonth <= car2Result.perMonth ? 'car1' : 'car2')
    : null;

  function buildShareText() {
    if (!isRace) {
      const r = car1Result;
      return [
        `🚗 ${car1Profile.make} ${car1Profile.model} ${car1Profile.year} — 5 років симуляції`,
        `💰 Реальна вартість: ${fmtD(r.perMonth)}/міс`,
        `🔧 Двигун після 5р: ${r.finalEngine}/100`,
        `📦 Залишкова ціна: ${fmtD(r.resaleVal)}`,
        ``,
        `freecartop.vercel.app`,
      ].join('\n');
    }

    const r1 = car1Result, r2 = car2Result;
    const win  = winner === 'car1' ? car1Profile : car2Profile;
    const los  = winner === 'car1' ? car2Profile : car1Profile;
    const winR = winner === 'car1' ? r1 : r2;
    const losR = winner === 'car1' ? r2 : r1;
    const diff = Math.abs(r1.realCost - r2.realCost);

    const gameOverLine = losR.gameOver
      ? `${los.make} продали на ${losR.gameOver.year}-му році — ${
          losR.gameOver.type === 'stress'  ? 'нерви не витримали 😅' :
          losR.gameOver.type === 'engine'  ? 'двигун помер 💀' :
                                             'ремонти з\'їли авто 🔩'
        }`
      : '';

    return [
      `⚔️ ${win.make} ${win.model} vs ${los.make} ${los.model} — дуель на 5 років`,
      `🏆 ${win.make}: ${fmtD(winR.perMonth)}/міс`,
      `💸 ${los.make}: ${fmtD(losR.perMonth)}/міс (+${fmtD(diff)} за 5р)`,
      gameOverLine,
      ``,
      `freecartop.vercel.app`,
    ].filter(Boolean).join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!car1Result) return null;

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-800/30 rounded-2xl p-5 space-y-4">
      <div className="text-xs uppercase tracking-widest text-amber-500 font-bold">
        🚗 FreeCar Top · {isRace ? '5-річна дуель' : '5-річна симуляція'}
      </div>

      {isRace ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { profile: car1Profile, result: car1Result, isWinner: winner === 'car1' },
            { profile: car2Profile, result: car2Result, isWinner: winner === 'car2' },
          ].map(({ profile, result, isWinner }) => (
            <div
              key={profile.make + profile.model}
              className={`rounded-xl p-3 text-center ${isWinner
                ? 'bg-green-950/50 border border-green-800'
                : 'bg-red-950/30 border border-red-900'}`}
            >
              <div className={`text-xs font-bold mb-1 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? '🏆 ПЕРЕМОЖЕЦЬ' : '💸 ДОРОЖЧЕ'}
              </div>
              <div className="text-sm font-bold text-white">{profile.make} {profile.model}</div>
              <div className={`text-xl font-black font-mono mt-1 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {fmtD(result.perMonth)}/міс
              </div>
              {result.gameOver && (
                <div className="text-xs text-red-500 mt-1">вийшов р.{result.gameOver.year}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <div className="text-xs text-zinc-500 mb-1">Реальна вартість</div>
          <div className="text-3xl font-black font-mono text-amber-400">{fmtD(car1Result.perMonth)}/міс</div>
          <div className="text-xs text-zinc-500 mt-1">
            {car1Profile.make} {car1Profile.model} {car1Profile.year}
          </div>
        </div>
      )}

      {isRace && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-amber-400 font-black font-mono text-lg">
            {fmtD(Math.abs(car1Result.realCost - car2Result.realCost))}
          </div>
          <div className="text-xs text-zinc-500">різниця в реальних витратах за 5 років</div>
        </div>
      )}

      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm"
      >
        {copied ? '✅ Скопійовано!' : '📱 Поділитись результатом'}
      </button>
    </div>
  );
}
