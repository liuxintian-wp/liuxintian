'use strict';
// 장식용 효과: 떠다니는 비눗방울과 클릭 반짝이. 동작 줄이기 설정이면 실행하지 않습니다.
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['#ffc6d9', '#ffe08a', '#bfe7ff', '#d9c8ff', '#c8f0d2'];

  // 1) 배경에 떠다니는 비눗방울
  const layer = document.createElement('div');
  layer.className = 'bubbles';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('span');
    const size = 14 + Math.random() * 34;
    b.style.width = b.style.height = `${size}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.background = colors[i % colors.length];
    b.style.animationDuration = `${12 + Math.random() * 14}s`;
    b.style.animationDelay = `${-Math.random() * 20}s`;
    layer.appendChild(b);
  }
  document.body.prepend(layer);

  // 2) 클릭하면 작은 별과 하트가 퍼짐
  const shapes = ['★', '♥', '✦', '●'];
  document.addEventListener('pointerdown', (e) => {
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = shapes[i % shapes.length];
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      s.style.color = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 40 + Math.random() * 30;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  });
})();
