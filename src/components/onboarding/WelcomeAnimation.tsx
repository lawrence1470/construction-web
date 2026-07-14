'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import type { Group, Mesh } from 'three';

const rects = [
  { x: 3, y: 3, w: 3, h: 18 },
  { x: 3, y: 3, w: 18, h: 3 },
  { x: 18, y: 3, w: 3, h: 10 },
  { x: 10, y: 9, w: 2.5, h: 12 },
] as const;

const BEAM_DELAY = 0.25;
const BEAM_DURATION = 0.55;
const BUILD_END = BEAM_DELAY * (rects.length - 1) + BEAM_DURATION;
const SPIN_START = BUILD_END + 0.2;
const TOTAL_DURATION_MS = 3800;

const DEPTH = 2.5;
const SCALE = 0.18;

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Beam({
  rect,
  index,
}: {
  rect: (typeof rects)[number];
  index: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const cx = rect.x + rect.w / 2 - 12;
  const cy = 12 - (rect.y + rect.h / 2);
  const delay = index * BEAM_DELAY;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const local = (t - delay) / BEAM_DURATION;
    const clamped = Math.max(0, Math.min(1, local));
    const scale = clamped === 0 ? 0.001 : easeOutBack(clamped);
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[rect.w, rect.h, DEPTH]}
      position={[cx, cy, 0]}
      radius={0.35}
      smoothness={4}
    >
      <meshStandardMaterial color="#1a1d2b" metalness={0.2} roughness={0.4} />
    </RoundedBox>
  );
}

function LogoMesh() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    if (t < SPIN_START) return;
    const spinProgress = Math.min(1, (t - SPIN_START) / 1.5);
    groupRef.current.rotation.y = easeInOutCubic(spinProgress) * Math.PI * 2;
  });

  return (
    <group ref={groupRef} scale={SCALE}>
      {rects.map((r, i) => (
        <Beam key={i} rect={r} index={i} />
      ))}
    </group>
  );
}

function CameraDolly() {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const start = 8;
    const end = 6.5;
    const progress = Math.max(0, Math.min(1, (t - SPIN_START) / 2));
    state.camera.position.z = start - (start - end) * easeInOutCubic(progress);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export function WelcomeAnimation({ show }: { show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] = useState(show);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!show) return;
    const textTimer = setTimeout(() => setShowText(true), 1500);
    const fadeTimer = setTimeout(() => setVisible(false), TOTAL_DURATION_MS - 500);
    const navTimer = setTimeout(() => {
      router.replace(pathname, { scroll: false });
    }, TOTAL_DURATION_MS);
    return () => {
      clearTimeout(textTimer);
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [show, pathname, router]);

  if (!show) return null;

  return (
    <Box
      sx={(theme) => ({
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease',
      })}
    >
      <Box sx={{ width: 'min(560px, 80vw)', height: 'min(420px, 60vh)' }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 38 }} dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, -3, 3]} intensity={0.8} />
          <directionalLight position={[0, 0, 6]} intensity={0.5} />
          <CameraDolly />
          <LogoMesh />
        </Canvas>
      </Box>

      <Box
        sx={{
          textAlign: 'center',
          mt: 2,
          opacity: showText ? 1 : 0,
          transform: showText ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.02em',
            mb: 0.5,
          }}
        >
          Welcome to TEMERITY
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Your workspace is ready.
        </Typography>
      </Box>
    </Box>
  );
}
