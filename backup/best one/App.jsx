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
  Tag,
  ArrowUp,
  ArrowDown,
  Download,
  FolderOpen,
  PanelRightOpen,
  Route,
  ChevronDown,
  ChevronRight,
  CircleDot,
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
    traits: [],
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
    traits: [],
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
    traits: [],
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
    traits: [],
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
    traits: [],
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
    traits: [],
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
    traits: [],
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

const defaultTraits = [
  { id: "ramp", name: "Ramp", color: "#2563eb", outline: "#1d4ed8" },
  { id: "card-advantage", name: "Card Advantage", color: "#7c3aed", outline: "#6d28d9" },
  { id: "recursion", name: "Recursion", color: "#059669", outline: "#047857" },
  { id: "interaction", name: "Interaction", color: "#dc2626", outline: "#b91c1c" },
  { id: "stax", name: "Stax", color: "#92400e", outline: "#78350f" },
  { id: "wincon", name: "Wincon", color: "#d97706", outline: "#b45309" },
];

const defaultTutorOptions = {
  oswald: true,
  pyre: true,
  birthingPod: false,
};

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

  if (/\*/.test(line) || /\[important\]/i.test(line) || /\!important/i.test(line)) isImportant = true;
  if (/\[changeling\]/i.test(line) || /\!changeling/i.test(line)) forceChangeling = true;

  line = line
    .replace(/\[important\]/gi, "")
    .replace(/\!important/gi, "")
    .replace(/\[changeling\]/gi, "")
    .replace(/\!changeling/gi, "")
    .replace(/\*/g, "")
    .trim();

  line = line.replace(/^\d+x?\s+/i, "").trim();
  if (!line) return null;

  return { name: line, isImportant, forceChangeling };
}

