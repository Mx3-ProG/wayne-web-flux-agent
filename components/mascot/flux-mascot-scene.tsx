"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  Center,
  Clone,
  Environment,
  PresentationControls,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import type { FluxMascotBehavior } from "./flux-mascot";

type Props = {
  modelUrl: string;
  behavior: FluxMascotBehavior;
  allowRotation: boolean;
  scale: number;
  transparent: boolean;
};

function Model({ modelUrl, behavior, scale }: Pick<Props, "modelUrl" | "behavior" | "scale">) {
  const { scene } = useGLTF(modelUrl);
  const group = useRef<Group>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    if (!group.current || reduceMotion || behavior === "still") return;
    const time = clock.getElapsedTime();
    group.current.position.y = Math.sin(time * 1.45) * 0.035;

    if (behavior === "spin") {
      group.current.rotation.y += delta * 0.8;
    } else if (behavior === "follow-pointer") {
      group.current.rotation.y += (pointer.x * 0.42 - group.current.rotation.y) * 0.06;
      group.current.rotation.x += (-pointer.y * 0.12 - group.current.rotation.x) * 0.06;
    } else {
      group.current.rotation.y = Math.sin(time * 0.55) * 0.08;
      group.current.rotation.x = 0;
    }
  });

  return (
    <group ref={group} scale={scale}>
      <Center bottom>
        <Clone object={scene} castShadow receiveShadow />
      </Center>
    </group>
  );
}

export function FluxMascotScene({
  modelUrl,
  behavior,
  allowRotation,
  scale,
  transparent,
}: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 3.4], fov: 32 }}
      gl={{ alpha: transparent, antialias: true, powerPreference: "high-performance" }}
      shadows
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.65} />
        <Bounds fit clip observe margin={1.12}>
          <PresentationControls
            enabled={allowRotation}
            global={false}
            cursor={allowRotation}
            snap
            speed={1.2}
            polar={[-0.25, 0.25]}
            azimuth={[-0.8, 0.8]}
          >
            <Model modelUrl={modelUrl} behavior={behavior} scale={scale} />
          </PresentationControls>
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
