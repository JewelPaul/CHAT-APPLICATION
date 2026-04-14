import { RoundedBox, Text } from '@react-three/drei'

export function Keyboard() {
  return (
    <group>
      <RoundedBox args={[2.05, 0.1, 0.7]} radius={0.05}>
        <meshStandardMaterial color="#101318" metalness={0.8} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[1.85, 0.02, 0.5]} radius={0.03} position={[0, 0.055, 0]}>
        <meshStandardMaterial color="#1f2633" metalness={0.45} roughness={0.55} />
      </RoundedBox>
    </group>
  )
}

export function Mouse() {
  return (
    <group>
      <RoundedBox args={[0.45, 0.12, 0.7]} radius={0.18} smoothness={8}>
        <meshStandardMaterial color="#151a23" metalness={0.75} roughness={0.35} />
      </RoundedBox>
    </group>
  )
}

export function Notebook() {
  return (
    <group>
      <RoundedBox args={[1.35, 0.14, 1.9]} radius={0.05} smoothness={8}>
        <meshStandardMaterial color="#15100f" metalness={0.2} roughness={0.85} />
      </RoundedBox>
      <Text
        position={[0, 0.075, 0.68]}
        fontSize={0.15}
        color="#2a2523"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        ZION
      </Text>
    </group>
  )
}
