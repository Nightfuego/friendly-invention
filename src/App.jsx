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
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  Gamepad2,
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
    traits: ["interaction"],
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
    traits: ["wincon"],
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
  { id: "artifact-token-gen", name: "Artifact Token Gen", color: "#0f766e", outline: "#115e59" },
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

function cardProducesArtifactToken(card) {
  return card.traits?.includes("artifact-token-gen");
}

function makeVirtualArtifactTokenSource(card) {
  return {
    id: `${card.id}__token`,
    name: `${card.name} Token`,
    manaValue: 0,
    types: "Artifact Token",
    isArtifact: true,
    isCreature: false,
    isChangeling: false,
    isImportant: false,
    imageUrl: "",
    traits: ["artifact-token-gen"],
    isVirtualToken: true,
    sourceCardId: card.id,
  };
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
      style={{ backgroundColor: hexToRgba(trait.color, 0.14), borderColor: trait.outline, color: trait.outline }}
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
    ? { borderColor: primaryTrait.outline, boxShadow: `0 0 0 2px ${hexToRgba(primaryTrait.color, 0.18)}` }
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
        {!card.isVirtualToken ? (
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
        ) : null}
      </div>

      {imageMode && card.imageUrl ? <img src={card.imageUrl} alt={card.name} className={`mt-3 ${baseHeight} w-full rounded-xl border border-slate-200 object-cover`} /> : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.isArtifact && <Pill kind="artifact">Artifact</Pill>}
        {card.isCreature && <Pill kind="creature">Creature</Pill>}
        {card.isChangeling && <Pill kind="changeling">Changeling</Pill>}
        {card.isImportant && <Pill kind="important">Important</Pill>}
        {card.isVirtualToken && <Pill>Virtual Token</Pill>}
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
        <div><span className="font-medium text-slate-800">Artifact Token Gen:</span> creates a virtual mana value 0 artifact token node that can start Oswald lines.</div>
      </div>
    </div>
  );
}

function buildDiagram(cards, rootId, tutorOptions, showOnlyConnected) {
  const virtualTokens = cards
    .filter((card) => cardProducesArtifactToken(card))
    .map((card) => makeVirtualArtifactTokenSource(card));
  const allCards = [...cards, ...virtualTokens];
  const root = allCards.find((c) => c.id === rootId) ?? cards.find((c) => c.id === rootId) ?? null;

  const layersMap = new Map();
  for (const card of allCards) {
    if (!layersMap.has(card.manaValue)) layersMap.set(card.manaValue, []);
    layersMap.get(card.manaValue).push(card);
  }
  const layers = [...layersMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([manaValue, items]) => ({ manaValue, items }));

  const edges = [];
  for (const from of allCards) {
    for (const to of allCards) {
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
  const visibleCardIds = showOnlyConnected ? connected : new Set(allCards.map((c) => c.id));
  if (root) visibleCardIds.add(root.id);
  return { root, layers, edges, reachable, connected, visibleCardIds, allCards, virtualTokens };
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
    scores[card.id] = outgoing[card.id] * 2 + incoming[card.id] + (card.isImportant ? 2 : 0) + (card.isVirtualToken ? 0.5 : 0);
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

function getPathEdgeSet(pathNodes, edges) {
  const pathEdgeSet = new Set();
  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    edges
      .filter((edge) => edge.from === from && edge.to === to)
      .forEach((edge) => pathEdgeSet.add(`${edge.from}-${edge.to}-${edge.kind}`));
  }
  return pathEdgeSet;
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
    setOffset({
      x: Math.max(padding, (node.clientWidth - contentWidth) / 2),
      y: Math.max(padding, (node.clientHeight - contentHeight) / 2),
    });
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

  function handleWheel(event) {
    if (!event.shiftKey) return;
    event.preventDefault();
    applyScale(scale + (event.deltaY > 0 ? -0.08 : 0.08));
  }

  function handleMouseDown(event) {
    const wantsPan = event.button === 1 || (event.button === 0 && event.shiftKey);
    if (!wantsPan) return;
    event.preventDefault();
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }

  function handleMouseMove(event) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.startOffsetX + dx, y: dragRef.current.startOffsetY + dy });
  }

  function handleMouseUp() {
    dragRef.current.active = false;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          <Pill>Shift+drag or middle mouse to pan</Pill>
          <Pill>Shift + wheel to zoom</Pill>
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
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="h-[78vh] min-h-[700px] overflow-hidden rounded-2xl border border-slate-200 bg-white select-none"
        style={{ cursor: dragRef.current.active ? "grabbing" : "default" }}
      >
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            position: "relative",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {typeof children === "function" ? children(scale) : children}
        </div>
      </div>
    </div>
  );
}

