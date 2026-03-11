import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  Network,
  Swords,
  Search,
  Loader2,
  AlertCircle,
  Upload,
  LayoutGrid,
  Orbit,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grip,
  Pencil,
  Save,
  X,
} from "lucide-react";

const starterCards = [
  {
    id: crypto.randomUUID(),
    name: "Skrelv, Defector Mite",
    manaValue: 1,
    types: "Phyrexian Mite",
    isArtifact: true,
    isCreature: true,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Spellskite",
    manaValue: 2,
    types: "Phyrexian Horror",
    isArtifact: true,
    isCreature: true,
    isChangeling: false,
    isImportant: true,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Adaptive Automaton",
    manaValue: 3,
    types: "Construct",
    isArtifact: true,
    isCreature: true,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Mirror Entity",
    manaValue: 3,
    types: "Shapeshifter",
    isArtifact: false,
    isCreature: true,
    isChangeling: true,
    isImportant: true,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Amoeboid Changeling",
    manaValue: 2,
    types: "Shapeshifter",
    isArtifact: false,
    isCreature: true,
    isChangeling: true,
    isImportant: false,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Pyre of Heroes",
    manaValue: 2,
    types: "",
    isArtifact: true,
    isCreature: false,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Oswald Fiddlebender",
    manaValue: 2,
    types: "Gnome Artificer",
    isArtifact: false,
    isCreature: true,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
  },
];

const creatureTypeSuggestions = [
  "Advisor",
  "Angel",
  "Artificer",
  "Cleric",
  "Construct",
  "Dragon",
  "Druid",
  "Elemental",
  "Elf",
  "Faerie",
  "Goblin",
  "Horror",
  "Human",
  "Knight",
  "Mite",
  "Phyrexian",
  "Pirate",
  "Rebel",
  "Rogue",
  "Shapeshifter",
  "Soldier",
  "Spirit",
  "Vampire",
  "Warrior",
  "Wizard",
];

function normalizeType(type) {
  return type.trim().toLowerCase();
}

function extractCreatureTypesFromTypeLine(typeLine) {
  if (!typeLine) return "";
  const pieces = typeLine.split(/[—-]/);
  if (pieces.length < 2) return "";
  return pieces[1].trim();
}

function parseScryfallCard(card) {
  const typeLine = card.type_line || "";
  const oracleText = card.oracle_text || "";
  const isArtifact = typeLine.toLowerCase().includes("artifact");
  const isCreature = typeLine.toLowerCase().includes("creature");
  const isChangeling = /changeling/i.test(oracleText);

  const imageUrl =
    card.image_uris?.small ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.small ||
    card.card_faces?.[0]?.image_uris?.normal ||
    "";

  return {
    name: card.name || "",
    manaValue: Number(card.cmc ?? 0),
    types: extractCreatureTypesFromTypeLine(typeLine),
    isArtifact,
    isCreature,
    isChangeling,
    imageUrl,
  };
}

function parseBulkImportLine(rawLine) {
  let line = rawLine.trim();
  if (!line) return null;
  if (line.startsWith("//") || line.startsWith("#")) return null;

  let isImportant = false;
  let forceChangeling = false;

  if (/\*/.test(line) || /\[important\]/i.test(line) || /\!important/i.test(line)) {
    isImportant = true;
  }
  if (/\[changeling\]/i.test(line) || /\!changeling/i.test(line)) {
    forceChangeling = true;
  }

  line = line
    .replace(/\[important\]/gi, "")
    .replace(/\!important/gi, "")
    .replace(/\[changeling\]/gi, "")
    .replace(/\!changeling/gi, "")
    .replace(/\*/g, "")
    .trim();

  line = line.replace(/^\d+x?\s+/i, "").trim();

  if (!line) return null;

  return {
    name: line,
    isImportant,
    forceChangeling,
  };
}

async function fetchScryfallCardByName(name) {
  const attempts = [
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
  ];

  for (const url of attempts) {
    const response = await fetch(url);
    const payload = await response.json();
    if (response.ok && payload?.object !== "error") {
      return payload;
    }
  }

  throw new Error(`Card not found: ${name}`);
}

