/** Drag + resize finestre stile XP */

export function enableWindowChrome(win) {
  if (win.dataset.chrome === "1") return;
  win.dataset.chrome = "1";

  const title = win.querySelector(".window__title");
  if (!title) return;

  // maniglie resize
  for (const dir of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const h = document.createElement("div");
    h.className = `resize-handle resize-handle--${dir}`;
    h.dataset.dir = dir;
    win.appendChild(h);
  }

  let mode = null; // 'drag' | 'resize'
  let dir = null;
  let startX = 0;
  let startY = 0;
  let startL = 0;
  let startT = 0;
  let startW = 0;
  let startH = 0;

  const minW = 320;
  const minH = 200;

  function onMove(e) {
    if (!mode) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const desk = document.getElementById("desktop");
    const maxW = desk.clientWidth - 8;
    const maxH = desk.clientHeight - 36;

    if (mode === "drag") {
      let left = startL + dx;
      let top = startT + dy;
      left = Math.max(0, Math.min(left, maxW - 80));
      top = Math.max(0, Math.min(top, maxH - 40));
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
      win.style.right = "auto";
      win.style.transform = "none";
      return;
    }

    let left = startL;
    let top = startT;
    let w = startW;
    let h = startH;

    if (dir.includes("e")) w = Math.min(maxW - left, Math.max(minW, startW + dx));
    if (dir.includes("s")) h = Math.min(maxH - top, Math.max(minH, startH + dy));
    if (dir.includes("w")) {
      const nw = Math.max(minW, startW - dx);
      left = startL + (startW - nw);
      if (left < 0) {
        w = startW + startL;
        left = 0;
      } else w = nw;
    }
    if (dir.includes("n")) {
      const nh = Math.max(minH, startH - dy);
      top = startT + (startH - nh);
      if (top < 0) {
        h = startH + startT;
        top = 0;
      } else h = nh;
    }

    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.transform = "none";
  }

  function onUp() {
    mode = null;
    dir = null;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  }

  title.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".window__controls")) return;
    e.preventDefault();
    const r = win.getBoundingClientRect();
    const desk = document.getElementById("desktop").getBoundingClientRect();
    mode = "drag";
    startX = e.clientX;
    startY = e.clientY;
    startL = r.left - desk.left;
    startT = r.top - desk.top;
    startW = r.width;
    startH = r.height;
    win.style.left = `${startL}px`;
    win.style.top = `${startT}px`;
    win.style.width = `${startW}px`;
    win.style.transform = "none";
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });

  win.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = win.getBoundingClientRect();
      const desk = document.getElementById("desktop").getBoundingClientRect();
      mode = "resize";
      dir = handle.dataset.dir;
      startX = e.clientX;
      startY = e.clientY;
      startL = r.left - desk.left;
      startT = r.top - desk.top;
      startW = r.width;
      startH = r.height;
      win.style.left = `${startL}px`;
      win.style.top = `${startT}px`;
      win.style.width = `${startW}px`;
      win.style.height = `${startH}px`;
      win.style.transform = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  });

  win.querySelector(".window__ctrl--max")?.addEventListener("click", () => {
    if (win.dataset.maximized === "1") {
      win.style.left = win.dataset.prevL || "10%";
      win.style.top = win.dataset.prevT || "8%";
      win.style.width = win.dataset.prevW || "min(720px, 90vw)";
      win.style.height = win.dataset.prevH || "";
      win.dataset.maximized = "0";
    } else {
      const r = win.getBoundingClientRect();
      const desk = document.getElementById("desktop").getBoundingClientRect();
      win.dataset.prevL = `${r.left - desk.left}px`;
      win.dataset.prevT = `${r.top - desk.top}px`;
      win.dataset.prevW = `${r.width}px`;
      win.dataset.prevH = `${r.height}px`;
      win.style.left = "4px";
      win.style.top = "4px";
      win.style.width = `${desk.width - 8}px`;
      win.style.height = `${desk.height - 38}px`;
      win.style.transform = "none";
      win.dataset.maximized = "1";
    }
  });
}

export function initAllWindows() {
  document.querySelectorAll(".window").forEach(enableWindowChrome);
}