function CollapsiblePanel({ title, icon: Icon, defaultOpen = true, children, rightContent = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
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
          {selectedCard.isVirtualToken && <Pill>Virtual Token</Pill>}
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
        <button type="button" onClick={() => {
          if (!newTraitName.trim()) return;
          onCreateTrait({ name: newTraitName.trim(), color: newTraitColor, outline: newTraitOutline });
          setNewTraitName("");
        }} className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"><Tag className="mr-1 inline h-4 w-4" />Create trait</button>
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
    onSave(card.id, { ...draft, manaValue: Number(draft.manaValue), types: draft.types.trim() });
    setEditing(false);
  }
  function addTraitToDraft(traitId) {
    setDraft((prev) => ({ ...prev, traits: prev.traits?.includes(traitId) ? prev.traits : [...(prev.traits || []), traitId] }));
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
        <TraitEditor traits={traits} traitMap={traitMap} cardTraitIds={draft.traits || []} onCreateTrait={(trait) => { const createdId = onCreateTrait(trait); addTraitToDraft(createdId); }} onAddTraitToCard={addTraitToDraft} onMoveTrait={moveTrait} onRemoveTrait={removeTrait} />
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => { setDraft(card); setEditing(false); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><X className="mr-1 inline h-4 w-4" />Cancel</button>
          <button type="button" onClick={save} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"><Save className="mr-1 inline h-4 w-4" />Save</button>
        </div>
      </div>
    </div>
  );
}

function useGraphInteraction(edges, selectedCardId, pathNodes, highlightWinconPaths, winconNodeIds) {
  const selectedNeighborIds = useMemo(() => {
    const set = new Set();
    edges.forEach((edge) => {
      if (edge.from === selectedCardId) set.add(edge.to);
      if (edge.to === selectedCardId) set.add(edge.from);
    });
    return set;
  }, [edges, selectedCardId]);
  const pathEdgeSet = useMemo(() => getPathEdgeSet(pathNodes, edges), [pathNodes, edges]);
  function edgeVisual(edge, baseOpacity = 0.42) {
    const key = `${edge.from}-${edge.to}-${edge.kind}`;
    const selectedRelated = selectedCardId && (edge.from === selectedCardId || edge.to === selectedCardId);
    const onPath = pathEdgeSet.has(key);
    const toWincon = highlightWinconPaths && winconNodeIds.has(edge.to);
    return {
      strokeWidth: onPath ? 6 : selectedRelated ? 5 : toWincon ? 4 : 3,
      opacity: onPath ? 1 : selectedCardId ? (selectedRelated ? 1 : 0.14) : (toWincon ? 0.9 : baseOpacity),
    };
  }
  return { selectedNeighborIds, edgeVisual };
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
  const { selectedNeighborIds, edgeVisual } = useGraphInteraction(edges, selectedCardId, pathNodes, highlightWinconPaths, winconNodeIds);

  const filteredLayers = layers
    .map((layer) => ({ ...layer, items: layer.items.filter((item) => visibleCardIds.has(item.id) && (!root || reachable.has(item.id) || !showOnlyConnected)) }))
    .filter((layer) => layer.items.length > 0);

  filteredLayers.forEach((layer, layerIndex) => {
    layer.items.forEach((card, cardIndex) => {
      nodePositions.set(card.id, { x: leftPadding + layerIndex * layerGap, y: topPadding + cardIndex * nodeGap });
    });
  });

  const width = Math.max(1600, filteredLayers.length * layerGap + 520);
  const tallestLayer = Math.max(1, ...filteredLayers.map((l) => l.items.length));
  const height = Math.max(1100, tallestLayer * nodeGap + 260);
  const visibleEdges = edges.filter((edge) => nodePositions.has(edge.from) && nodePositions.has(edge.to));

  return (
    <GraphViewport width={width} height={height} autoFit={true} title={<><Pill kind="artifact">Gray = Oswald</Pill><Pill kind="creature">Green = Pyre</Pill><Pill>Teal = Birthing Pod</Pill>{root && <Pill>Root {root.name}</Pill>}</>}>
      {() => (
        <>
          <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
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
              const meta = tutorKindMeta(edge.kind);
              const visual = edgeVisual(edge, 0.7);
              return <path key={`${edge.from}-${edge.to}-${edge.kind}-${index}`} d={path} fill="none" stroke={meta.color} strokeWidth={visual.strokeWidth} opacity={visual.opacity} />;
            })}
          </svg>
          {filteredLayers.flatMap((layer) => layer.items.map((card) => {
            const pos = nodePositions.get(card.id);
            const zIndex = card.id === selectedCardId ? 1000 : card.id === rootId ? 500 : 1;
            const dimmed = selectedCardId && card.id !== selectedCardId && !selectedNeighborIds.has(card.id) && !pathNodes.includes(card.id);
            return (
              <div key={card.id} style={{ position: "absolute", left: pos.x, top: pos.y, zIndex, opacity: dimmed ? 0.5 : 1, pointerEvents: "auto" }}>
                <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} traitMap={traitMap} isSelected={card.id === selectedCardId} onSelect={onSelectCard} zIndex={zIndex} imageMode={!card.isVirtualToken && imageMode} />
              </div>
            );
          }))}
        </>
      )}
    </GraphViewport>
  );
}

