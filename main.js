document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const spotlight = document.querySelector('.spotlight');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // 1. Theme Sync
    const applyTheme = (matches) => body.classList.toggle('dark', matches);
    applyTheme(prefersDark.matches);
    prefersDark.addEventListener('change', (e) => applyTheme(e.matches));

    // 2. Spotlight Parallax
    if (!('ontouchstart' in window)) {
        document.addEventListener('mousemove', (e) => {
            if (!spotlight) return;
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            spotlight.style.left = `${x}%`;
            spotlight.style.top = `${y}%`;
        });
    }

    // 3. Reveal Animation
    const hero = document.querySelector('.hero-container');
    setTimeout(() => {
        hero.style.opacity = "1";
        hero.style.transform = "translateY(0)";
        hero.style.transition = "all 1s cubic-bezier(0.16, 1, 0.3, 1)";
    }, 100);
});
