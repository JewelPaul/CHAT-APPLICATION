import { RoundedBox, Sphere } from '@react-three/drei'

export function Telephone() {
  return (
    <group>
      <RoundedBox args={[1.55, 0.24, 0.9]} radius={0.08} smoothness={8}>
        <meshStandardMaterial color="#171b24" metalness={0.72} roughness={0.35} />
      </RoundedBox>

      <RoundedBox args={[1.35, 0.14, 0.18]} radius={0.05} position={[0, 0.23, -0.2]} rotation={[0, 0, -0.14]}>
        <meshStandardMaterial color="#222734" metalness={0.75} roughness={0.32} />
      </RoundedBox>

      <group position={[0, 0.16, 0.05]}>
        {[-0.45, -0.15, 0.15, 0.45].map(x => (
          <RoundedBox key={x} args={[0.2, 0.07, 0.2]} radius={0.03} position={[x, 0, 0]}>
            <meshStandardMaterial color="#2c3342" metalness={0.45} roughness={0.5} />
          </RoundedBox>
        ))}
      </group>

      <Sphere args={[0.03, 16, 16]} position={[-0.62, 0.15, 0.36]}>
        <meshStandardMaterial color="#ff3d47" emissive="#ff3d47" emissiveIntensity={2.8} toneMapped={false} />
      </Sphere>

      <Sphere args={[0.03, 16, 16]} position={[-0.52, 0.15, 0.36]}>
        <meshStandardMaterial color="#36ff87" emissive="#36ff87" emissiveIntensity={1.8} toneMapped={false} />
      </Sphere>
    </group>
  )
}
