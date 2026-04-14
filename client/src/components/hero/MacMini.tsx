import { RoundedBox } from '@react-three/drei'

export function MacMini() {
  return (
    <group>
      <RoundedBox args={[1.35, 0.24, 1.35]} radius={0.08} smoothness={8}>
        <meshStandardMaterial color="#b9bec7" metalness={1} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.02, 0.675]}>
        <planeGeometry args={[0.25, 0.035]} />
        <meshStandardMaterial color="#14161a" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  )
}
