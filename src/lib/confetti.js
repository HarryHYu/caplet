import confetti from 'canvas-confetti';

/** A quick single burst — used for "you got it right" moments. */
export function fireCelebration(originY = 0.6) {
  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 35,
    origin: { y: originY },
  });
}

/** A brighter, longer two-sided volley — reserved for podium / session-end moments. */
export function firePodiumBurst() {
  const end = Date.now() + 1400;
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.5 }, colors });
}