function ManaRingsView({ cards, rootId, tutorOptions, onDelete, traitMap, selectedCardId, onSelectCard, showOnlyConnected, pathNodes, highlightWinconPaths, winconNodeIds, imageMode }) {
  const { edges, visibleCardIds, allCards } = useMemo(() => buildDiagram(cards, rootId, tutorOptions, showOnlyConnected), [cards, rootId, tutorOptions, showOnlyConnected]);
  const visibleCards = allCards.filter((card) => visibleCardIds.has(card.id));
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
      positions.set(card.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius });
    });
  });
  if (positions.has(rootId)) positions.set(rootId, { x: centerX, y: centerY });

  const { selectedNeighborIds, edgeVisual } = useGraphInteraction(edges, selectedCardId, pathNodes, highlightWinconPaths, winconNodeIds);

  return (
    <GraphViewport width={width} height={height} autoFit={true} title={<><Pill>Mana value rings</Pill><Pill kind="artifact">Gray = Oswald</Pill><Pill kind="creature">Green = Pyre</Pill><Pill>Teal = Birthing Pod</Pill></>}>
      {() => (
        <>
          <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
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
              const bend = 28 + (index % 4) * 14;
              const cx = (from.x + to.x) / 2 + normX * bend;
              const cy = (from.y + to.y) / 2 + normY * bend;
              const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
              const meta = tutorKindMeta(edge.kind);
              const visual = edgeVisual(edge, 0.42);
              return <path key={`${edge.from}-${edge.to}-${edge.kind}-${index}`} d={path} fill="none" stroke={meta.color} strokeWidth={visual.strokeWidth} opacity={visual.opacity} />;
            })}
          </svg>
          {visibleCards.map((card) => {
            const pos = positions.get(card.id);
            if (!pos) return null;
            const zIndex = card.id === selectedCardId ? 1000 : card.id === rootId ? 500 : 1;
            const dimmed = selectedCardId && card.id !== selectedCardId && !selectedNeighborIds.has(card.id) && !pathNodes.includes(card.id);
            return (
              <div key={card.id} style={{ position: "absolute", left: pos.x - cardWidth / 2, top: pos.y - cardHeight / 2, zIndex, opacity: dimmed ? 0.45 : 1, pointerEvents: "auto" }}>
                <CardNode card={card} isRoot={card.id === rootId} onDelete={onDelete} traitMap={traitMap} isSelected={card.id === selectedCardId} onSelect={onSelectCard} zIndex={zIndex} imageMode={!card.isVirtualToken && imageMode} />
              </div>
            );
          })}
        </>
      )}
    </GraphViewport>
  );
}