function getCreatureTypes(card) {
  if (!card.isCreature) return [];
  if (card.isChangeling) return ["__all_types__"];
  return card.types
    .split(/[,/]/)
    .map((t) => normalizeType(t))
    .flatMap((t) => t.split(/\s+/))
    .filter(Boolean)
    .filter((t) => t !== "artifact" && t !== "creature");
}

function sharesCreatureType(a, b) {
  const aTypes = getCreatureTypes(a);
  const bTypes = getCreatureTypes(b);
  if (!a.isCreature || !b.isCreature) return false;
  if (a.isChangeling || b.isChangeling) return true;
  const setB = new Set(bTypes);
  return aTypes.some((type) => setB.has(type));
}

function canOswaldTo(from, to) {
  return from.isArtifact && to.isArtifact && to.manaValue === from.manaValue + 1;
}

function canPyreTo(from, to) {
  return from.isCreature && to.isCreature && to.manaValue === from.manaValue + 1 && sharesCreatureType(from, to);
}

function badgeClasses(kind) {
  if (kind === "important") return "bg-amber-100 text-amber-900 border-amber-300";
  if (kind === "changeling") return "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300";
  if (kind === "artifact") return "bg-slate-100 text-slate-900 border-slate-300";
  if (kind === "creature") return "bg-emerald-100 text-emerald-900 border-emerald-300";
  return "bg-white text-slate-700 border-slate-300";
}

function Pill({ children, kind = "default" }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClasses(kind)}`}>{children}</span>;
}

function CardNode({ card, isRoot, onDelete, compact = false }) {
  const baseHeight = compact ? "h-16" : "h-20";
  return (
    <div
      className={`w-56 rounded-2xl border bg-white p-3 shadow-sm transition ${card.isImportant ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"} ${isRoot ? "ring-2 ring-sky-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{card.name}</div>
          <div className="mt-1 text-xs text-slate-500">Mana value {card.manaValue}</div>
        </div>
        <button onClick={() => onDelete(card.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Delete card">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {card.imageUrl ? <img src={card.imageUrl} alt={card.name} className={`mt-3 ${baseHeight} w-full rounded-xl border border-slate-200 object-cover`} /> : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.isArtifact && <Pill kind="artifact">Artifact</Pill>}
        {card.isCreature && <Pill kind="creature">Creature</Pill>}
        {card.isChangeling && <Pill kind="changeling">Changeling</Pill>}
        {card.isImportant && <Pill kind="important">Important</Pill>}
      </div>

      <div className="mt-3 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Types:</span> {card.types?.trim() ? card.types : "—"}
      </div>
    </div>
  );
}

function EdgeLegend() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Rules used</div>
      <div className="mt-2 space-y-2 text-sm text-slate-600">
        <div><span className="font-medium text-slate-800">Oswald:</span> artifact → artifact with mana value exactly +1.</div>
        <div><span className="font-medium text-slate-800">Pyre:</span> creature → creature with mana value exactly +1 and at least one shared creature type.</div>
        <div><span className="font-medium text-slate-800">Changeling:</span> treated as having all creature types for Pyre connections.</div>
      </div>
    </div>
  );
}

