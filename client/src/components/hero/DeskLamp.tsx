import { Cone, Cylinder } from '@react-three/drei'

export function DeskLamp() {
  return (
    <group>
      <Cylinder args={[0.38, 0.44, 0.08, 24]} position={[0, -0.78, 0]}>
        <meshStandardMaterial color="#1f2128" metalness={0.85} roughness={0.38} />
      </Cylinder>

      <Cylinder args={[0.06, 0.08, 1.15, 16]} position={[0.15, -0.2, 0.1]} rotation={[0.24, 0, 0.18]}>
        <meshStandardMaterial color="#292c35" metalness={0.9} roughness={0.3} />
      </Cylinder>

      <Cylinder args={[0.05, 0.06, 0.95, 16]} position={[0.5, 0.3, 0.12]} rotation={[-0.78, 0.08, -0.58]}>
        <meshStandardMaterial color="#2b2f39" metalness={0.9} roughness={0.28} />
      </Cylinder>

      <Cone args={[0.3, 0.42, 24, 1, true]} position={[0.9, 0.68, 0.14]} rotation={[1.3, 0.1, -0.56]}>
        <meshStandardMaterial color="#111216" metalness={0.88} roughness={0.32} side={2} />
      </Cone>

      <spotLight
        position={[0.92, 0.63, 0.13]}
        target-position={[0.1, -1.2, 0.35]}
        intensity={60}
        angle={0.22}
        distance={11}
        penumbra={0.8}
        color="#f6e9d6"
        castShadow
      />

      <Cone args={[0.22, 2.4, 24, 1, true]} position={[0.42, -0.55, 0.22]} rotation={[1.3, 0.1, -0.56]}>
        <meshStandardMaterial
          color="#f8deb4"
          transparent
          opacity={0.08}
          emissive="#f8deb4"
          emissiveIntensity={0.6}
          depthWrite={false}
          side={2}
        />
      </Cone>
    </group>
  )
}
