/**
 * Multiplayer co-op via PeerJS (cloud pubblico).
 * Host = autorità su cash/risk/eventi. Guest riceve sync.
 * Ogni peer manda anche uno snapshot desk (spectate sola lettura).
 */

const PREFIX = "scamdesk-";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function createMultiplayer({ onStatus, onSync, onPeerEvent, onRoster, onDesk }) {
  let peer = null;
  let role = null; // "host" | "guest"
  let roomCode = null;
  let conns = new Map(); // peerId -> DataConnection
  let myName = "Operatore" + Math.floor(Math.random() * 90 + 10);

  function status(msg) {
    onStatus?.(msg);
  }

  function myId() {
    return peer?.id || null;
  }

  function roster() {
    const list = [{ id: "me", peerId: myId(), name: myName, role: role || "solo", self: true }];
    for (const [id, c] of conns) {
      if (c.open) {
        list.push({
          id,
          peerId: id,
          name: c._metaName || id.slice(0, 6),
          role: role === "host" ? "guest" : "host",
          self: false,
        });
      }
    }
    onRoster?.(list);
  }

  function broadcast(msg, exceptId) {
    const payload = JSON.stringify(msg);
    for (const [id, c] of conns) {
      if (id === exceptId || !c.open) continue;
      try {
        c.send(payload);
      } catch {
        /* ignore */
      }
    }
  }

  function sendToAll(msg) {
    if (role === "host") broadcast(msg);
    else {
      const first = [...conns.values()][0];
      try {
        first?.send(JSON.stringify(msg));
      } catch {
        /* ignore */
      }
    }
  }

  function handleMessage(data, fromId) {
    let msg;
    try {
      msg = typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return;
    }
    if (msg.type === "hello") {
      const c = conns.get(fromId);
      if (c) c._metaName = msg.name || "Guest";
      roster();
      if (role === "host") {
        c?.send(JSON.stringify({ type: "welcome", name: myName, peerId: myId() }));
      }
      return;
    }
    if (msg.type === "welcome") {
      status(`Connesso all’host (${msg.name || "host"})`);
      roster();
      return;
    }
    if (msg.type === "sync" && role === "guest") {
      onSync?.(msg.state);
      return;
    }
    if (msg.type === "desk") {
      const view = { ...msg, fromId: msg.fromId || fromId };
      onDesk?.(view);
      if (role === "host") broadcast(view, fromId);
      return;
    }
    if (msg.type === "peer") {
      // AnyDesk / remote: host inoltra al destinatario
      const target = msg.toId;
      const enriched = { ...msg, fromId: msg.fromId || fromId };
      if (role === "host") {
        if (target === myId()) onPeerEvent?.(enriched);
        else if (target) {
          try {
            conns.get(target)?.send(JSON.stringify(enriched));
          } catch {
            /* ignore */
          }
        }
      } else {
        onPeerEvent?.(enriched);
      }
      return;
    }
    if (msg.type === "event") {
      onPeerEvent?.(msg);
      if (role === "host") broadcast(msg, fromId);
      return;
    }
    if (msg.type === "chat" || msg.type === "toast") {
      onPeerEvent?.(msg);
      if (role === "host") broadcast(msg, fromId);
    }
  }

  function wireConn(conn) {
    conns.set(conn.peer, conn);
    conn.on("data", (d) => handleMessage(d, conn.peer));
    conn.on("close", () => {
      conns.delete(conn.peer);
      status("Un collega ha lasciato la stanza");
      roster();
    });
    conn.on("open", () => {
      conn.send(JSON.stringify({ type: "hello", name: myName }));
      roster();
      status(role === "host" ? "Collega connesso!" : "In stanza");
    });
  }

  function destroyPeer() {
    for (const c of conns.values()) {
      try {
        c.close();
      } catch {
        /* ignore */
      }
    }
    conns.clear();
    try {
      peer?.destroy();
    } catch {
      /* ignore */
    }
    peer = null;
    role = null;
    roomCode = null;
    roster();
  }

  return {
    get role() {
      return role;
    },
    get roomCode() {
      return roomCode;
    },
    get myName() {
      return myName;
    },
    get peerId() {
      return myId();
    },
    setName(n) {
      myName = String(n || myName).slice(0, 18);
    },
    isHost() {
      return role === "host";
    },
    isConnected() {
      return Boolean(role) && peer;
    },
    peerCount() {
      return [...conns.values()].filter((c) => c.open).length;
    },
    async host() {
      destroyPeer();
      if (!window.Peer) throw new Error("PeerJS non caricato");
      roomCode = randomCode();
      role = "host";
      const id = PREFIX + roomCode.toLowerCase();
      status("Creazione stanza…");
      peer = new window.Peer(id);
      await new Promise((resolve, reject) => {
        peer.on("open", resolve);
        peer.on("error", reject);
        setTimeout(() => reject(new Error("Timeout PeerJS")), 12000);
      });
      peer.on("connection", (conn) => wireConn(conn));
      peer.on("error", (e) => status(`Rete: ${e.type || e.message || e}`));
      status(`Stanza ${roomCode} — condividi il codice`);
      roster();
      return roomCode;
    },
    async join(code) {
      destroyPeer();
      if (!window.Peer) throw new Error("PeerJS non caricato");
      const clean = String(code || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (clean.length < 4) throw new Error("Codice troppo corto");
      roomCode = clean;
      role = "guest";
      status("Connessione…");
      peer = new window.Peer();
      await new Promise((resolve, reject) => {
        peer.on("open", resolve);
        peer.on("error", reject);
        setTimeout(() => reject(new Error("Timeout PeerJS")), 12000);
      });
      const conn = peer.connect(PREFIX + clean.toLowerCase(), { reliable: true });
      wireConn(conn);
      peer.on("error", (e) => status(`Rete: ${e.type || e.message || e}`));
      return roomCode;
    },
    leave() {
      destroyPeer();
      status("Disconnesso");
    },
    /** Host spinge lo stato condiviso. */
    pushState(stateSlice) {
      if (role !== "host") return;
      broadcast({ type: "sync", state: stateSlice });
    },
    /** Qualunque peer può mandare un evento (host lo ribalta). */
    sendEvent(evt) {
      const msg = { type: "event", ...evt, from: myName };
      if (role === "host") broadcast(msg);
      else {
        const first = [...conns.values()][0];
        first?.send(JSON.stringify(msg));
      }
      onPeerEvent?.(msg);
    },
    sendToast(text) {
      this.sendEvent({ kind: "toast", text });
    },
    /** Snapshot desk in sola lettura (non modifica lo stato host). */
    pushDesk(view) {
      if (!role || !peer) return;
      sendToAll({
        type: "desk",
        from: myName,
        fromId: myId(),
        view,
        at: Date.now(),
      });
    },
    /** Messaggio diretto a un peer (via host se serve). */
    sendToPeer(toId, payload) {
      if (!role || !toId) return;
      const msg = {
        type: "peer",
        toId,
        from: myName,
        fromId: myId(),
        ...payload,
        at: Date.now(),
      };
      if (role === "host") {
        const c = conns.get(toId);
        try {
          c?.send(JSON.stringify(msg));
        } catch {
          /* ignore */
        }
      } else {
        const first = [...conns.values()][0];
        try {
          first?.send(JSON.stringify(msg));
        } catch {
          /* ignore */
        }
      }
    },
  };
}