function buildDiagram(cards, rootId, mode) {
  const root = cards.find((c) => c.id === rootId) ?? null;
  const layersMap = new Map();
  for (const card of cards) {
    if (!layersMap.has(card.manaValue)) layersMap.set(card.manaValue, []);
    layersMap.get(card.manaValue).push(card);
  }
  const layers = [...layersMap.entries()].sort((a, b) => a[0] - b[0]).map(([manaValue, items]) => ({ manaValue, items }));

  const edges = [];
  for (const from of cards) {
    for (const to of cards) {
      if (from.id === to.id) continue;
      if ((mode === "oswald" || mode === "both") && canOswaldTo(from, to)) edges.push({ from: from.id, to: to.id, kind: "oswald" });
      if ((mode === "pyre" || mode === "both") && canPyreTo(from, to)) edges.push({ from: from.id, to: to.id, kind: "pyre" });
    }
  }

  const reachable = new Set();
  if (root) {
    const queue = [root.id];
    reachable.add(root.id);
    while (queue.length) {
      const current = queue.shift();
      for (const edge of edges) {
        if (edge.from === current && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  return { root, layers, edges, reachable };
}

function GraphViewport({ width, height, children, title, onScaleChange, resetSignal = 0, autoFit = false }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.72);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  function applyScale(nextScale) {
    const clamped = Math.max(0.2, Math.min(2.5, +nextScale.toFixed(2)));
    setScale(clamped);
    onScaleChange?.(clamped);
    return clamped;
  }

  function fitToView() {
    const node = containerRef.current;
    if (!node) return;
    const padding = 32;
    const availableWidth = Math.max(100, node.clientWidth - padding * 2);
    const availableHeight = Math.max(100, node.clientHeight - padding * 2);
    const fitScale = Math.min(availableWidth / width, availableHeight / height, 1.2);
    const finalScale = applyScale(fitScale);
    const contentWidth = width * finalScale;
    const contentHeight = height * finalScale;
    const nextOffsetX = Math.max(padding, (node.clientWidth - contentWidth) / 2);
    const nextOffsetY = Math.max(padding, (node.clientHeight - contentHeight) / 2);
    setOffset({ x: nextOffsetX, y: nextOffsetY });
  }

  function zoomIn() {
    applyScale(scale + 0.12);
  }
  function zoomOut() {
    applyScale(scale - 0.12);
  }
  function resetView() {
    fitToView();
  }

  useEffect(() => {
    if (autoFit) fitToView();
  }, [width, height, autoFit]);

  useEffect(() => {
    if (resetSignal) fitToView();
  }, [resetSignal]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    function onWheel(event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      applyScale(scale + (event.deltaY > 0 ? -0.08 : 0.08));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [scale]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (autoFit) fitToView();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, height, autoFit]);

  function onPointerDown(event) {
    if (event.button !== 1) return;
    event.preventDefault();
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }

  function onPointerMove(event) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.startOffsetX + dx, y: dragRef.current.startOffsetY + dy });
  }

  function onPointerUp() {
    dragRef.current.active = false;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          <Pill><Grip className="mr-1 h-3 w-3" /> Middle mouse to pan</Pill>
          <Pill>Ctrl + wheel to zoom</Pill>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={zoomOut} className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={zoomIn} className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={fitToView} className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50" title="Auto-fit graph"><RotateCcw className="h-4 w-4" /></button>
          <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700">{Math.round(scale * 100)}%</div>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="h-[78vh] min-h-[700px] overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{ cursor: dragRef.current.active ? "grabbing" : "default" }}
      >
        <div
          style={{
            width,
            height,
            position: "relative",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children(scale)}
        </div>
      </div>
    </div>
  );
}

