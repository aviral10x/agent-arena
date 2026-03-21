"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ReplayHud, type ReplayHudCritBanner, type ReplayHudDamageFloat } from "@/components/arena/replay-hud";
import type { ArenaReplayState, ReplayAgentState, ReplayTradeEvent } from "@/lib/arena-replay";

type ReplayArenaProps = {
  replay: ArenaReplayState;
};

type BattlePulse = {
  attackerId: string;
  defenderId: string;
  color: string;
  startedAt: number;
};

type SceneAgentNode = {
  id: string;
  anchor: THREE.Vector3;
  mesh: THREE.Mesh;
  wire: THREE.Mesh;
  light: THREE.PointLight;
  orbitInner: THREE.Mesh;
  orbitOuter: THREE.Mesh;
  panel: THREE.Mesh;
};

const GEOMETRIES = [
  new THREE.OctahedronGeometry(0.84, 0),
  new THREE.TetrahedronGeometry(0.98, 0),
  new THREE.IcosahedronGeometry(0.8, 0),
  new THREE.DodecahedronGeometry(0.8, 0),
];

const HUD_POSITIONS = ["northwest", "northeast", "southwest", "southeast"] as const;

const ACTION_PREFIXES = ["REROUTING", "LOCKING", "SCANNING", "PRESSURING", "HOLDING"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTimer(seconds: number) {
  const safeValue = Math.max(0, seconds);
  const minutes = Math.floor(safeValue / 60);
  const remainder = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function buildActionLabel(agent: ReplayAgentState, trade: ReplayTradeEvent, cursor: number) {
  const prefix = ACTION_PREFIXES[(trade.heat + cursor) % ACTION_PREFIXES.length];
  return `${prefix} ${trade.pair}`;
}

function buildTradeRail(trades: ReplayTradeEvent[]) {
  return trades.map((trade) => ({
    id: trade.id,
    time: trade.timeLabel,
    block: `BLK #${trade.blockNumber}`,
    agentId: trade.agentId,
    pair: trade.pair,
    side: trade.side,
    amount: trade.amount,
    impact: trade.impactLabel,
    note: trade.rationale,
  }));
}

function getCritBanner(trade: ReplayTradeEvent, color: string): ReplayHudCritBanner | null {
  if (trade.heat < 76 && Math.abs(trade.impactPct) < 1.15) {
    return null;
  }

  return {
    label: `CRITICAL TRADE / ${trade.agentName.toUpperCase()}`,
    tone: color,
  };
}

function getAgentColor(id: string, agents: ReplayAgentState[]) {
  return agents.find((agent) => agent.id === id)?.color ?? "#66e3ff";
}

function createScene(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  initialAgents: ReplayAgentState[],
  liveAgentsRef: React.MutableRefObject<ReplayAgentState[]>,
  battlePulseRef: React.MutableRefObject<BattlePulse | null>,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030711);
  scene.fog = new THREE.FogExp2(0x030711, 0.04);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 9.8, 16);
  camera.lookAt(0, 1.8, 0);

  scene.add(new THREE.AmbientLight(0x173250, 2.8));

  const nexusLight = new THREE.PointLight(0x67b8ff, 6.2, 32);
  nexusLight.position.set(0, 6.8, 0);
  scene.add(nexusLight);

  const floorGrid = new THREE.GridHelper(34, 34, 0x17345b, 0x0a1322);
  scene.add(floorGrid);

  const offsetGrid = new THREE.GridHelper(34, 17, 0x102544, 0x060d18);
  offsetGrid.rotation.y = Math.PI / 6;
  scene.add(offsetGrid);

  const floorDisk = new THREE.Mesh(
    new THREE.CircleGeometry(10.4, 72),
    new THREE.MeshBasicMaterial({
      color: 0x051120,
      transparent: true,
      opacity: 0.75,
    }),
  );
  floorDisk.rotation.x = -Math.PI / 2;
  floorDisk.position.y = -0.02;
  scene.add(floorDisk);

  const wallGroup = new THREE.Group();
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 4.2, 10),
      new THREE.MeshPhongMaterial({
        color: 0x0f2236,
        emissive: 0x102d52,
        shininess: 80,
      }),
    );
    pillar.position.set(Math.cos(angle) * 10.8, 2, Math.sin(angle) * 10.8);
    wallGroup.add(pillar);

    const beacon = new THREE.PointLight(index % 2 === 0 ? 0x66e3ff : 0xffd479, 1.4, 4.5);
    beacon.position.set(Math.cos(angle) * 10.6, 3.8, Math.sin(angle) * 10.6);
    wallGroup.add(beacon);
  }
  scene.add(wallGroup);

  function makeRing(radius: number, tube: number, color: number, opacity: number) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 96),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
    return ring;
  }

  const outerRing = makeRing(8.6, 0.07, 0x163f77, 0.34);
  const midRing = makeRing(5.3, 0.045, 0x14305c, 0.28);
  const innerRing = makeRing(2.5, 0.03, 0x1d4c9e, 0.26);

  const nexusGeometry = new THREE.IcosahedronGeometry(1.15, 1);
  const nexus = new THREE.Mesh(
    nexusGeometry,
    new THREE.MeshPhongMaterial({
      color: 0x3e8cff,
      emissive: 0x143ea0,
      transparent: true,
      opacity: 0.9,
      shininess: 140,
    }),
  );
  nexus.position.y = 1.8;
  scene.add(nexus);

  const nexusWire = new THREE.Mesh(
    nexusGeometry.clone(),
    new THREE.MeshBasicMaterial({
      color: 0x8dbdff,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    }),
  );
  nexusWire.position.y = 1.8;
  scene.add(nexusWire);

  const nexusHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.04, 12, 72),
    new THREE.MeshBasicMaterial({
      color: 0x7fb2ff,
      transparent: true,
      opacity: 0.28,
    }),
  );
  nexusHalo.position.y = 1.8;
  scene.add(nexusHalo);

  const nodes: SceneAgentNode[] = initialAgents.map((agent, index) => {
    const color = new THREE.Color(agent.color);
    const geometry = GEOMETRIES[index % GEOMETRIES.length];
    const anchor = new THREE.Vector3(agent.positionHint.x, agent.positionHint.y, agent.positionHint.z);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshPhongMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.28),
        transparent: true,
        opacity: 0.94,
        shininess: 140,
      }),
    );
    mesh.position.copy(anchor);
    scene.add(mesh);

    const wire = new THREE.Mesh(
      geometry.clone(),
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      }),
    );
    wire.position.copy(anchor);
    scene.add(wire);

    const light = new THREE.PointLight(color, 2.2, 9);
    light.position.set(anchor.x, anchor.y + 1.1, anchor.z);
    scene.add(light);

    const orbitInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.024, 6, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34 }),
    );
    orbitInner.position.copy(anchor);
    orbitInner.rotation.x = Math.PI / 3;
    scene.add(orbitInner);

    const orbitOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.018, 6, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 }),
    );
    orbitOuter.position.copy(anchor);
    orbitOuter.rotation.z = Math.PI / 4;
    scene.add(orbitOuter);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 2.4),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    panel.position.set(anchor.x, anchor.y + 0.35, anchor.z);
    panel.lookAt(0, anchor.y + 0.35, 0);
    scene.add(panel);

    return {
      id: agent.id,
      anchor,
      mesh,
      wire,
      light,
      orbitInner,
      orbitOuter,
      panel,
    };
  });

  const particleCount = 1600;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.5) * 32;
    particlePositions[index * 3 + 1] = Math.random() * 8;
    particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 32;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0x214d8a,
      size: 0.055,
      transparent: true,
      opacity: 0.72,
    }),
  );
  scene.add(particles);

  const beamPositions = new Float32Array(6);
  const beamGeometry = new THREE.BufferGeometry();
  beamGeometry.setAttribute("position", new THREE.BufferAttribute(beamPositions, 3));
  const beamMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  });
  const beam = new THREE.Line(beamGeometry, beamMaterial);
  scene.add(beam);

  const clock = new THREE.Clock();
  let frameId = 0;

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  const animate = () => {
    frameId = window.requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const liveAgents = liveAgentsRef.current;

    camera.position.x = Math.sin(elapsed * 0.18) * 16.8;
    camera.position.z = Math.cos(elapsed * 0.18) * 16.8;
    camera.position.y = 9.2 + Math.sin(elapsed * 0.26) * 0.55;
    camera.lookAt(0, 1.9, 0);

    nexus.rotation.y += 0.008;
    nexus.rotation.x += 0.002;
    nexusWire.rotation.y -= 0.005;
    nexusWire.rotation.z += 0.004;
    nexusHalo.rotation.z += 0.012;
    const nexusScale = 1 + Math.sin(elapsed * 2.2) * 0.06;
    nexus.scale.setScalar(nexusScale);
    nexusWire.scale.setScalar(nexusScale * 1.05);
    nexusLight.intensity = 5.4 + Math.sin(elapsed * 2.8) * 0.8;

    (outerRing.material as THREE.MeshBasicMaterial).opacity = 0.26 + Math.sin(elapsed * 1.4) * 0.08;
    midRing.rotation.z += 0.004;
    innerRing.rotation.z -= 0.007;
    wallGroup.rotation.y += 0.0009;

    nodes.forEach((node, index) => {
      const liveAgent = liveAgents.find((item) => item.id === node.id);
      if (!liveAgent) {
        return;
      }

      const bob = Math.sin(elapsed * 1.4 + index * 1.6) * 0.22;
      const verticalBoost = clamp(liveAgent.pnl / 12, -0.38, 0.52);
      const positionY = node.anchor.y + bob + verticalBoost;
      const scaleBoost = 0.96 + liveAgent.heat / 180 + liveAgent.hp / 420;

      node.mesh.position.set(node.anchor.x, positionY, node.anchor.z);
      node.wire.position.copy(node.mesh.position);
      node.orbitInner.position.copy(node.mesh.position);
      node.orbitOuter.position.copy(node.mesh.position);
      node.panel.position.set(node.anchor.x, positionY + 0.2, node.anchor.z);
      node.light.position.set(node.anchor.x, positionY + 1.1, node.anchor.z);

      node.mesh.rotation.x += 0.008 + index * 0.0016;
      node.mesh.rotation.y += 0.01 - index * 0.001;
      node.wire.rotation.copy(node.mesh.rotation);
      node.orbitInner.rotation.y += 0.018 + index * 0.004;
      node.orbitOuter.rotation.x += 0.012 - index * 0.002;
      node.mesh.scale.setScalar(scaleBoost);
      node.wire.scale.setScalar(scaleBoost * 1.03);
      node.light.intensity = 1.5 + liveAgent.heat / 85 + Math.sin(elapsed * 2 + index) * 0.45;

      const panelMaterial = node.panel.material as THREE.MeshBasicMaterial;
      panelMaterial.opacity = 0.05 + liveAgent.heat / 1200;
      node.panel.lookAt(camera.position);
    });

    const battlePulse = battlePulseRef.current;
    if (battlePulse) {
      const source = nodes.find((node) => node.id === battlePulse.attackerId);
      const target = nodes.find((node) => node.id === battlePulse.defenderId);
      const age = performance.now() - battlePulse.startedAt;
      const progress = clamp(age / 1050, 0, 1);

      if (source && target && progress < 1) {
        beamPositions[0] = source.mesh.position.x;
        beamPositions[1] = source.mesh.position.y;
        beamPositions[2] = source.mesh.position.z;
        beamPositions[3] = target.mesh.position.x;
        beamPositions[4] = target.mesh.position.y;
        beamPositions[5] = target.mesh.position.z;
        beamGeometry.attributes.position.needsUpdate = true;
        beamMaterial.color.set(battlePulse.color);
        beamMaterial.opacity = Math.sin(progress * Math.PI) * 0.92;
      } else {
        beamMaterial.opacity = 0;
        battlePulseRef.current = null;
      }
    }

    for (let offset = 1; offset < particlePositions.length; offset += 3) {
      particlePositions[offset] += 0.01;
      if (particlePositions[offset] > 8.1) {
        particlePositions[offset] = 0;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };

  resize();
  animate();

  return {
    renderer,
    scene,
    camera,
    resize,
    stop: () => {
      window.cancelAnimationFrame(frameId);
      renderer.dispose();
      particleGeometry.dispose();
      beamGeometry.dispose();
    },
  };
}

function buildNextAgentState(
  currentAgents: ReplayAgentState[],
  trade: ReplayTradeEvent,
  cursor: number,
) {
  const sourceIndex = currentAgents.findIndex((agent) => agent.id === trade.agentId);
  const defenderIndex =
    sourceIndex === -1 ? -1 : (sourceIndex + 1 + (cursor % Math.max(currentAgents.length - 1, 1))) % currentAgents.length;

  const nextAgents = currentAgents.map((agent, index) => {
    if (index === sourceIndex) {
      const nextHp = clamp(agent.hp + (trade.isPositive ? 1 : -3), 4, 100);
      const nextXp = clamp(agent.xp + 4 + Math.round(trade.heat / 12), 0, 100);
      const nextPnl = Number((agent.pnl + trade.impactPct * 0.45).toFixed(1));
      const nextStreak =
        trade.isPositive ? (agent.streak >= 0 ? agent.streak + 1 : 1) : agent.streak <= 0 ? agent.streak - 1 : -1;
      const nextHeat = clamp(agent.heat + (trade.isPositive ? 6 : 2), 12, 100);

      return {
        ...agent,
        hp: nextHp,
        xp: nextXp,
        level: Math.max(1, Math.floor(nextXp / 25) + 1),
        pnl: nextPnl,
        streak: nextStreak,
        actionLabel: buildActionLabel(agent, trade, cursor),
        shieldPercent: nextHp,
        xpPercent: nextXp,
        heat: nextHeat,
      };
    }

    if (index === defenderIndex) {
      const nextHp = clamp(agent.hp - Math.round(4 + trade.heat / 18), 3, 100);
      const nextPnl = Number((agent.pnl - Math.abs(trade.impactPct) * 0.2).toFixed(1));
      const nextStreak = agent.streak <= 0 ? agent.streak - 1 : -1;

      return {
        ...agent,
        hp: nextHp,
        pnl: nextPnl,
        streak: nextStreak,
        shieldPercent: nextHp,
        heat: clamp(agent.heat - 3, 10, 100),
      };
    }

    return {
      ...agent,
      heat: clamp(agent.heat - 1, 10, 100),
    };
  });

  return {
    nextAgents,
    defenderId: defenderIndex >= 0 ? currentAgents[defenderIndex]?.id ?? null : null,
  };
}

export function ReplayArena({ replay }: ReplayArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveAgentsRef = useRef<ReplayAgentState[]>(replay.agents);
  const battlePulseRef = useRef<BattlePulse | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  const [agents, setAgents] = useState(replay.agents);
  const [recentTrades, setRecentTrades] = useState(replay.trades.slice(0, 4));
  const [timerSeconds, setTimerSeconds] = useState(replay.meta.timerSeconds);
  const [blockNumber, setBlockNumber] = useState(replay.meta.blockNumberSeed);
  const [damageFloats, setDamageFloats] = useState<ReplayHudDamageFloat[]>([]);
  const [critBanner, setCritBanner] = useState<ReplayHudCritBanner | null>(null);

  useEffect(() => {
    liveAgentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const runtime = createScene(canvas, container, replay.agents, liveAgentsRef, battlePulseRef);
    const resizeObserver = new ResizeObserver(() => runtime.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      runtime.stop();
    };
  }, [replay.agents]);

  useEffect(() => {
    if (replay.meta.timerSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setTimerSeconds((current) => {
          if (replay.meta.timerMode === "elapsed") {
            return current + 1;
          }

          return current > 0 ? current - 1 : replay.meta.timerSeconds;
        });
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [replay.meta.timerMode, replay.meta.timerSeconds]);

  useEffect(() => {
    if (replay.trades.length === 0) {
      return;
    }

    let cancelled = false;
    let cursor = 0;

    const clearScheduledTimeouts = () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };

    const pushDamageFloat = (floatItem: ReplayHudDamageFloat) => {
      startTransition(() => {
        setDamageFloats((current) => [...current, floatItem]);
      });

      const timeoutId = window.setTimeout(() => {
        setDamageFloats((current) => current.filter((item) => item.id !== floatItem.id));
      }, 1400);

      timeoutIdsRef.current.push(timeoutId);
    };

    const scheduleNext = () => {
      const trade = replay.trades[cursor % replay.trades.length];
      const delay = 1700 + (trade.heat % 4) * 280;

      const timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const sourceColor = getAgentColor(trade.agentId, liveAgentsRef.current);
        const currentAgents = liveAgentsRef.current;
        const { nextAgents, defenderId } = buildNextAgentState(currentAgents, trade, cursor);

        liveAgentsRef.current = nextAgents;
        battlePulseRef.current = defenderId
          ? {
              attackerId: trade.agentId,
              defenderId,
              color: sourceColor,
              startedAt: performance.now(),
            }
          : null;

        const crit = getCritBanner(trade, sourceColor);
        startTransition(() => {
          setAgents(nextAgents);
          setRecentTrades((current) => [trade, ...current].slice(0, 6));
          setBlockNumber(trade.blockNumber);
          setCritBanner(crit);
        });

        pushDamageFloat({
          id: `${trade.id}-source-${cursor}`,
          agentId: trade.agentId,
          label: `${trade.isPositive ? "+" : "-"}${Math.abs(trade.impactPct).toFixed(2)}%`,
          positive: trade.isPositive,
          tone: sourceColor,
        });

        if (defenderId) {
          pushDamageFloat({
            id: `${trade.id}-target-${cursor}`,
            agentId: defenderId,
            label: `-${Math.max(1.2, Math.abs(trade.impactPct) * 1.4).toFixed(2)} HP`,
            positive: false,
          });
        }

        const bannerTimeout = window.setTimeout(() => setCritBanner(null), 1500);
        timeoutIdsRef.current.push(bannerTimeout);

        cursor += 1;
        scheduleNext();
      }, delay);

      timeoutIdsRef.current.push(timeoutId);
    };

    clearScheduledTimeouts();
    scheduleNext();

    return () => {
      cancelled = true;
      clearScheduledTimeouts();
    };
  }, [replay]);

  const hudAgents = useMemo(
    () =>
      agents.map((agent, index) => ({
        id: agent.id,
        name: agent.name,
        archetype: agent.archetype,
        color: agent.color,
        level: `LVL ${agent.level}`,
        shield: agent.shieldPercent,
        xp: agent.xpPercent,
        pnl: agent.pnl,
        streak: agent.streak,
        action: agent.actionLabel,
        position: HUD_POSITIONS[index % HUD_POSITIONS.length],
      })),
    [agents],
  );

  const hudTrades = useMemo(() => buildTradeRail(recentTrades), [recentTrades]);

  return (
    <div
      ref={containerRef}
      className="glass-panel-strong arena-scanline relative h-[780px] overflow-hidden rounded-[2rem] border border-[var(--panel-border-strong)]"
    >
      <div className="arena-overlay-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(102,227,255,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(255,212,121,0.12),transparent_26%),linear-gradient(180deg,rgba(3,7,17,0.04),rgba(3,7,17,0.34))]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <ReplayHud
        title="Agent Arena"
        subtitle={`${replay.meta.title} / X Layer AI vs AI competition`}
        roundLabel="Round"
        roundValue={replay.meta.roundLabel}
        prizeLabel="Prize pool"
        prizeValue={replay.meta.prizeLabel}
        liveLabel={replay.meta.liveStateLabel}
        timerLabel={replay.meta.timerMode === "elapsed" ? "REPLAY ELAPSED" : "TRADING ACTIVE"}
        timerValue={formatTimer(timerSeconds)}
        blockLabel="Latest block"
        blockValue={`BLK #${blockNumber}`}
        agents={hudAgents}
        trades={hudTrades}
        damageFloats={damageFloats}
        critBanner={critBanner}
        footer={
          <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-white/10 bg-[rgba(6,10,20,0.78)] px-5 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">
                  Competition framing
                </div>
                <div className="mt-1 text-sm text-white">
                  Portfolio coordinates can map directly into live PnL on the Y-axis once the Express/WebSocket feed is connected.
                </div>
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                Chain 196 / x402 spectators / live-ready
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
