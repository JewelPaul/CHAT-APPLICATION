import { Canvas } from '@react-three/fiber'
import { Environment, Float } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { Physics } from '@react-three/rapier'
import { FloatingRigid } from './FloatingRigid'
import { Monitor } from './Monitor'
import { MacMini } from './MacMini'
import { DeskLamp } from './DeskLamp'
import { Telephone } from './Telephone'
import { Keyboard, Mouse, Notebook } from './CreatorTools'
import { BrandingText } from './BrandingText'

// Slight right offset and deep Z distance keep the left monitor composition readable while preserving depth.
const CAMERA_POSITION: [number, number, number] = [0.25, 0.15, 8.8]
// Narrow cinematic FOV avoids distortion and keeps the scene feeling premium and product-focused.
const CAMERA_FOV = 34
// Keep reflections subtle so the void stays dark while metallic surfaces still feel physically grounded.
const ENVIRONMENT_INTENSITY = 0.16

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#000000']} />

      <Environment preset="night" environmentIntensity={ENVIRONMENT_INTENSITY} />

      <Physics gravity={[0, 0, 0]}>
        <Float speed={0.25} rotationIntensity={0.12} floatIntensity={0.18}>
          <FloatingRigid
            position={[-2.7, 1.05, -0.4]}
            rotation={[-0.12, 0.3, 0.04]}
            linearVelocity={[0.01, -0.008, 0.006]}
            angularVelocity={[0.05, 0.09, -0.04]}
          >
            <Monitor />
          </FloatingRigid>

          <FloatingRigid
            position={[-2.45, -0.72, -0.28]}
            rotation={[0.1, -0.36, 0.02]}
            linearVelocity={[-0.005, 0.009, -0.006]}
            angularVelocity={[0.08, -0.06, 0.05]}
            colliders="cuboid"
          >
            <MacMini />
          </FloatingRigid>

          <FloatingRigid
            position={[2.42, 1.12, 0.12]}
            rotation={[0.1, -0.42, -0.08]}
            linearVelocity={[-0.01, -0.007, 0.004]}
            angularVelocity={[0.06, 0.04, 0.09]}
            repelRadius={1.45}
          >
            <DeskLamp />
          </FloatingRigid>

          <FloatingRigid
            position={[2.1, -1.1, -0.08]}
            rotation={[-0.02, -0.25, 0.06]}
            linearVelocity={[0.006, 0.008, -0.005]}
            angularVelocity={[-0.06, 0.07, -0.05]}
          >
            <Telephone />
          </FloatingRigid>

          <FloatingRigid
            position={[0.12, -1.82, 0.08]}
            rotation={[0.03, -0.18, 0.01]}
            linearVelocity={[0.006, -0.004, 0.004]}
            angularVelocity={[0.05, 0.04, -0.06]}
            colliders="cuboid"
            repelRadius={1.6}
          >
            <Keyboard />
          </FloatingRigid>

          <FloatingRigid
            position={[2.76, -1.74, 0.2]}
            rotation={[0, -0.2, -0.04]}
            linearVelocity={[-0.004, 0.003, 0.003]}
            angularVelocity={[0.03, -0.05, 0.04]}
          >
            <Mouse />
          </FloatingRigid>

          <FloatingRigid
            position={[-0.85, -1.66, -0.25]}
            rotation={[0.05, 0.16, -0.06]}
            linearVelocity={[0.003, 0.004, -0.006]}
            angularVelocity={[0.04, 0.05, -0.02]}
            colliders="cuboid"
          >
            <Notebook />
          </FloatingRigid>
        </Float>
      </Physics>

      <BrandingText />

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.12} intensity={1.65} mipmapBlur />
        <DepthOfField focusDistance={0.028} focalLength={0.035} bokehScale={2.35} height={700} />
      </EffectComposer>
    </Canvas>
  )
}
