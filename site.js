(() => {
  /* À l'arrivée sur une page : toujours en haut, sauf si le lien vise une section (#donnees…).
     Le navigateur ne doit pas rétablir la position de défilement de la visite précédente. */
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  const place = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  place();
  addEventListener('load', place, { once: true });
  addEventListener('pageshow', (e) => { if (e.persisted) place(); });
})();

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* En-tête : filet sous la barre une fois qu'on a défilé */
  const header = document.querySelector('.site-header');
  const callbar = document.querySelector('.callbar');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 8);
    // Barre d'appel mobile : se cache en descendant, revient dès qu'on remonte
    if (callbar) callbar.classList.toggle('hidden', y > lastY && y > 400);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Révélations au défilement : une seule fois, un peu avant que l'élément n'entre */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); e.target.classList.remove('wait'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal, .fade').forEach((el) => {
    // On ne cache que ce qui est encore hors écran : rien ne disparaît sous les yeux
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('wait'); io.observe(el); }
  });

  /* Menu mobile */
  const drawer = document.getElementById('drawer');
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn && drawer) {
  const setDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector('nav a').focus({ preventScroll: true });
    else menuBtn.focus({ preventScroll: true });
  };
  menuBtn.addEventListener('click', () => setDrawer(true));
  drawer.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => setDrawer(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* Onglets de tarifs : on découpe le calque « actif » autour de l'onglet choisi */
  const tabs = document.querySelector('[data-tabs]');
  if (tabs) {
    const list = tabs.querySelector('[role="tablist"]');
    const layer = tabs.querySelector('.active-layer');
    const btns = [...list.querySelectorAll('[role="tab"]')];
    const place = (btn, instant) => {
      const w = layer.offsetWidth;
      const l = btn.offsetLeft - list.offsetLeft;
      const r = w - (l + btn.offsetWidth);
      if (instant) layer.style.transition = 'none';
      layer.style.setProperty('--l', l + 'px');
      layer.style.setProperty('--r', r + 'px');
      if (instant) { layer.offsetWidth; layer.style.transition = ''; }
    };
    const select = (btn, fromKeyboard) => {
      btns.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('on', on);
      });
      // Clavier : pas d'animation, l'action doit paraître instantanée
      place(btn, fromKeyboard);
    };
    btns.forEach((b) => b.addEventListener('click', () => select(b, false)));
    list.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = btns[(i + 1) % btns.length];
      if (e.key === 'ArrowLeft') n = btns[(i - 1 + btns.length) % btns.length];
      if (e.key === 'Home') n = btns[0];
      if (e.key === 'End') n = btns[btns.length - 1];
      if (n) { e.preventDefault(); n.focus(); select(n, true); }
    });
    const init = () => place(btns.find((b) => b.getAttribute('aria-selected') === 'true'), true);
    document.fonts ? document.fonts.ready.then(init) : init();
    addEventListener('resize', init);
  }

  /* Formulaire (maquette) : état d'envoi puis toast */
  const form = document.getElementById('devis');
  const toast = (text) => {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
    t.querySelector('span').textContent = text;
    document.body.appendChild(t);
    let timer;
    const leave = () => { t.classList.add('leaving'); setTimeout(() => t.remove(), 220); };
    const start = () => { clearTimeout(timer); timer = setTimeout(leave, 4200); };
    // Le minuteur se met en pause si l'onglet est caché ou si on survole le toast
    document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : start()));
    t.addEventListener('pointerenter', () => clearTimeout(timer));
    t.addEventListener('pointerleave', start);
    start();
  };
  if (form) {
    const btn = form.querySelector('button[type="submit"]');
    const content = btn.querySelector('.btn-content');
    const swap = (html) => new Promise((res) => {
      btn.classList.add('swapping');
      setTimeout(() => { content.innerHTML = html; btn.classList.remove('swapping'); res(); }, reduce ? 0 : 120);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true;
      await swap('<span class="spinner" aria-hidden="true"></span>Envoi…');
      await new Promise((r) => setTimeout(r, 900));
      await swap('Demande envoyée');
      toast('Merci, un plombier vous rappelle sous 2 h.');
      setTimeout(async () => { await swap('Envoyer ma demande'); btn.disabled = false; form.reset(); }, 2600);
    });
  }

  /* Mentions légales : bouton Imprimer / PDF (la fenêtre d'impression propose « Enregistrer au format PDF ») */
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

  /* Sommaire : surligne la section en cours de lecture */
  const toc = document.querySelector('.ml-toc');
  if (toc) {
    const links = new Map([...toc.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('on'));
        links.get(e.target.id)?.classList.add('on');
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('.ml-sec').forEach((s) => spy.observe(s));
  }
})();