async function fetchScryfallCardByName(name) {
  const attempts = [
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
  ];

  for (const url of attempts) {
    const response = await fetch(url);
    const payload = await response.json();
    if (response.ok && payload?.object !== "error") return payload;
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

function canBirthingPodTo(from, to) {
  return from.isCreature && to.isCreature && to.manaValue === from.manaValue + 1;
}

function badgeClasses(kind) {
  if (kind === "important") return "bg-amber-100 text-amber-900 border-amber-300";
  if (kind === "changeling") return "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300";
  if (kind === "artifact") return "bg-slate-100 text-slate-900 border-slate-300";
  if (kind === "creature") return "bg-emerald-100 text-emerald-900 border-emerald-300";
  return "bg-white text-slate-700 border-slate-300";
}

function tutorKindMeta(kind) {
  if (kind === "pyre") return { label: "Pyre", color: "#16a34a" };
  if (kind === "birthingPod") return { label: "Birthing Pod", color: "#0f766e" };
  return { label: "Oswald", color: "#64748b" };
}

function hexToRgba(hex, alpha = 1) {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((c) => c + c).join("") : safe;
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Pill({ children, kind = "default" }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClasses(kind)}`}>{children}</span>;
}

function TraitPill({ trait }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: hexToRgba(trait.color, 0.14),
        borderColor: trait.outline,
        color: trait.outline,
      }}
    >
      {trait.name}
    </span>
  );
}

function TutorPill({ kind }) {
  const meta = tutorKindMeta(kind);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: hexToRgba(meta.color, 0.12), borderColor: meta.color, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function CardNode({ card, isRoot, onDelete, compact = false, traitMap = {}, isSelected = false, onSelect, zIndex = 1, imageMode = true }) {
  const baseHeight = compact ? "h-14" : "h-24";
  const primaryTrait = card.traits?.[0] ? traitMap[card.traits[0]] : null;
  const borderStyle = primaryTrait
    ? {
        borderColor: primaryTrait.outline,
        boxShadow: `0 0 0 2px ${hexToRgba(primaryTrait.color, 0.18)}`,
      }
    : {};

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(card.id);
      }}
      className={`w-64 rounded-2xl border bg-white p-3 shadow-sm transition cursor-pointer ${card.isImportant ? "ring-2 ring-amber-200" : ""} ${isRoot ? "ring-2 ring-sky-200" : ""} ${isSelected ? "ring-2 ring-slate-400 shadow-xl" : ""}`}
      style={{ ...borderStyle, zIndex, position: "relative" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{card.name}</div>
          <div className="mt-1 text-xs text-slate-500">Mana value {card.manaValue}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Delete card"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {imageMode && card.imageUrl ? <img src={card.imageUrl} alt={card.name} className={`mt-3 ${baseHeight} w-full rounded-xl border border-slate-200 object-cover`} /> : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.isArtifact && <Pill kind="artifact">Artifact</Pill>}
        {card.isCreature && <Pill kind="creature">Creature</Pill>}
        {card.isChangeling && <Pill kind="changeling">Changeling</Pill>}
        {card.isImportant && <Pill kind="important">Important</Pill>}
      </div>

      {card.traits?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.traits.map((traitId) => {
            const trait = traitMap[traitId];
            return trait ? <TraitPill key={traitId} trait={trait} /> : null;
          })}
        </div>
      ) : null}

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
        <div><span className="font-medium text-slate-800">Birthing Pod:</span> creature → creature with mana value exactly +1.</div>
        <div><span className="font-medium text-slate-800">Changeling:</span> treated as having all creature types for Pyre connections.</div>
      </div>
    </div>
  );
}

function buildDiagram(cards, rootId, tutorOptions, showOnlyConnected) {
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
      if (tutorOptions.oswald && canOswaldTo(from, to)) edges.push({ from: from.id, to: to.id, kind: "oswald" });
      if (tutorOptions.pyre && canPyreTo(from, to)) edges.push({ from: from.id, to: to.id, kind: "pyre" });
      if (tutorOptions.birthingPod && canBirthingPodTo(from, to)) edges.push({ from: from.id, to: to.id, kind: "birthingPod" });
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

  const connected = new Set();
  edges.forEach((edge) => {
    connected.add(edge.from);
    connected.add(edge.to);
  });

  const visibleCardIds = showOnlyConnected ? connected : new Set(cards.map((c) => c.id));
  if (root) visibleCardIds.add(root.id);

  return { root, layers, edges, reachable, connected, visibleCardIds };
}

function computeEfficiency(cards, edges) {
  const incoming = Object.fromEntries(cards.map((card) => [card.id, 0]));
  const outgoing = Object.fromEntries(cards.map((card) => [card.id, 0]));
  edges.forEach((edge) => {
    outgoing[edge.from] += 1;
    incoming[edge.to] += 1;
  });
  const scores = {};
  cards.forEach((card) => {
    scores[card.id] = outgoing[card.id] * 2 + incoming[card.id] + (card.isImportant ? 2 : 0);
  });
  return { incoming, outgoing, scores };
}

function edgeWeight(kind) {
  if (kind === "oswald") return 1.0;
  if (kind === "pyre") return 1.08;
  if (kind === "birthingPod") return 1.04;
  return 1;
}

function findBestPath(startId, endId, edges, cardsById) {
  if (!startId || !endId) return [];
  if (startId === endId) return [startId];

  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge);
  });

  const best = new Map();
  const parent = new Map();
  const queue = [{ id: startId, score: 0, steps: 0 }];
  best.set(startId, 0);
  parent.set(startId, null);

  while (queue.length) {
    queue.sort((a, b) => a.score - b.score || a.steps - b.steps);
    const current = queue.shift();
    if (current.id === endId) break;
    const nextEdges = adjacency.get(current.id) || [];
    for (const edge of nextEdges) {
      const targetCard = cardsById.get(edge.to);
      const bonus = targetCard?.isImportant ? -0.08 : 0;
      const traitBonus = targetCard?.traits?.includes("wincon") ? -0.08 : 0;
      const nextScore = current.score + edgeWeight(edge.kind) + bonus + traitBonus;
      if (!best.has(edge.to) || nextScore < best.get(edge.to)) {
        best.set(edge.to, nextScore);
        parent.set(edge.to, current.id);
        queue.push({ id: edge.to, score: nextScore, steps: current.steps + 1 });
      }
    }
  }

  if (!parent.has(endId)) return [];
  const path = [];
  let node = endId;
  while (node) {
    path.unshift(node);
    node = parent.get(node);
  }
  return path;
}

function GraphViewport({ width, height, children, title, onScaleChange, resetSignal = 0, autoFit = false }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.76);
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
    const fitScale = Math.min(availableWidth / width, availableHeight / height, 1.1);
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

function CollapsiblePanel({ title, icon: Icon, defaultOpen = true, children, rightContent = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5" /> : null}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          {rightContent}
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}

function InspectorPanel({ selectedCard, cards, edges, traitMap, efficiency, pathNodes }) {
  if (!selectedCard) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-semibold"><PanelRightOpen className="h-5 w-5" />Card inspector</div>
        <p className="mt-3 text-sm text-slate-600">Click a card in the graph to inspect it. You’ll see its card image, types, traits, tutor edges, and efficiency score.</p>
      </div>
    );
  }

  const incomingEdges = edges.filter((edge) => edge.to === selectedCard.id);
  const outgoingEdges = edges.filter((edge) => edge.from === selectedCard.id);
  const incomingCards = incomingEdges.map((edge) => ({ edge, card: cards.find((c) => c.id === edge.from) })).filter((x) => x.card);
  const outgoingCards = outgoingEdges.map((edge) => ({ edge, card: cards.find((c) => c.id === edge.to) })).filter((x) => x.card);
  const inPath = pathNodes.includes(selectedCard.id);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-lg font-semibold"><PanelRightOpen className="h-5 w-5" />Card inspector</div>
      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <div className="text-lg font-semibold text-slate-900">{selectedCard.name}</div>
        <div className="mt-1 text-sm text-slate-500">Mana value {selectedCard.manaValue}</div>
        {selectedCard.imageUrl ? <img src={selectedCard.imageUrl} alt={selectedCard.name} className="mt-3 w-full rounded-2xl border border-slate-200 object-cover" /> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedCard.isArtifact && <Pill kind="artifact">Artifact</Pill>}
          {selectedCard.isCreature && <Pill kind="creature">Creature</Pill>}
          {selectedCard.isChangeling && <Pill kind="changeling">Changeling</Pill>}
          {selectedCard.isImportant && <Pill kind="important">Important</Pill>}
          {inPath && <Pill>On current path</Pill>}
        </div>
        {selectedCard.traits?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedCard.traits.map((id) => traitMap[id] ? <TraitPill key={id} trait={traitMap[id]} /> : null)}</div> : null}
        <div className="mt-3 text-sm text-slate-700"><span className="font-medium">Types:</span> {selectedCard.types || "—"}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Incoming</div><div className="text-lg font-semibold">{efficiency.incoming[selectedCard.id] || 0}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Outgoing</div><div className="text-lg font-semibold">{efficiency.outgoing[selectedCard.id] || 0}</div></div>
          <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">Efficiency</div><div className="text-lg font-semibold">{efficiency.scores[selectedCard.id] || 0}</div></div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Can tutor into this</div>
          <div className="space-y-2 text-sm text-slate-700">
            {incomingCards.length ? incomingCards.map(({ edge, card }) => (
              <div key={`${edge.from}-${edge.to}-${edge.kind}`} className="rounded-xl border border-slate-200 p-2">
                <div className="font-medium">{card.name}</div>
                <div className="mt-1 flex gap-1.5"><TutorPill kind={edge.kind} /></div>
              </div>
            )) : <div className="text-slate-500">No incoming tutor lines.</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Can tutor out of this</div>
          <div className="space-y-2 text-sm text-slate-700">
            {outgoingCards.length ? outgoingCards.map(({ edge, card }) => (
              <div key={`${edge.from}-${edge.to}-${edge.kind}`} className="rounded-xl border border-slate-200 p-2">
                <div className="font-medium">{card.name}</div>
                <div className="mt-1 flex gap-1.5"><TutorPill kind={edge.kind} /></div>
              </div>
            )) : <div className="text-slate-500">No outgoing tutor lines.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPathEdgeSet(pathNodes, edges) {
  const pathEdgeSet = new Set();
  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    edges.filter((edge) => edge.from === from && edge.to === to).forEach((edge) => pathEdgeSet.add(`${edge.from}-${edge.to}-${edge.kind}`));
  }
  return pathEdgeSet;
}

function DiagramView({ cards, rootId, tutorOptions, onDelete, traitMap, selectedCardId, onSelectCard, showOnlyConnected, pathNodes, highlightWinconPaths, winconNodeIds, imageMode }) {
  const { root, layers, edges, reachable, visibleCardIds } = useMemo(() => buildDiagram(cards, rootId, tutorOptions, showOnlyConnected), [cards, rootId, tutorOptions, showOnlyConnected]);
  const nodePositions = new Map();
  const layerGap = 360;
  const nodeGap = 200;
  const topPadding = 80;
  const leftPadding = 50;
  const cardWidth = 256;
  const cardHeight = 220;

  const filteredLayers = layers
    .map((layer) => ({
      ...layer,
      items: layer.items.filter((item) => visibleCardIds.has(item.id) && (!root || reachable.has(item.id) || !showOnlyConnected)),
    }))
    .filter((layer) => layer.items.length > 0);

  filteredLayers.forEach((layer, layerIndex) => {
    layer.items.forEach((card, cardIndex) => {
      nodePositions.set(card.id, { x: leftPadding + layerIndex * layerGap, y: topPadding + cardIndex * nodeGap });
    });
  });

  const width = Math.max(1600, filteredLayers.length * layerGap + 520);
  const tallestLayer = Math.max(1, ...filteredLayers.map((l) => l.items.length));
  const height = Math.max(1100, tallestLayer * nodeGap + 260);

  const selectedNeighborIds = new Set();
  edges.forEach((edge) => {
    if (edge.from === selectedCardId) selectedNeighborIds.add(edge.to);
    if (edge.to === selectedCardId) selectedNeighborIds.add(edge.from);
  });

  const pathEdgeSet = getPathEdgeSet(pathNodes, edges);
  const visibleEdges = edges.filter((edge) => nodePositions.has(edge.from) && nodePositions.has(edge.to));

  return (
    <GraphViewport
      width={width}
      height={height}
      autoFit={true}
      title={<><Pill kind="artifact">Gray = Oswald</Pill><Pill kind="creature">Green = Pyre</Pill><Pill>Teal = Birthing Pod</Pill>{root && <Pill>Root {root.name}</Pill>}</>}
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
              const key = `${edge.from}-${edge.to}-${edge.kind}`;
              const selectedRelated = selectedCardId && (edge.from === selectedCardId || edge.to === selectedCardId);
              const onPath = pathEdgeSet.has(key);
              const toWincon = highlightWinconPaths && winconNodeIds.has(edge.to);
              const meta = tutorKindMeta(edge.kind);
              return (
                <path
                  key={`${key}-${index}`}
                  d={path}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={onPath ? 6 : selectedRelated ? 5 : toWincon ? 4 : 3}
                  opacity={onPath ? 1 : selectedCardId ? (selectedRelated ? 1 : 0.18) : (toWincon ? 0.9 : 0.7)}
                />
              );
            })}
          </svg>
          {filteredLayers.flatMap((layer) => layer.items.map((card) => {
            const pos = nodePositions.get(card.id);
            const zIndex = card.id === selectedCardId ? 1000 : card.id === rootId ? 500 : 1;
            const dimmed = selectedCardId && card.id !== selectedCardId && !selectedNeighborIds.has(card.id) && !pathNodes.includes(card.id);
            return (
              <div key={card.id} style={{ position: "absolute", left: pos.x, top: pos.y, zIndex, opacity: dimmed ? 0.5 : 1 }}>
                <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} traitMap={traitMap} isSelected={card.id === selectedCardId} onSelect={onSelectCard} zIndex={zIndex} imageMode={imageMode} />
              </div>
            );
          }))}
        </>
      )}
    </GraphViewport>
  );
}

function PhysicsView({ cards, rootId, tutorOptions, onDelete, traitMap, selectedCardId, onSelectCard, showOnlyConnected, pathNodes, highlightWinconPaths, winconNodeIds, edgeBundlingStrength = 1, imageMode }) {
  const [fitNonce, setFitNonce] = useState(0);
  const { root, edges, visibleCardIds } = useMemo(() => buildDiagram(cards, rootId, tutorOptions, showOnlyConnected), [cards, rootId, tutorOptions, showOnlyConnected]);
  const visibleCards = cards.filter((card) => visibleCardIds.has(card.id));

  const layout = useMemo(() => {
    const seedWidth = Math.max(3000, visibleCards.length * 190);
    const seedHeight = Math.max(2200, visibleCards.length * 130);
    const centerX = seedWidth / 2;
    const centerY = seedHeight / 2;
    const baseCardWidth = 272;
    const baseCardHeight = 244;
    const positions = new Map();
    const velocities = new Map();
    const degreeMap = new Map();
    visibleCards.forEach((card) => degreeMap.set(card.id, 0));
    edges.filter((edge) => visibleCardIds.has(edge.from) && visibleCardIds.has(edge.to)).forEach((edge) => {
      degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + 1);
      degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + 1);
    });
    const rootCard = visibleCards.find((card) => card.id === rootId) || null;
    const rootPlaced = !!rootCard;

    visibleCards.forEach((card, index) => {
      if (card.id === rootId) {
        positions.set(card.id, { x: centerX, y: centerY });
        velocities.set(card.id, { x: 0, y: 0 });
        return;
      }
      const angle = (index / Math.max(1, visibleCards.length - (rootPlaced ? 1 : 0))) * Math.PI * 2;
      const radius = 320 + (card.manaValue || 0) * 50 + (index % 6) * 60;
      positions.set(card.id, {
        x: centerX + Math.cos(angle) * radius + Math.sin(index * 1.91) * 140,
        y: centerY + Math.sin(angle) * radius + Math.cos(index * 1.37) * 110,
      });
      velocities.set(card.id, { x: 0, y: 0 });
    });

    const desiredEdgeLength = 310;
    const repulsionStrength = 120000;
    const springStrength = 0.011;
    const centerPull = 0.0012;
    const damping = 0.82;
    const iterations = Math.min(360, Math.max(160, visibleCards.length * 2));
    const usableEdges = edges.filter((edge) => visibleCardIds.has(edge.from) && visibleCardIds.has(edge.to));

    for (let iter = 0; iter < iterations; iter += 1) {
      const forces = new Map();
      visibleCards.forEach((card) => forces.set(card.id, { x: 0, y: 0 }));
      for (let i = 0; i < visibleCards.length; i += 1) {
        for (let j = i + 1; j < visibleCards.length; j += 1) {
          const a = visibleCards[i];
          const b = visibleCards[j];
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
      usableEdges.forEach((edge) => {
        const posA = positions.get(edge.from);
        const posB = positions.get(edge.to);
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const displacement = dist - desiredEdgeLength;
        const forceMag = displacement * springStrength * (edge.kind === "pyre" ? 1.15 : edge.kind === "birthingPod" ? 1.1 : 1);
        const fx = (dx / dist) * forceMag;
        const fy = (dy / dist) * forceMag;
        forces.get(edge.from).x += fx;
        forces.get(edge.from).y += fy;
        forces.get(edge.to).x -= fx;
        forces.get(edge.to).y -= fy;
      });
      visibleCards.forEach((card) => {
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
    const padding = 220;
    const shiftX = padding + baseCardWidth / 2 - minCenterX;
    const shiftY = padding + baseCardHeight / 2 - minCenterY;
    positions.forEach((pos, id) => {
      positions.set(id, { x: pos.x + shiftX, y: pos.y + shiftY });
    });
    const width = Math.max(1800, maxCenterX - minCenterX + padding * 2 + baseCardWidth);
    const height = Math.max(1400, maxCenterY - minCenterY + padding * 2 + baseCardHeight);
    return { positions, width, height, baseCardWidth, baseCardHeight, usableEdges };
  }, [visibleCards, edges, rootId, visibleCardIds]);

  const selectedNeighborIds = new Set();
  layout.usableEdges.forEach((edge) => {
    if (edge.from === selectedCardId) selectedNeighborIds.add(edge.to);
    if (edge.to === selectedCardId) selectedNeighborIds.add(edge.from);
  });

  const pathEdgeSet = getPathEdgeSet(pathNodes, layout.usableEdges);

  useEffect(() => {
    setFitNonce((n) => n + 1);
  }, [visibleCards, rootId, tutorOptions, showOnlyConnected]);

  return (
    <GraphViewport
      width={layout.width}
      height={layout.height}
      autoFit={true}
      resetSignal={fitNonce}
      title={<><Pill kind="artifact">Gray = Oswald</Pill><Pill kind="creature">Green = Pyre</Pill><Pill>Teal = Birthing Pod</Pill>{root && <Pill>{root.name} pinned to center</Pill>}</>}
    >
      {(scale) => {
        const inverseScale = 1 / Math.max(0.35, scale);
        const sizeMultiplier = Math.min(1.15, Math.max(0.24, inverseScale * 0.5));
        const cardWidth = layout.baseCardWidth * sizeMultiplier;
        const cardHeight = layout.baseCardHeight * sizeMultiplier;
        const compact = scale > 0.9;
        return (
          <>
            <svg width={layout.width} height={layout.height} className="absolute inset-0">
              <defs>
                <filter id="physicsGlow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {layout.usableEdges.map((edge, index) => {
                const from = layout.positions.get(edge.from);
                const to = layout.positions.get(edge.to);
                if (!from || !to) return null;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.max(1, Math.hypot(dx, dy));
                const normX = -dy / distance;
                const normY = dx / distance;
                const bundle = 8 * edgeBundlingStrength + ((edge.from.charCodeAt(0) + edge.to.charCodeAt(0) + index) % 5) * 3;
                const cx = (from.x + to.x) / 2 + normX * bundle;
                const cy = (from.y + to.y) / 2 + normY * bundle;
                const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
                const key = `${edge.from}-${edge.to}-${edge.kind}`;
                const selectedRelated = selectedCardId && (edge.from === selectedCardId || edge.to === selectedCardId);
                const onPath = pathEdgeSet.has(key);
                const toWincon = highlightWinconPaths && winconNodeIds.has(edge.to);
                const meta = tutorKindMeta(edge.kind);
                return (
                  <path
                    key={`${key}-${index}`}
                    d={path}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth={onPath ? 6 : selectedRelated ? 5 : toWincon ? 4 : 3}
                    opacity={onPath ? 1 : selectedCardId ? (selectedRelated ? 1 : 0.14) : (toWincon ? 0.9 : 0.42)}
                    filter="url(#physicsGlow)"
                  />
                );
              })}
            </svg>
            {visibleCards.map((card) => {
              const pos = layout.positions.get(card.id);
              if (!pos) return null;
              const zIndex = card.id === selectedCardId ? 1000 : card.id === rootId ? 500 : 1;
              const dimmed = selectedCardId && card.id !== selectedCardId && !selectedNeighborIds.has(card.id) && !pathNodes.includes(card.id);
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
                    zIndex,
                    opacity: dimmed ? 0.45 : 1,
                  }}
                >
                  <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} compact={compact} traitMap={traitMap} isSelected={card.id === selectedCardId} onSelect={onSelectCard} zIndex={zIndex} imageMode={imageMode} />
                </div>
              );
            })}
          </>
        );
      }}
    </GraphViewport>
  );
}

function ManaRingsView({ cards, rootId, tutorOptions, onDelete, traitMap, selectedCardId, onSelectCard, showOnlyConnected, pathNodes, highlightWinconPaths, winconNodeIds, imageMode }) {
  const { edges, visibleCardIds } = useMemo(() => buildDiagram(cards, rootId, tutorOptions, showOnlyConnected), [cards, rootId, tutorOptions, showOnlyConnected]);
  const visibleCards = cards.filter((card) => visibleCardIds.has(card.id));
  const width = 2400;
  const height = 2000;
  const centerX = width / 2;
  const centerY = height / 2;
  const ringGap = 190;
  const cardWidth = 256;
  const cardHeight = 220;
  const positions = new Map();
  const byMv = new Map();
  visibleCards.forEach((card) => {
    if (!byMv.has(card.manaValue)) byMv.set(card.manaValue, []);
    byMv.get(card.manaValue).push(card);
  });
  [...byMv.entries()].sort((a, b) => a[0] - b[0]).forEach(([mv, group]) => {
    const radius = 150 + mv * ringGap;
    group.forEach((card, idx) => {
      const angle = (idx / Math.max(1, group.length)) * Math.PI * 2;
      positions.set(card.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });
  });
  if (positions.has(rootId)) positions.set(rootId, { x: centerX, y: centerY });

  const pathEdgeSet = getPathEdgeSet(pathNodes, edges);

  const selectedNeighborIds = new Set();
  edges.forEach((edge) => {
    if (edge.from === selectedCardId) selectedNeighborIds.add(edge.to);
    if (edge.to === selectedCardId) selectedNeighborIds.add(edge.from);
  });

  return (
    <GraphViewport width={width} height={height} autoFit={true} title={<><Pill>Mana value rings</Pill><Pill kind="artifact">Gray = Oswald</Pill><Pill kind="creature">Green = Pyre</Pill><Pill>Teal = Birthing Pod</Pill></>}>
      {() => (
        <>
          <svg width={width} height={height} className="absolute inset-0">
            {[...byMv.keys()].sort((a, b) => a - b).map((mv) => {
              const radius = 150 + mv * ringGap;
              return (
                <g key={mv}>
                  <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e2e8f0" strokeDasharray="6 8" />
                  <text x={centerX + radius + 18} y={centerY} fontSize="14" fill="#334155" fontWeight="600">MV {mv}</text>
                </g>
              );
            })}
            {edges.filter((edge) => positions.has(edge.from) && positions.has(edge.to)).map((edge, index) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const distance = Math.max(1, Math.hypot(dx, dy));
              const normX = -dy / distance;
              const normY = dx / distance;
              const bend = 12 + (index % 4) * 8;
              const cx = (from.x + to.x) / 2 + normX * bend;
              const cy = (from.y + to.y) / 2 + normY * bend;
              const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
              const key = `${edge.from}-${edge.to}-${edge.kind}`;
              const selectedRelated = selectedCardId && (edge.from === selectedCardId || edge.to === selectedCardId);
              const onPath = pathEdgeSet.has(key);
              const toWincon = highlightWinconPaths && winconNodeIds.has(edge.to);
              const meta = tutorKindMeta(edge.kind);
              return <path key={`${key}-${index}`} d={path} fill="none" stroke={meta.color} strokeWidth={onPath ? 6 : selectedRelated ? 5 : toWincon ? 4 : 3} opacity={onPath ? 1 : selectedCardId ? (selectedRelated ? 1 : 0.14) : (toWincon ? 0.9 : 0.42)} />;
            })}
          </svg>
          {visibleCards.map((card) => {
            const pos = positions.get(card.id);
            if (!pos) return null;
            const zIndex = card.id === selectedCardId ? 1000 : card.id === rootId ? 500 : 1;
            const dimmed = selectedCardId && card.id !== selectedCardId && !selectedNeighborIds.has(card.id) && !pathNodes.includes(card.id);
            return (
              <div key={card.id} style={{ position: "absolute", left: pos.x - cardWidth / 2, top: pos.y - cardHeight / 2, zIndex, opacity: dimmed ? 0.45 : 1 }}>
                <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} traitMap={traitMap} isSelected={card.id === selectedCardId} onSelect={onSelectCard} zIndex={zIndex} imageMode={imageMode} />
              </div>
            );
          })}
        </>
      )}
    </GraphViewport>
  );
}

function TraitEditor({ traits, onCreateTrait, onAddTraitToCard, cardTraitIds, traitMap, onMoveTrait, onRemoveTrait }) {
  const [newTraitName, setNewTraitName] = useState("");
  const [newTraitColor, setNewTraitColor] = useState("#2563eb");
  const [newTraitOutline, setNewTraitOutline] = useState("#1d4ed8");

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-xs font-medium text-slate-700">Assigned traits</div>
        <div className="space-y-2">
          {cardTraitIds?.length ? cardTraitIds.map((traitId, index) => {
            const trait = traitMap[traitId];
            if (!trait) return null;
            return (
              <div key={traitId} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                <TraitPill trait={trait} />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onMoveTrait(index, -1)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onMoveTrait(index, 1)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onRemoveTrait(traitId)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
              </div>
            );
          }) : <div className="text-xs text-slate-500">No traits assigned yet.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-xs font-medium text-slate-700">Add existing trait</div>
        <div className="flex flex-wrap gap-2">
          {traits.map((trait) => (
            <button key={trait.id} type="button" onClick={() => onAddTraitToCard(trait.id)} className="rounded-xl border border-slate-300 px-2 py-1 hover:bg-slate-50">
              <TraitPill trait={trait} />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-xs font-medium text-slate-700">Create new trait</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={newTraitName} onChange={(e) => setNewTraitName(e.target.value)} placeholder="Trait name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">Fill <input type="color" value={newTraitColor} onChange={(e) => setNewTraitColor(e.target.value)} className="h-8 w-10" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm">Outline <input type="color" value={newTraitOutline} onChange={(e) => setNewTraitOutline(e.target.value)} className="h-8 w-10" /></label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!newTraitName.trim()) return;
            onCreateTrait({ name: newTraitName.trim(), color: newTraitColor, outline: newTraitOutline });
            setNewTraitName("");
          }}
          className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Tag className="mr-1 inline h-4 w-4" />Create trait
        </button>
      </div>
    </div>
  );
}

function EditableCardRow({ card, isRoot, onDelete, onSave, onEditRoot, traits, traitMap, onCreateTrait }) {
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

  function addTraitToDraft(traitId) {
    setDraft((prev) => ({
      ...prev,
      traits: prev.traits?.includes(traitId) ? prev.traits : [...(prev.traits || []), traitId],
    }));
  }

  function moveTrait(index, direction) {
    setDraft((prev) => {
      const nextTraits = [...(prev.traits || [])];
      const target = index + direction;
      if (target < 0 || target >= nextTraits.length) return prev;
      [nextTraits[index], nextTraits[target]] = [nextTraits[target], nextTraits[index]];
      return { ...prev, traits: nextTraits };
    });
  }

  function removeTrait(traitId) {
    setDraft((prev) => ({ ...prev, traits: (prev.traits || []).filter((id) => id !== traitId) }));
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
            {card.traits?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{card.traits.map((id) => traitMap[id] ? <TraitPill key={id} trait={traitMap[id]} /> : null)}</div> : null}
            <div className="mt-2 text-xs text-slate-600">{card.types || "—"}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onEditRoot(card.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Make root"><Network className="h-4 w-4" /></button>
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Edit card"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={() => onDelete(card.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Delete card"><Trash2 className="h-4 w-4" /></button>
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
        <TraitEditor
          traits={traits}
          traitMap={traitMap}
          cardTraitIds={draft.traits || []}
          onCreateTrait={(trait) => {
            const createdId = onCreateTrait(trait);
            addTraitToDraft(createdId);
          }}
          onAddTraitToCard={addTraitToDraft}
          onMoveTrait={moveTrait}
          onRemoveTrait={removeTrait}
        />
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => { setDraft(card); setEditing(false); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><X className="mr-1 inline h-4 w-4" />Cancel</button>
          <button type="button" onClick={save} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"><Save className="mr-1 inline h-4 w-4" />Save</button>
        </div>
      </div>
    </div>
  );
}

export default function MTGTutorTreeApp() {
  const [cards, setCards] = useState(starterCards.map((card) => ({ ...card, traits: card.traits || [] })));
  const [traits, setTraits] = useState(defaultTraits);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [tutorOptions, setTutorOptions] = useState(defaultTutorOptions);
  const [rootId, setRootId] = useState(starterCards[0]?.id ?? "");
  const [viewStyle, setViewStyle] = useState("layered");
  const [edgeBundlingStrength, setEdgeBundlingStrength] = useState(1);
  const [lookupStatus, setLookupStatus] = useState({ loading: false, error: "", found: "" });
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportStatus, setBulkImportStatus] = useState({ loading: false, error: "", found: "" });
  const [cardSearch, setCardSearch] = useState("");
  const [showOnlyConnected, setShowOnlyConnected] = useState(false);
  const [highlightWinconPaths, setHighlightWinconPaths] = useState(false);
  const [pathStartId, setPathStartId] = useState("");
  const [pathEndId, setPathEndId] = useState("");
  const [autoImportUrl, setAutoImportUrl] = useState("");
  const [autoImportStatus, setAutoImportStatus] = useState({ loading: false, error: "", found: "" });
  const [imageMode, setImageMode] = useState(true);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    manaValue: 1,
    types: "",
    isArtifact: false,
    isCreature: true,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
    traits: [],
  });

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function createTrait({ name, color, outline }) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();
    const finalId = traits.some((trait) => trait.id === id) ? `${id}-${crypto.randomUUID().slice(0, 6)}` : id;
    const next = { id: finalId, name, color, outline };
    setTraits((prev) => [...prev, next]);
    return finalId;
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
        imported.push({ id: crypto.randomUUID(), ...parsed, isChangeling: item.forceChangeling || parsed.isChangeling, isImportant: item.isImportant, traits: [] });
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

  async function autoImportDeck() {
    const url = autoImportUrl.trim();
    if (!url) return;
    setAutoImportStatus({ loading: true, error: "", found: "" });
    try {
      let lines = [];
      if (/moxfield\.com\/decks\//i.test(url)) {
        const deckId = url.split("/decks/")[1]?.split(/[?#]/)[0];
        const response = await fetch(`https://api2.moxfield.com/v3/decks/all/${deckId}`);
        const payload = await response.json();
        const entries = Object.values(payload?.mainboard || {});
        lines = entries.map((entry) => `${entry.quantity || 1} ${entry.card?.name || entry.cardName || ""}`);
      } else if (/archidekt\.com\/decks\//i.test(url)) {
        const deckId = url.split("/decks/")[1]?.split(/[?#/]/)[0];
        const response = await fetch(`https://archidekt.com/api/decks/${deckId}/small/`);
        const payload = await response.json();
        const entries = payload?.cards || [];
        lines = entries.map((entry) => `${entry.quantity || 1} ${entry.card?.oracleCard?.name || entry.card?.name || ""}`);
      } else {
        throw new Error("Auto-import currently supports Moxfield and Archidekt deck URLs.");
      }

      setBulkImportText(lines.join("\n"));
      setAutoImportStatus({ loading: false, error: "", found: `Loaded ${lines.length} deck entries into bulk import.` });
    } catch (error) {
      setAutoImportStatus({ loading: false, error: error instanceof Error ? error.message : "Auto-import failed.", found: "" });
    }
  }

  function addCard(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const next = { id: crypto.randomUUID(), ...form, name: form.name.trim(), manaValue: Number(form.manaValue), types: form.types.trim(), imageUrl: form.imageUrl || "", traits: form.traits || [] };
    setCards((prev) => [...prev, next]);
    setRootId((current) => current || next.id);
    setForm({ name: "", manaValue: 1, types: "", isArtifact: false, isCreature: true, isChangeling: false, isImportant: false, imageUrl: "", traits: [] });
    setLookupStatus({ loading: false, error: "", found: "" });
  }

  function deleteCard(id) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (rootId === id) {
      const remaining = cards.filter((c) => c.id !== id);
      setRootId(remaining[0]?.id ?? "");
    }
    if (selectedCardId === id) setSelectedCardId("");
  }

  function updateCard(id, patch) {
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }

  function saveDeck() {
    const payload = {
      version: 1,
      cards,
      traits,
      tutorOptions,
      rootId,
      viewStyle,
      showOnlyConnected,
      highlightWinconPaths,
      imageMode,
      edgeBundlingStrength,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mtg-tutor-tree-deck.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadDeckFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        setCards(payload.cards || []);
        setTraits(payload.traits || defaultTraits);
        setTutorOptions(payload.tutorOptions || defaultTutorOptions);
        setRootId(payload.rootId || payload.cards?.[0]?.id || "");
        setViewStyle(payload.viewStyle || "layered");
        setShowOnlyConnected(Boolean(payload.showOnlyConnected));
        setHighlightWinconPaths(Boolean(payload.highlightWinconPaths));
        setImageMode(payload.imageMode ?? true);
        setEdgeBundlingStrength(payload.edgeBundlingStrength ?? 1);
        setSelectedCardId("");
      } catch {
        // noop
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const importantCount = cards.filter((c) => c.isImportant).length;
  const changelingCount = cards.filter((c) => c.isChangeling).length;
  const traitMap = useMemo(() => Object.fromEntries(traits.map((trait) => [trait.id, trait])), [traits]);
  const graphData = useMemo(() => buildDiagram(cards, rootId, tutorOptions, showOnlyConnected), [cards, rootId, tutorOptions, showOnlyConnected]);
  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const efficiency = useMemo(() => computeEfficiency(cards, graphData.edges), [cards, graphData.edges]);
  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      [
        card.name,
        card.types,
        card.manaValue,
        card.isArtifact ? "artifact" : "",
        card.isCreature ? "creature" : "",
        card.isImportant ? "important" : "",
        card.isChangeling ? "changeling" : "",
        ...(card.traits || []).map((id) => traitMap[id]?.name || ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [cards, cardSearch, traitMap]);

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;
  const pathNodes = useMemo(() => findBestPath(pathStartId, pathEndId, graphData.edges, cardsById), [pathStartId, pathEndId, graphData.edges, cardsById]);
  const winconNodeIds = useMemo(() => new Set(cards.filter((card) => card.isImportant || (card.traits || []).includes("wincon")).map((card) => card.id)), [cards]);
  const topEfficiencyCards = useMemo(() => [...cards].sort((a, b) => (efficiency.scores[b.id] || 0) - (efficiency.scores[a.id] || 0)).slice(0, 5), [cards, efficiency]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 text-slate-900 lg:p-6">
      <div className="mx-auto max-w-[1900px]">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><Network className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">MTG Tutor Tree Builder</h1></div>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">Build automatic tutor trees for <span className="font-medium">Oswald Fiddlebender</span>, <span className="font-medium">Pyre of Heroes</span>, and <span className="font-medium">Birthing Pod</span>. Add cards manually or fetch them from Scryfall, then inspect lines, roles, and paths.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill kind="important">{importantCount} important</Pill>
              <Pill kind="changeling">{changelingCount} changelings</Pill>
              <Pill>{traits.length} traits</Pill>
              <Pill>{cards.length} cards total</Pill>
            </div>
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)_360px] xl:grid-cols-[390px_minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <CollapsiblePanel title="Add card" icon={Plus} defaultOpen={true}>
              <form onSubmit={addCard} className="space-y-4">
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
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"><Plus className="h-4 w-4" />Add card</button>
              </form>
            </CollapsiblePanel>

            <CollapsiblePanel title="Auto-import / bulk import" icon={Upload} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Deck URL</label>
                  <div className="flex gap-2">
                    <input value={autoImportUrl} onChange={(e) => setAutoImportUrl(e.target.value)} placeholder="Paste Moxfield or Archidekt deck URL" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <button type="button" onClick={autoImportDeck} disabled={autoImportStatus.loading || !autoImportUrl.trim()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60">{autoImportStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}</button>
                  </div>
                  {autoImportStatus.error ? <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{autoImportStatus.error}</div> : null}
                  {autoImportStatus.found ? <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{autoImportStatus.found}</div> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paste decklist or card names</label>
                  <textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder={`1 Universal Automaton\n1 Mirror Entity *\n1 Amoeboid Changeling [important]\n1 Masked Vandal [changeling]`} className="min-h-[160px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <p className="mt-2 text-xs text-slate-500">Supports lines like <span className="font-medium">1 Card Name</span>. Use <span className="font-medium">*</span> or <span className="font-medium">[important]</span> to flag a card. Use <span className="font-medium">[changeling]</span> to force changeling on a line.</p>
                </div>
                <button type="button" onClick={bulkImportCards} disabled={bulkImportStatus.loading || !bulkImportText.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{bulkImportStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Import from Scryfall</button>
                {bulkImportStatus.error ? <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4" />{bulkImportStatus.error}</div> : null}
                {bulkImportStatus.found ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{bulkImportStatus.found}</div> : null}
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel title="Tutor options" icon={Swords} defaultOpen={true}>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={tutorOptions.oswald} onChange={(e) => setTutorOptions((prev) => ({ ...prev, oswald: e.target.checked }))} /> Oswald Fiddlebender</label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={tutorOptions.pyre} onChange={(e) => setTutorOptions((prev) => ({ ...prev, pyre: e.target.checked }))} /> Pyre of Heroes</label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={tutorOptions.birthingPod} onChange={(e) => setTutorOptions((prev) => ({ ...prev, birthingPod: e.target.checked }))} /> Birthing Pod</label>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={showOnlyConnected} onChange={(e) => setShowOnlyConnected(e.target.checked)} /> Show only connected cards</label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={highlightWinconPaths} onChange={(e) => setHighlightWinconPaths(e.target.checked)} /> Win condition highlight mode</label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={imageMode} onChange={(e) => setImageMode(e.target.checked)} /> Card image mode</label>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                <div className="font-medium">Best supported auto-import sites</div>
                <div className="mt-1 text-xs text-slate-500">Moxfield and Archidekt are supported in this pass.</div>
              </div>
            </CollapsiblePanel>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Route className="h-5 w-5" /><h2 className="text-lg font-semibold">Path finder</h2></div>
              <div className="space-y-3">
                <select value={pathStartId} onChange={(e) => setPathStartId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Start card</option>
                  {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
                <select value={pathEndId} onChange={(e) => setPathEndId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">End card</option>
                  {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                  {pathNodes.length ? pathNodes.map((id) => cards.find((c) => c.id === id)?.name || id).join(" → ") : "No current directed path found."}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><LayoutGrid className="h-5 w-5" /><h2 className="text-lg font-semibold">View style</h2></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => setViewStyle("layered")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "layered" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" />Layered tree</button>
                <button type="button" onClick={() => setViewStyle("physics")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "physics" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><Orbit className="h-4 w-4" />Physics graph</button>
                <button type="button" onClick={() => setViewStyle("rings")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "rings" ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><CircleDot className="h-4 w-4" />Mana value rings</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Physics graph spreads everything out automatically to reduce overlap. Mana value rings gives you a more structured overview by mana band. All views support zoom, auto-fit, and middle-mouse panning. Physics view now starts with larger cards and still shrinks them more aggressively as you zoom in.</p>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Edge bundling</label>
                <input type="range" min="0" max="2" step="0.1" value={edgeBundlingStrength} onChange={(e) => setEdgeBundlingStrength(Number(e.target.value))} className="w-full" />
                <div className="mt-1 text-xs text-slate-500">Strength {edgeBundlingStrength.toFixed(1)}</div>
              </div>
            </div>

            <CollapsiblePanel title="Rules used" icon={Sparkles} defaultOpen={false}>
              <EdgeLegend />
            </CollapsiblePanel>

            <CollapsiblePanel title="Current card pool" icon={Sparkles} defaultOpen={true} rightContent={<div className="text-xs text-slate-500">{filteredCards.length} shown</div>}>
              <div className="mb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={cardSearch} onChange={(e) => setCardSearch(e.target.value)} placeholder="Search current card pool" className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400" />
                </div>
              </div>
              <div className="max-h-[600px] space-y-3 overflow-auto pr-1">
                {filteredCards.map((card) => (
                  <EditableCardRow key={card.id} card={card} isRoot={card.id === rootId} onDelete={deleteCard} onSave={updateCard} onEditRoot={setRootId} traits={traits} traitMap={traitMap} onCreateTrait={createTrait} />
                ))}
              </div>
            </CollapsiblePanel>
          </div>

          {viewStyle === "layered" ? (
            <DiagramView
              cards={cards}
              rootId={rootId}
              tutorOptions={tutorOptions}
              onDelete={deleteCard}
              traitMap={traitMap}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              showOnlyConnected={showOnlyConnected}
              pathNodes={pathNodes}
              highlightWinconPaths={highlightWinconPaths}
              winconNodeIds={winconNodeIds}
              imageMode={imageMode}
            />
          ) : viewStyle === "physics" ? (
            <PhysicsView
              cards={cards}
              rootId={rootId}
              tutorOptions={tutorOptions}
              onDelete={deleteCard}
              traitMap={traitMap}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              showOnlyConnected={showOnlyConnected}
              pathNodes={pathNodes}
              highlightWinconPaths={highlightWinconPaths}
              winconNodeIds={winconNodeIds}
              edgeBundlingStrength={edgeBundlingStrength}
              imageMode={imageMode}
            />
          ) : (
            <ManaRingsView
              cards={cards}
              rootId={rootId}
              tutorOptions={tutorOptions}
              onDelete={deleteCard}
              traitMap={traitMap}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              showOnlyConnected={showOnlyConnected}
              pathNodes={pathNodes}
              highlightWinconPaths={highlightWinconPaths}
              winconNodeIds={winconNodeIds}
              imageMode={imageMode}
            />
          )}

          <div className="space-y-6">
            <InspectorPanel selectedCard={selectedCard} cards={cards} edges={graphData.edges} traitMap={traitMap} efficiency={efficiency} pathNodes={pathNodes} />

            <CollapsiblePanel title="Tutor efficiency" icon={Swords} defaultOpen={true}>
              <div className="space-y-2">
                {topEfficiencyCards.map((card, index) => (
                  <div key={card.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="text-sm font-semibold">{index + 1}. {card.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Score {efficiency.scores[card.id] || 0} • Out {efficiency.outgoing[card.id] || 0} • In {efficiency.incoming[card.id] || 0}</div>
                  </div>
                ))}
              </div>
            </CollapsiblePanel>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><Save className="h-5 w-5" />Save / load deck</div>
              <div className="flex flex-col gap-3">
                <button type="button" onClick={saveDeck} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Export deck JSON</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><FolderOpen className="h-4 w-4" />Load deck JSON</button>
                <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={loadDeckFromFile} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