function LiveGameTab({ cards, graphData, traitMap, tutorOptions }) {
  const [openingHandText, setOpeningHandText] = useState("");
  const cardMap = useMemo(() => new Map(graphData.allCards.map((card) => [card.id, card])), [graphData.allCards]);
  const openingHandNames = useMemo(() => openingHandText.split("\n").map((s) => s.trim()).filter(Boolean), [openingHandText]);
  const openingHandCards = useMemo(() => {
    const matched = [];
    openingHandNames.forEach((name) => {
      const found = cards.find((card) => card.name.toLowerCase() === name.toLowerCase());
      if (found) matched.push(found);
    });
    return matched;
  }, [openingHandNames, cards]);

  const winconTargets = useMemo(() => cards.filter((card) => card.isImportant || (card.traits || []).includes("wincon")), [cards]);

  const suggestions = useMemo(() => {
    const out = [];
    openingHandCards.forEach((startCard) => {
      const startIds = [startCard.id];
      if (startCard.traits?.includes("artifact-token-gen")) startIds.push(`${startCard.id}__token`);
      startIds.forEach((startId) => {
        winconTargets.forEach((target) => {
          const path = findBestPath(startId, target.id, graphData.edges, cardMap);
          if (path.length) {
            out.push({
              from: cardMap.get(startId)?.name || startCard.name,
              to: target.name,
              steps: path.length - 1,
              pathNames: path.map((id) => cardMap.get(id)?.name || id),
            });
          }
        });
      });
    });
    out.sort((a, b) => a.steps - b.steps || a.to.localeCompare(b.to));
    const unique = [];
    const seen = new Set();
    out.forEach((item) => {
      const key = `${item.from}|${item.to}|${item.pathNames.join(">")}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(item);
    });
    return unique.slice(0, 12);
  }, [openingHandCards, winconTargets, graphData.edges, cardMap]);

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <CollapsiblePanel title="Opening hand" icon={Gamepad2} defaultOpen={true}>
          <textarea
            value={openingHandText}
            onChange={(e) => setOpeningHandText(e.target.value)}
            placeholder={`Skrelv, Defector Mite\nOswald Fiddlebender\nWojek Investigator`}
            className="min-h-[220px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">Enter one drawn card per line, matching names from the loaded deck. This first pass ignores mana timing and just finds the shortest currently-known tutor routes to win conditions.</p>
        </CollapsiblePanel>

        <CollapsiblePanel title="Detected opening hand cards" icon={Search} defaultOpen={true}>
          <div className="space-y-2 text-sm text-slate-700">
            {openingHandCards.length ? openingHandCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-slate-200 p-3">
                <div className="font-medium">{card.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {card.isArtifact && <Pill kind="artifact">Artifact</Pill>}
                  {card.isCreature && <Pill kind="creature">Creature</Pill>}
                  {card.traits?.map((id) => traitMap[id] ? <TraitPill key={id} trait={traitMap[id]} /> : null)}
                </div>
              </div>
            )) : <div className="rounded-xl border border-slate-200 p-3 text-slate-500">No matching cards detected yet.</div>}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel title="Live-game assumptions in this pass" icon={Sparkles} defaultOpen={false}>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 p-3">Uses the currently loaded deck graph and currently enabled tutor engines.</div>
            <div className="rounded-xl border border-slate-200 p-3">Does not yet check mana production, colors, summoning sickness, or turn sequencing.</div>
            <div className="rounded-xl border border-slate-200 p-3">Artifact Token Gen cards are treated as having access to a virtual mana value 0 artifact token node.</div>
            <div className="rounded-xl border border-slate-200 p-3">Win conditions are cards marked Important or tagged with the Wincon trait.</div>
            <div className="rounded-xl border border-slate-200 p-3">Enabled tutors: {Object.entries(tutorOptions).filter(([, value]) => value).map(([key]) => key).join(", ") || "none"}.</div>
          </div>
        </CollapsiblePanel>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-lg font-semibold">Fastest wincon paths from opening hand</div>
          <div className="space-y-3">
            {suggestions.length ? suggestions.map((item, index) => (
              <div key={`${item.from}-${item.to}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">{item.from} → {item.to}</div>
                <div className="mt-1 text-xs text-slate-500">{item.steps} step{item.steps === 1 ? "" : "s"}</div>
                <div className="mt-2 text-sm text-slate-700">{item.pathNames.join(" → ")}</div>
              </div>
            )) : <div className="rounded-2xl border border-slate-200 p-4 text-slate-500">No wincon paths found from the entered opening hand yet.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 text-lg font-semibold">Planned next live-game features</div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 p-3">Mana availability and turn-by-turn constraints</div>
            <div className="rounded-xl border border-slate-200 p-3">Tutor engine availability based on board state and drawn pieces</div>
            <div className="rounded-xl border border-slate-200 p-3">Alternative lines when a piece is removed or unavailable</div>
            <div className="rounded-xl border border-slate-200 p-3">Priority ranking between multiple wincons and stax states</div>
          </div>
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
  const [activeTab, setActiveTab] = useState("builder");
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
  const [form, setForm] = useState({ name: "", manaValue: 1, types: "", isArtifact: false, isCreature: true, isChangeling: false, isImportant: false, imageUrl: "", traits: [] });

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
    const payload = { version: 1, cards, traits, tutorOptions, rootId, viewStyle, showOnlyConnected, highlightWinconPaths, imageMode, activeTab };
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
        setViewStyle(payload.viewStyle === "rings" ? "rings" : "layered");
        setShowOnlyConnected(Boolean(payload.showOnlyConnected));
        setHighlightWinconPaths(Boolean(payload.highlightWinconPaths));
        setImageMode(payload.imageMode ?? true);
        setActiveTab(payload.activeTab === "live" ? "live" : "builder");
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
  const graphCardsById = useMemo(() => new Map(graphData.allCards.map((card) => [card.id, card])), [graphData.allCards]);
  const efficiency = useMemo(() => computeEfficiency(graphData.allCards, graphData.edges), [graphData.allCards, graphData.edges]);
  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => [card.name, card.types, card.manaValue, card.isArtifact ? "artifact" : "", card.isCreature ? "creature" : "", card.isImportant ? "important" : "", card.isChangeling ? "changeling" : "", ...(card.traits || []).map((id) => traitMap[id]?.name || "")].join(" ").toLowerCase().includes(q));
  }, [cards, cardSearch, traitMap]);
  const selectedCard = graphData.allCards.find((card) => card.id === selectedCardId) || null;
  const pathNodes = useMemo(() => findBestPath(pathStartId, pathEndId, graphData.edges, graphCardsById), [pathStartId, pathEndId, graphData.edges, graphCardsById]);
  const winconNodeIds = useMemo(() => new Set(graphData.allCards.filter((card) => card.isImportant || (card.traits || []).includes("wincon")).map((card) => card.id)), [graphData.allCards]);
  const topEfficiencyCards = useMemo(() => [...graphData.allCards].sort((a, b) => (efficiency.scores[b.id] || 0) - (efficiency.scores[a.id] || 0)).slice(0, 5), [graphData.allCards, efficiency]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 text-slate-900 lg:p-6">
      <div className="mx-auto max-w-[1900px]">
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setActiveTab("builder")} className={`rounded-2xl border px-4 py-2 text-sm font-medium ${activeTab === "builder" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-300 bg-white text-slate-700"}`}>Builder</button>
          <button type="button" onClick={() => setActiveTab("live")} className={`rounded-2xl border px-4 py-2 text-sm font-medium ${activeTab === "live" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700"}`}>Live game</button>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><Network className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">MTG Tutor Tree Builder</h1></div>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">Build automatic tutor trees for <span className="font-medium">Oswald Fiddlebender</span>, <span className="font-medium">Pyre of Heroes</span>, and <span className="font-medium">Birthing Pod</span>. Add cards manually or fetch them from Scryfall, then inspect lines, roles, and paths. Shift + scroll zooms. Artifact Token Gen creates virtual mana value 0 artifact token nodes for Oswald chains.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill kind="important">{importantCount} important</Pill>
              <Pill kind="changeling">{changelingCount} changelings</Pill>
              <Pill>{traits.length} traits</Pill>
              <Pill>{cards.length} real cards</Pill>
            </div>
          </div>
        </div>

        {activeTab === "builder" ? (
          <div className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)_360px] xl:grid-cols-[390px_minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <CollapsiblePanel title="Add card" icon={Plus} defaultOpen={true}>
                <form onSubmit={addCard} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Card name</label>
                    <div className="flex gap-2">
                      <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ex. Universal Automaton" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                      <button type="button" onClick={lookupCard} disabled={lookupStatus.loading || !form.name.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{lookupStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Lookup</button>
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
                    <textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder={`1 Universal Automaton\n1 Mirror Entity *\n1 Amoeboid Changeling [important]\n1 Wojek Investigator`} className="min-h-[160px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-sky-400" />
                    <p className="mt-2 text-xs text-slate-500">Use the Artifact Token Gen trait on cards like Wojek Investigator to create virtual mana value 0 artifact token nodes for Oswald lines.</p>
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
              </CollapsiblePanel>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><Route className="h-5 w-5" /><h2 className="text-lg font-semibold">Path finder</h2></div>
                <div className="space-y-3">
                  <select value={pathStartId} onChange={(e) => setPathStartId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Start card</option>{graphData.allCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
                  <select value={pathEndId} onChange={(e) => setPathEndId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">End card</option>{graphData.allCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">{pathNodes.length ? pathNodes.map((id) => graphCardsById.get(id)?.name || id).join(" → ") : "No current directed path found."}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><LayoutGrid className="h-5 w-5" /><h2 className="text-lg font-semibold">View style</h2></div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setViewStyle("layered")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "layered" ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" />Layered tree</button>
                  <button type="button" onClick={() => setViewStyle("rings")} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${viewStyle === "rings" ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}><CircleDot className="h-4 w-4" />Mana value rings</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Shift + scroll zooms. Shift + drag or middle mouse pans. Artifact Token Gen adds virtual MV 0 artifact token nodes for Oswald chains.</p>
              </div>

              <CollapsiblePanel title="Rules used" icon={Sparkles} defaultOpen={false}><EdgeLegend /></CollapsiblePanel>

              <CollapsiblePanel title="Current card pool" icon={Sparkles} defaultOpen={true} rightContent={<div className="flex items-center gap-2"><button type="button" onClick={() => { setCards([]); setRootId(""); setSelectedCardId(""); setPathStartId(""); setPathEndId(""); }} className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">Clear all</button><div className="text-xs text-slate-500">{filteredCards.length} shown</div></div>}>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={cardSearch} onChange={(e) => setCardSearch(e.target.value)} placeholder="Search current card pool" className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400" />
                  </div>
                </div>
                <div className="max-h-[600px] space-y-3 overflow-auto pr-1">
                  {filteredCards.map((card) => <EditableCardRow key={card.id} card={card} isRoot={card.id === rootId} onDelete={deleteCard} onSave={updateCard} onEditRoot={setRootId} traits={traits} traitMap={traitMap} onCreateTrait={createTrait} />)}
                </div>
              </CollapsiblePanel>
            </div>

            {viewStyle === "rings" ? (
              <ManaRingsView cards={cards} rootId={rootId} tutorOptions={tutorOptions} onDelete={deleteCard} traitMap={traitMap} selectedCardId={selectedCardId} onSelectCard={setSelectedCardId} showOnlyConnected={showOnlyConnected} pathNodes={pathNodes} highlightWinconPaths={highlightWinconPaths} winconNodeIds={winconNodeIds} imageMode={imageMode} />
            ) : (
              <DiagramView cards={cards} rootId={rootId} tutorOptions={tutorOptions} onDelete={deleteCard} traitMap={traitMap} selectedCardId={selectedCardId} onSelectCard={setSelectedCardId} showOnlyConnected={showOnlyConnected} pathNodes={pathNodes} highlightWinconPaths={highlightWinconPaths} winconNodeIds={winconNodeIds} imageMode={imageMode} />
            )}

            <div className="space-y-6">
              <InspectorPanel selectedCard={selectedCard} cards={graphData.allCards} edges={graphData.edges} traitMap={traitMap} efficiency={efficiency} pathNodes={pathNodes} />
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
        ) : (
          <LiveGameTab cards={cards} graphData={graphData} traitMap={traitMap} tutorOptions={tutorOptions} />
        )}
      </div>
    </div>
  );
}