function DiagramView({ cards, rootId, mode, onDelete }) {
  const { root, layers, edges, reachable } = useMemo(() => buildDiagram(cards, rootId, mode), [cards, rootId, mode]);
  const nodePositions = new Map();
  const layerGap = 340;
  const nodeGap = 180;
  const topPadding = 70;
  const leftPadding = 40;
  const cardWidth = 224;
  const cardHeight = 196;

  const filteredLayers = root ? layers.map((layer) => ({ ...layer, items: layer.items.filter((item) => reachable.has(item.id)) })).filter((layer) => layer.items.length > 0) : layers;
  filteredLayers.forEach((layer, layerIndex) => {
    layer.items.forEach((card, cardIndex) => {
      nodePositions.set(card.id, { x: leftPadding + layerIndex * layerGap, y: topPadding + cardIndex * nodeGap });
    });
  });

  const width = Math.max(1400, filteredLayers.length * layerGap + 420);
  const tallestLayer = Math.max(1, ...filteredLayers.map((l) => l.items.length));
  const height = Math.max(1000, tallestLayer * nodeGap + 220);
  const visibleEdges = edges.filter((edge) => nodePositions.has(edge.from) && nodePositions.has(edge.to) && (!root || (reachable.has(edge.from) && reachable.has(edge.to))));

  return (
    <GraphViewport
      width={width}
      height={height}
      autoFit={true}
      title={<><Pill kind="artifact">Gray line = Oswald line</Pill><Pill kind="creature">Green line = Pyre line</Pill>{root && <Pill>Showing paths reachable from {root.name}</Pill>}</>}
    >
      {() => (
        <>
          <svg width={width} height={height} className="absolute inset-0">
            {filteredLayers.map((layer, i) => {
              const x = leftPadding + i * layerGap + cardWidth / 2;
              return (
                <g key={layer.manaValue}>
                  <line x1={x} y1={0} x2={x} y2={height} stroke="#e2e8f0" strokeDasharray="5 6" />
                  <text x={x} y={28} textAnchor="middle" fontSize="14" fill="#334155" fontWeight="600">MV {layer.manaValue}</text>
                </g>
              );
            })}
            {visibleEdges.map((edge, index) => {
              const from = nodePositions.get(edge.from);
              const to = nodePositions.get(edge.to);
              const x1 = from.x + cardWidth;
              const y1 = from.y + cardHeight / 2;
              const x2 = to.x;
              const y2 = to.y + cardHeight / 2;
              const midX = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
              return <path key={`${edge.from}-${edge.to}-${edge.kind}-${index}`} d={path} fill="none" stroke={edge.kind === "pyre" ? "#16a34a" : "#64748b"} strokeWidth="3" opacity="0.8" />;
            })}
          </svg>
          {filteredLayers.flatMap((layer) => layer.items.map((card) => {
            const pos = nodePositions.get(card.id);
            return <div key={card.id} style={{ position: "absolute", left: pos.x, top: pos.y }}><CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} /></div>;
          }))}
        </>
      )}
    </GraphViewport>
  );
}

