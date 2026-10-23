/**
 * Visor de fotos normales ("recorrido guiado").
 *
 * - Muestra primero la versión ligera (preview) y la sustituye por la de alta
 *   resolución cuando termina de descargarse (carga progresiva).
 * - Efecto Ken Burns: zoom y desplazamiento lentos mientras nadie toca la imagen.
 * - Arrastrar para desplazarse, rueda/pellizco/doble toque para hacer zoom.
 * - Hotspots posicionados en % de la foto; mantienen su tamaño al hacer zoom.
 */
export class FlatViewer {
  constructor(el, { onHotspot, onInteract, renderHotspot }) {
    this.el = el;
    this.onHotspot = onHotspot;
    this.onInteract = onInteract;
    this.renderHotspot = renderHotspot;
    this.state = { s: 1, x: 0, y: 0 };
    this.pointers = new Map();
    this.anim = null;

    this.bg = document.createElement('div');
    this.bg.className = 'flat-bg';
    this.frame = document.createElement('div');
    this.frame.className = 'flat-frame';
    el.append(this.bg, this.frame);

    el.addEventListener('pointerdown', (e) => this.#down(e));
    window.addEventListener('pointermove', (e) => this.#move(e));
    window.addEventListener('pointerup', (e) => this.#up(e));
    window.addEventListener('pointercancel', (e) => this.#up(e));
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.#interact();
      this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });
    el.addEventListener('dblclick', (e) => {
      this.#interact();
      const cover = this.#cover();
      this.zoomAt(this.state.s > cover * 1.3 ? cover / this.state.s : 2, e.clientX, e.clientY);
    });
    window.addEventListener('resize', () => this.#onResize());
  }

  /** Muestra una estancia. Resuelve cuando la preview está pintada. */
  show(room) {
    this.stopKenBurns();
    this.room = room;
    this.iw = room.width || 1600;
    this.ih = room.height || 1067;
    this.frame.innerHTML = '';
    this.frame.style.width = `${this.iw}px`;
    this.frame.style.height = `${this.ih}px`;
    this.bg.style.backgroundImage = `url("${room.preview}")`;

    const base = new Image();
    base.alt = room.name;
    base.decoding = 'async';
    const hd = new Image();
    hd.className = 'hd';
    hd.alt = '';
    this.frame.append(base, hd);

    for (const h of room.hotspots) {
      const node = this.renderHotspot(h);
      node.style.left = `${h.x}%`;
      node.style.top = `${h.y}%`;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onHotspot(h);
      });
      node.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.frame.append(node);
    }
    this.#fit();

    return new Promise((resolve) => {
      base.onload = base.onerror = () => {
        resolve();
        // Alta resolución en segundo plano (si el usuario sigue en esta estancia)
        hd.onload = () => this.room === room && hd.classList.add('ready');
        hd.src = room.full;
      };
      base.src = room.preview || room.full;
    });
  }

  /** Arranca el efecto Ken Burns durante `seconds` segundos. */
  startKenBurns(seconds = 10) {
    this.stopKenBurns();
    const cover = this.#cover();
    const { W, H } = this.#viewport();
    // Si la foto sobra en horizontal (móvil en vertical) se hace un barrido lateral
    const panX = this.iw * cover > W * 1.15;
    const flip = Math.random() < 0.5;
    const from = { s: cover * 1.02, cx: panX ? (flip ? 0.25 : 0.75) : 0.45, cy: 0.5 };
    const to = { s: cover * (panX ? 1.06 : 1.16), cx: panX ? (flip ? 0.75 : 0.25) : 0.55, cy: panX ? 0.5 : 0.46 };
    const t0 = performance.now();
    const dur = seconds * 1000;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      const s = from.s + (to.s - from.s) * k;
      const cx = from.cx + (to.cx - from.cx) * k;
      const cy = from.cy + (to.cy - from.cy) * k;
      this.#set(s, W / 2 - cx * this.iw * s, H / 2 - cy * this.ih * s);
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  stopKenBurns() {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = null;
  }

  /** Zoom manteniendo fijo el punto (px, py) de la pantalla. */
  zoomAt(factor, px, py) {
    const r = this.el.getBoundingClientRect();
    px = (px ?? r.left + r.width / 2) - r.left;
    py = (py ?? r.top + r.height / 2) - r.top;
    const { s, x, y } = this.state;
    const ns = Math.min(Math.max(s * factor, this.#contain()), this.#cover() * 4);
    this.#set(ns, px - ((px - x) / s) * ns, py - ((py - y) / s) * ns);
  }

  zoom(factor) {
    this.#interact();
    this.zoomAt(factor);
  }

  // --- internos -----------------------------------------------------------
  #viewport() {
    return { W: this.el.clientWidth || window.innerWidth, H: this.el.clientHeight || window.innerHeight };
  }
  #cover() {
    const { W, H } = this.#viewport();
    return Math.max(W / this.iw, H / this.ih);
  }
  #contain() {
    const { W, H } = this.#viewport();
    return Math.min(W / this.iw, H / this.ih);
  }
  #fit() {
    const { W, H } = this.#viewport();
    const s = this.#cover();
    this.#set(s, (W - this.iw * s) / 2, (H - this.ih * s) / 2);
  }
  /** Aplica escala/traslación limitando para que no queden huecos innecesarios. */
  #set(s, x, y) {
    const { W, H } = this.#viewport();
    const fw = this.iw * s, fh = this.ih * s;
    x = fw <= W ? (W - fw) / 2 : Math.min(0, Math.max(W - fw, x));
    y = fh <= H ? (H - fh) / 2 : Math.min(0, Math.max(H - fh, y));
    this.state = { s, x, y };
    this.frame.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    // Los hotspots se contraescalan para mantener su tamaño en pantalla
    this.frame.style.setProperty('--inv', 1 / s);
  }
  #onResize() {
    if (!this.room) return;
    const { s } = this.state;
    const cover = this.#cover();
    if (this.anim || s < cover) this.#fit();
    else this.#set(s, this.state.x, this.state.y);
  }
  #interact() {
    this.stopKenBurns();
    this.onInteract?.();
  }
  #down(e) {
    if (e.button !== undefined && e.button > 0) return;
    this.#interact();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.el.classList.add('dragging');
    this.pinch = null;
  }
  #move(e) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);
    if (this.pointers.size === 1) {
      this.#set(this.state.s, this.state.x + cur.x - prev.x, this.state.y + cur.y - prev.y);
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (this.pinch) this.zoomAt(dist / this.pinch, mid.x, mid.y);
      this.pinch = dist;
    }
  }
  #up(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size < 2) this.pinch = null;
    if (!this.pointers.size) this.el.classList.remove('dragging');
  }
}
