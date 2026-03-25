'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState } from '@/lib/game-engine';

// ── Court geometry constants (badminton scaled down) ──────────────────────────
const COURT_W = 6.1;
const COURT_L = 13.4;
const NET_H   = 0.15;

function mapX(x: number) { return (x / 100 - 0.5) * COURT_W; }
function mapZ(y: number) { return (y / 100 - 0.5) * COURT_L; }

// ── Court surface + lines ──────────────────────────────────────────────────────
function Court() {
  const lineSegments: [[number,number,number],[number,number,number]][] = [
    [[-COURT_W/2, 0.01, -COURT_L/2], [ COURT_W/2, 0.01, -COURT_L/2]],
    [[-COURT_W/2, 0.01,  COURT_L/2], [ COURT_W/2, 0.01,  COURT_L/2]],
    [[-COURT_W/2, 0.01, -COURT_L/2], [-COURT_W/2, 0.01,  COURT_L/2]],
    [[ COURT_W/2, 0.01, -COURT_L/2], [ COURT_W/2, 0.01,  COURT_L/2]],
    [[0, 0.01, -COURT_L/4], [0, 0.01, COURT_L/4]],
    [[-COURT_W/2, 0.01, -COURT_L/4], [COURT_W/2, 0.01, -COURT_L/4]],
    [[-COURT_W/2, 0.01,  COURT_L/4], [COURT_W/2, 0.01,  COURT_L/4]],
  ];

  return (
    <group>
      {/* Court surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_W, COURT_L]} />
        <meshStandardMaterial color="#0a1f3a" roughness={0.9} />
      </mesh>

      {/* Court lines */}
      {lineSegments.map(([start, end], i) => {
        const mid: [number,number,number] = [
          (start[0]+end[0])/2,
          (start[1]+end[1])/2+0.005,
          (start[2]+end[2])/2,
        ];
        const dx = end[0]-start[0], dz = end[2]-start[2];
        const len = Math.sqrt(dx*dx+dz*dz);
        const angle = Math.atan2(dx, dz);
        return (
          <mesh key={i} position={mid} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.04, 0.01, len]} />
            <meshStandardMaterial color="#1e5ba8" emissive="#1e5ba8" emissiveIntensity={0.4} />
          </mesh>
        );
      })}

      {/* Net posts */}
      {([-COURT_W/2, COURT_W/2] as number[]).map((x, i) => (
        <mesh key={i} position={[x, NET_H/2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, NET_H, 8]} />
          <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* Net */}
      <mesh position={[0, NET_H/2, 0]}>
        <boxGeometry args={[COURT_W, NET_H, 0.02]} />
        <meshStandardMaterial
          color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.5}
          transparent opacity={0.55} wireframe
        />
      </mesh>

      {/* Net floor glow */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[COURT_W, 0.4]} />
        <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={1} transparent opacity={0.1} />
      </mesh>

      {/* Dark floor outside court */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[COURT_W * 2.5, COURT_L * 1.6]} />
        <meshStandardMaterial color="#040b18" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Agent ──────────────────────────────────────────────────────────────────────
interface AgentMeshProps {
  agentId: string;
  position: { x: number; y: number };
  color: string;
  name: string;
  momentum: number;
  isServing: boolean;
}

function AgentMesh({ position, color, name, momentum, isServing }: AgentMeshProps) {
  const meshRef    = useRef<THREE.Mesh>(null);
  const glowRef    = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);
  const targetPos  = useRef(new THREE.Vector3(mapX(position.x), 0.2, mapZ(position.y)));

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    targetPos.current.set(mapX(position.x), 0.2, mapZ(position.y));
    meshRef.current.position.lerp(targetPos.current, Math.min(1, delta * 6));
    // Bob
    meshRef.current.position.y = 0.2 + Math.sin(Date.now() * 0.004) * 0.04;

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
      const pulse = 1 + (momentum / 100) * 0.4 + Math.sin(Date.now() * 0.003) * 0.08;
      glowRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      ringRef.current.position.x = meshRef.current.position.x;
      ringRef.current.position.z = meshRef.current.position.z;
      ringRef.current.rotation.z += delta * 1.5;
    }
  });

  const isHot = momentum > 65;

  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef} position={[mapX(position.x), 0.2, mapZ(position.y)]}>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={isHot ? 0.9 : 0.3}
          transparent opacity={isHot ? 0.18 : 0.1}
        />
      </mesh>

      {/* Agent capsule body */}
      <mesh ref={meshRef} position={[mapX(position.x), 0.2, mapZ(position.y)]} castShadow>
        <capsuleGeometry args={[0.14, 0.22, 8, 16]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={isHot ? 0.7 : 0.25}
          roughness={0.2} metalness={0.5}
        />
      </mesh>

      {/* Shadow dot */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[mapX(position.x), 0.002, mapZ(position.y)]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color="#000" transparent opacity={0.35} />
      </mesh>

      {/* Serving ring */}
      {isServing && (
        <mesh ref={ringRef} rotation={[-Math.PI/2, 0, 0]} position={[mapX(position.x), 0.008, mapZ(position.y)]}>
          <ringGeometry args={[0.3, 0.42, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.5} transparent opacity={0.85} />
        </mesh>
      )}

      {/* Name label */}
      <Billboard position={[mapX(position.x), 0.72, mapZ(position.y)]}>
        <Text
          fontSize={0.2} color={color} anchorX="center" anchorY="bottom"
          outlineWidth={0.025} outlineColor="#000000"
        >
          {name.slice(0, 10)}
        </Text>
      </Billboard>
    </group>
  );
}

// ── Shuttle ────────────────────────────────────────────────────────────────────
const ACTION_HEIGHTS: Record<string, number> = {
  SMASH: 0.08, LOB: 1.4, CLEAR: 1.1, DROP: 0.18,
  DRIVE: 0.35, BLOCK: 0.18, SERVE: 0.55, SPECIAL: 0.9,
};

function Shuttle({ position, lastAction }: { position: { x: number; y: number }; lastAction: string }) {
  const ref       = useRef<THREE.Mesh>(null);
  const trailRef  = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3());
  const height    = ACTION_HEIGHTS[lastAction] ?? 0.5;

  useFrame((_, delta) => {
    if (!ref.current) return;
    targetPos.current.set(mapX(position.x), height, mapZ(position.y));
    ref.current.position.lerp(targetPos.current, Math.min(1, delta * 10));
    ref.current.rotation.y += delta * 4;
    if (trailRef.current) {
      trailRef.current.position.copy(ref.current.position);
    }
  });

  return (
    <group>
      {/* Trail glow */}
      <mesh ref={trailRef} position={[mapX(position.x), height, mapZ(position.y)]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.4} transparent opacity={0.15} />
      </mesh>
      {/* Shuttle */}
      <mesh ref={ref} position={[mapX(position.x), height, mapZ(position.y)]}>
        <sphereGeometry args={[0.065, 14, 14]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

// ── Action burst effect ────────────────────────────────────────────────────────
const ACTION_COLORS_3D: Record<string, string> = {
  SMASH: '#ef4444', DROP: '#8b5cf6', CLEAR: '#3b82f6',
  DRIVE: '#f59e0b', LOB: '#10b981', BLOCK: '#6b7280',
  SERVE: '#ffffff', SPECIAL: '#fbbf24',
};

function ActionBurst({ action, position }: { action: string; position: { x: number; y: number } }) {
  const ref   = useRef<THREE.Mesh>(null);
  const alive = useRef(true);

  useFrame(() => {
    if (!ref.current || !alive.current) return;
    ref.current.scale.multiplyScalar(1.06);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity *= 0.88;
    if (mat.opacity < 0.02) alive.current = false;
  });

  const color = ACTION_COLORS_3D[action] ?? '#ffffff';
  const height = ACTION_HEIGHTS[action] ?? 0.5;

  return (
    <mesh ref={ref} position={[mapX(position.x), height, mapZ(position.y)]}>
      <sphereGeometry args={[0.3, 10, 10]} />
      <meshStandardMaterial
        color={color} emissive={color} emissiveIntensity={3}
        transparent opacity={0.7}
      />
    </mesh>
  );
}

// ── Scene lighting ─────────────────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 9, 0]} intensity={2.5} color="#ffffff" castShadow shadow-mapSize={512} />
      <pointLight position={[-3, 5, -7]} intensity={1.0} color="#4a9eff" />
      <pointLight position={[ 3, 5,  7]} intensity={1.0} color="#4a9eff" />
      <hemisphereLight args={['#0d1f3c', '#040b18', 0.4]} />
    </>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
interface CourtCanvasProps {
  gameState:   GameState;
  agentNames:  Record<string, string>;
  agentColors: Record<string, string>;
  className?:  string;
}

export function CourtCanvas({ gameState, agentNames, agentColors, className }: CourtCanvasProps) {
  const [burstKey, setBurstKey]         = useState(0);
  const [lastAction, setLastAction]     = useState('');

  useEffect(() => {
    if (gameState.lastAction && gameState.lastAction !== lastAction) {
      setBurstKey(k => k + 1);
      setLastAction(gameState.lastAction);
    }
  }, [gameState.lastAction]);

  const agentIds = Object.keys(gameState.agentPositions);

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-white/10 bg-[#060d1a] ${className ?? ''}`}
      style={{ aspectRatio: '4/5', minHeight: 300 }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 8, 11], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Lights />
        <Court />

        {agentIds.map(id => (
          <AgentMesh
            key={id}
            agentId={id}
            position={gameState.agentPositions[id] ?? { x: 50, y: 50 }}
            color={agentColors[id] ?? '#4a9eff'}
            name={agentNames[id] ?? id}
            momentum={gameState.momentum[id] ?? 50}
            isServing={gameState.servingAgentId === id}
          />
        ))}

        <Shuttle
          position={gameState.shuttlePosition}
          lastAction={gameState.lastAction}
        />

        {gameState.lastAction && gameState.lastAction !== 'SERVE' && (
          <ActionBurst
            key={burstKey}
            action={gameState.lastAction}
            position={gameState.shuttlePosition}
          />
        )}

        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