function PhysicsView({ cards, rootId, mode, onDelete }) {
  const [viewportScale, setViewportScale] = useState(0.72);
  const [fitNonce, setFitNonce] = useState(0);
  const { root, edges } = useMemo(() => buildDiagram(cards, rootId, mode), [cards, rootId, mode]);
  const layout = useMemo(() => {
    const seedWidth = Math.max(2600, cards.length * 165);
    const seedHeight = Math.max(1800, cards.length * 115);
    const centerX = seedWidth / 2;
    const centerY = seedHeight / 2;
    const baseCardWidth = 224;
    const baseCardHeight = 196;
    const positions = new Map();
    const velocities = new Map();
    const degreeMap = new Map();
    cards.forEach((card) => degreeMap.set(card.id, 0));
    edges.forEach((edge) => {
      degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + 1);
      degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + 1);
    });
    const rootCard = cards.find((card) => card.id === rootId) || null;
    const rootPlaced = !!rootCard;

    cards.forEach((card, index) => {
      if (card.id === rootId) {
        positions.set(card.id, { x: centerX, y: centerY });
        velocities.set(card.id, { x: 0, y: 0 });
        return;
      }
      const angle = (index / Math.max(1, cards.length - (rootPlaced ? 1 : 0))) * Math.PI * 2;
      const radius = 280 + (card.manaValue || 0) * 44 + (index % 5) * 50;
      positions.set(card.id, {
        x: centerX + Math.cos(angle) * radius + Math.sin(index * 1.91) * 120,
        y: centerY + Math.sin(angle) * radius + Math.cos(index * 1.37) * 90,
      });
      velocities.set(card.id, { x: 0, y: 0 });
    });

    const desiredEdgeLength = 280;
    const repulsionStrength = 98000;
    const springStrength = 0.01;
    const centerPull = 0.0013;
    const damping = 0.82;
    const iterations = Math.min(320, Math.max(140, cards.length * 2));

    for (let iter = 0; iter < iterations; iter += 1) {
      const forces = new Map();
      cards.forEach((card) => forces.set(card.id, { x: 0, y: 0 }));
      for (let i = 0; i < cards.length; i += 1) {
        for (let j = i + 1; j < cards.length; j += 1) {
          const a = cards[i];
          const b = cards[j];
          const posA = positions.get(a.id);
          const posB = positions.get(b.id);
          let dx = posB.x - posA.x;
          let dy = posB.y - posA.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 0.01) {
            dx = 0.1;
            dy = 0.1;
            distSq = 0.02;
          }
          const dist = Math.sqrt(distSq);
          const forceMag = repulsionStrength / distSq;
          const fx = (dx / dist) * forceMag;
          const fy = (dy / dist) * forceMag;
          forces.get(a.id).x -= fx;
          forces.get(a.id).y -= fy;
          forces.get(b.id).x += fx;
          forces.get(b.id).y += fy;
        }
      }
      edges.forEach((edge) => {
        const posA = positions.get(edge.from);
        const posB = positions.get(edge.to);
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const displacement = dist - desiredEdgeLength;
        const forceMag = displacement * springStrength * (edge.kind === "pyre" ? 1.15 : 1);
        const fx = (dx / dist) * forceMag;
        const fy = (dy / dist) * forceMag;
        forces.get(edge.from).x += fx;
        forces.get(edge.from).y += fy;
        forces.get(edge.to).x -= fx;
        forces.get(edge.to).y -= fy;
      });
      cards.forEach((card) => {
        if (card.id === rootId) return;
        const pos = positions.get(card.id);
        const vel = velocities.get(card.id);
        const force = forces.get(card.id);
        const degree = degreeMap.get(card.id) || 0;
        force.x += (centerX - pos.x) * centerPull * (degree > 0 ? 0.7 : 1.25);
        force.y += (centerY - pos.y) * centerPull * (degree > 0 ? 0.7 : 1.25) + (card.manaValue - 3) * 0.05;
        vel.x = (vel.x + force.x) * damping;
        vel.y = (vel.y + force.y) * damping;
        pos.x += vel.x;
        pos.y += vel.y;
      });
    }

    if (rootCard) positions.set(rootId, { x: centerX, y: centerY });
    const centerPositions = [...positions.values()];
    const minCenterX = Math.min(...centerPositions.map((p) => p.x));
    const maxCenterX = Math.max(...centerPositions.map((p) => p.x));
    const minCenterY = Math.min(...centerPositions.map((p) => p.y));
    const maxCenterY = Math.max(...centerPositions.map((p) => p.y));
    const padding = 180;
    const shiftX = padding + baseCardWidth / 2 - minCenterX;
    const shiftY = padding + baseCardHeight / 2 - minCenterY;
    positions.forEach((pos, id) => {
      positions.set(id, { x: pos.x + shiftX, y: pos.y + shiftY });
    });
    const width = Math.max(1600, maxCenterX - minCenterX + padding * 2 + baseCardWidth);
    const height = Math.max(1200, maxCenterY - minCenterY + padding * 2 + baseCardHeight);
    return { positions, width, height, baseCardWidth, baseCardHeight };
  }, [cards, edges, rootId]);

  useEffect(() => {
    setFitNonce((n) => n + 1);
  }, [cards, rootId, mode]);

  return (
    <GraphViewport
      width={layout.width}
      height={layout.height}
      autoFit={true}
      resetSignal={fitNonce}
      onScaleChange={setViewportScale}
      title={<><Pill kind="artifact">Gray line = Oswald line</Pill><Pill kind="creature">Green line = Pyre line</Pill><Pill>Physics graph</Pill>{root && <Pill>{root.name} pinned to center</Pill>}</>}
    >
      {(scale) => {
        const inverseScale = 1 / Math.max(0.35, scale);
        const sizeMultiplier = Math.min(1, inverseScale);
        const cardWidth = layout.baseCardWidth * sizeMultiplier;
        const cardHeight = layout.baseCardHeight * sizeMultiplier;
        const compact = scale > 0.95;
        return (
          <>
            <svg width={layout.width} height={layout.height} className="absolute inset-0">
              <defs>
                <filter id="physicsGlow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {edges.map((edge, index) => {
                const from = layout.positions.get(edge.from);
                const to = layout.positions.get(edge.to);
                if (!from || !to) return null;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.max(1, Math.hypot(dx, dy));
                const normX = -dy / distance;
                const normY = dx / distance;
                const bend = 14 + (index % 4) * 10;
                const cx = (from.x + to.x) / 2 + normX * bend;
                const cy = (from.y + to.y) / 2 + normY * bend;
                const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
                return <path key={`${edge.from}-${edge.to}-${edge.kind}-${index}`} d={path} fill="none" stroke={edge.kind === "pyre" ? "#16a34a" : "#64748b"} strokeWidth={edge.kind === "pyre" ? 3 : 2.5} opacity="0.42" filter="url(#physicsGlow)" />;
              })}
            </svg>
            {cards.map((card) => {
              const pos = layout.positions.get(card.id);
              if (!pos) return null;
              return (
                <div
                  key={card.id}
                  style={{
                    position: "absolute",
                    left: pos.x - cardWidth / 2,
                    top: pos.y - cardHeight / 2,
                    width: cardWidth,
                    transform: `scale(${sizeMultiplier})`,
                    transformOrigin: "top left",
                  }}
                >
                  <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} compact={compact} />
                </div>
              );
            })}
          </>
        );
      }}
    </GraphViewport>
  );
}

function EditableCardRow({ card, isRoot, onDelete, onSave, onEditRoot }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);

  useEffect(() => {
    setDraft(card);
  }, [card]);

  function update(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    onSave(card.id, {
      ...draft,
      manaValue: Number(draft.manaValue),
      types: draft.types.trim(),
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className={`rounded-2xl border bg-white p-3 shadow-sm ${card.isImportant ? "border-amber-300" : "border-slate-200"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{card.name}</div>
            <div className="mt-1 text-xs text-slate-500">MV {card.manaValue} {isRoot ? "• Root" : ""}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.isArtifact && <Pill kind="artifact">Artifact</Pill>}
              {card.isCreature && <Pill kind="creature">Creature</Pill>}
              {card.isChangeling && <Pill kind="changeling">Changeling</Pill>}
              {card.isImportant && <Pill kind="important">Important</Pill>}
            </div>
            <div className="mt-2 text-xs text-slate-600">{card.types || "—"}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onEditRoot(card.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Make root">
              <Network className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Edit card">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onDelete(card.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Delete card">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3 shadow-sm">
      <div className="space-y-3">
        <input value={draft.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" value={draft.manaValue} onChange={(e) => update("manaValue", e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input value={draft.types} onChange={(e) => update("types", e.target.value)} placeholder="Types" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><input type="checkbox" checked={draft.isArtifact} onChange={(e) => update("isArtifact", e.target.checked)} /> Artifact</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><input type="checkbox" checked={draft.isCreature} onChange={(e) => update("isCreature", e.target.checked)} /> Creature</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><input type="checkbox" checked={draft.isImportant} onChange={(e) => update("isImportant", e.target.checked)} /> Important</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><input type="checkbox" checked={draft.isChangeling} onChange={(e) => update("isChangeling", e.target.checked)} /> Changeling</label>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => { setDraft(card); setEditing(false); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><X className="mr-1 inline h-4 w-4" />Cancel</button>
          <button type="button" onClick={save} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"><Save className="mr-1 inline h-4 w-4" />Save</button>
        </div>
      </div>
    </div>
  );
}

export default function MTGTutorTreeApp() {
  const [cards, setCards] = useState(starterCards);
  const [mode, setMode] = useState("both");
  const [rootId, setRootId] = useState(starterCards[0]?.id ?? "");
  const [viewStyle, setViewStyle] = useState("layered");
  const [lookupStatus, setLookupStatus] = useState({ loading: false, error: "", found: "" });
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportStatus, setBulkImportStatus] = useState({ loading: false, error: "", found: "" });
  const [cardSearch, setCardSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    manaValue: 1,
    types: "",
    isArtifact: false,
    isCreature: true,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
  });

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function lookupCard() {
    const name = form.name.trim();
    if (!name) return;
    setLookupStatus({ loading: true, error: "", found: "" });
    try {
      const data = await fetchScryfallCardByName(name);
      const parsed = parseScryfallCard(data);
      setForm((prev) => ({ ...prev, ...parsed }));
      setLookupStatus({ loading: false, error: "", found: `Loaded ${parsed.name}` });
    } catch (error) {
      setLookupStatus({ loading: false, error: error instanceof Error ? error.message : "Lookup failed.", found: "" });
    }
  }

  async function bulkImportCards() {
    const lines = bulkImportText.split("\n").map((line) => parseBulkImportLine(line)).filter(Boolean);
    if (!lines.length) {
      setBulkImportStatus({ loading: false, error: "Add at least one card name to import.", found: "" });
      return;
    }
    setBulkImportStatus({ loading: true, error: "", found: "" });
    const imported = [];
    const failures = [];
    for (const item of lines) {
      try {
        const data = await fetchScryfallCardByName(item.name);
        const parsed = parseScryfallCard(data);
        imported.push({ id: crypto.randomUUID(), ...parsed, isChangeling: item.forceChangeling || parsed.isChangeling, isImportant: item.isImportant });
      } catch {
        failures.push(item.name);
      }
    }
    if (imported.length) {
      setCards((prev) => {
        const next = [...prev, ...imported];
        if (!rootId && next.length) setRootId(next[0].id);
        return next;
      });
    }
    const foundMessageParts = [];
    if (imported.length) foundMessageParts.push(`Imported ${imported.length} card${imported.length === 1 ? "" : "s"}`);
    if (failures.length) foundMessageParts.push(`${failures.length} failed`);
    setBulkImportStatus({ loading: false, error: failures.length ? `Could not find: ${failures.join(", ")}` : "", found: foundMessageParts.join(" • ") });
  }

  function addCard(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const next = { id: crypto.randomUUID(), ...form, name: form.name.trim(), manaValue: Number(form.manaValue), types: form.types.trim(), imageUrl: form.imageUrl || "" };
    setCards((prev) => [...prev, next]);
    setRootId((current) => current || next.id);
    setForm({ name: "", manaValue: 1, types: "", isArtifact: false, isCreature: true, isChangeling: false, isImportant: false, imageUrl: "" });
    setLookupStatus({ loading: false, error: "", found: "" });
  }

  function deleteCard(id) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (rootId === id) {
      const remaining = cards.filter((c) => c.id !== id);
      setRootId(remaining[0]?.id ?? "");
    }
  }

  function updateCard(id, patch) {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }

  const importantCount = cards.filter((c) => c.isImportant).length;
  const changelingCount = cards.filter((c) => c.isChangeling).length;
  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      [card.name, card.types, card.manaValue, card.isArtifact ? "artifact" : "", card.isCreature ? "creature" : "", card.isImportant ? "important" : "", card.isChangeling ? "changeling" : ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [cards, cardSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 text-slate-900 lg:p-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><Network className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">MTG Tutor Tree Builder</h1></div>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">Build automatic tutor trees for <span className="font-medium">Oswald Fiddlebender</span> and <span className="font-medium">Pyre of Heroes</span>. Add cards manually or fetch them from Scryfall, then flag win conditions and changelings.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill kind="important">{importantCount} important</Pill>
              <Pill kind="changeling">{changelingCount} changelings</Pill>
              <Pill>{cards.length} cards total</Pill>
            </div>
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-6">
            <form onSubmit={addCard} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5" /><h2 className="text-lg font-semibold">Add card</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Card name</label>
                  <div className="flex gap-2">
                    <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ex. Universal Automaton" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                    <button type="button" onClick={lookupCard} disabled={lookupStatus.loading || !form.name.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {lookupStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Lookup
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Uses Scryfall to auto-fill mana value, artifact/creature status, creature subtypes, changeling, and image.</p>
                  {lookupStatus.error ? <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4" />{lookupStatus.error}</div> : null}
                  {lookupStatus.found ? <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{lookupStatus.found}</div> : null}
                </div>
                {form.imageUrl ? <img src={form.imageUrl} alt={form.name || "Fetched card"} className="h-36 w-full rounded-2xl border border-slate-200 object-cover" /> : null}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mana value</label>
                  <input type="number" min="0" value={form.manaValue} onChange={(e) => updateForm("manaValue", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Creature types</label>
                  <input value={form.types} onChange={(e) => updateForm("types", e.target.value)} placeholder="Ex. Human Artificer or Phyrexian Mite" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                  <div className="mt-2 flex flex-wrap gap-1">{creatureTypeSuggestions.slice(0, 10).map((type) => <button type="button" key={type} onClick={() => updateForm("types", form.types ? `${form.types} ${type}` : type)} className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">{type}</button>)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.isArtifact} onChange={(e) => updateForm("isArtifact", e.target.checked)} />Artifact</label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.isCreature} onChange={(e) => updateForm("isCreature", e.target.checked)} />Creature</label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.isImportant} onChange={(e) => updateForm("isImportant", e.target.checked)} />Important</label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.isChangeling} onChange={(e) => updateForm("isChangeling", e.target.checked)} />Changeling</label>
                </div>
              </div>
              <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"><Plus className="h-4 w-4" />Add card</button>
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Upload className="h-5 w-5" /><h2 className="text-lg font-semibold">Bulk import</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paste decklist or card names</label>
                  <textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder={`1 Universal Automaton\n1 Mirror Entity *\n1 Amoeboid Changeling [important]\n1 Masked Vandal [changeling]`} className="min-h-[160px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <p className="mt-2 text-xs text-slate-500">Supports lines like <span className="font-medium">1 Card Name</span>. Use <span className="font-medium">*</span> or <span className="font-medium">[important]</span> to flag a card. Use <span className="font-medium">[changeling]</span> to force changeling on a line.</p>
                </div>
                <button type="button" onClick={bulkImportCards} disabled={bulkImportStatus.loading || !bulkImportText.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{bulkImportStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Import from Scryfall</button>
                {bulkImportStatus.error ? <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4" />{bulkImportStatus.error}</div> : null}
                {bulkImportStatus.found ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{bulkImportStatus.found}</div> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Swords className="h-5 w-5" /><h2 className="text-lg font-semibold">Diagram options</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mode</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="both">Both</option>
                    <option value="oswald">Oswald only</option>
                    <option value="pyre">Pyre only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start from card</label>
                  <select value={rootId} onChange={(e) => setRootId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">The selected card is the filtered root in layered view, and the pinned center in physics view.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><LayoutGrid className="h-5 w-5" /><h2 className="text-lg font-semibold">View style</h2></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setViewStyle("layered")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "layered" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" />Layered tree</button>
                <button type="button" onClick={() => setViewStyle("physics")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "physics" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><Orbit className="h-4 w-4" />Physics graph</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Physics graph spreads everything out automatically to reduce overlap. Both views support zoom, auto-fit, and middle-mouse panning. In physics view, cards shrink as you zoom in so dense clusters stay more readable.</p>
            </div>

            <EdgeLegend />

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="text-lg font-semibold">Current card pool</h2></div>
                <div className="text-xs text-slate-500">{filteredCards.length} shown</div>
              </div>
              <div className="mb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={cardSearch} onChange={(e) => setCardSearch(e.target.value)} placeholder="Search current card pool" className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400" />
                </div>
              </div>
              <div className="max-h-[600px] space-y-3 overflow-auto pr-1">
                {filteredCards.map((card) => (
                  <EditableCardRow key={card.id} card={card} isRoot={card.id === rootId} onDelete={deleteCard} onSave={updateCard} onEditRoot={setRootId} />
                ))}
              </div>
            </div>
          </div>

          {viewStyle === "layered" ? <DiagramView cards={cards} rootId={rootId} mode={mode} onDelete={deleteCard} /> : <PhysicsView cards={cards} rootId={rootId} mode={mode} onDelete={deleteCard} />}
        </div>
      </div>
    </div>
  );
}
