import { RoundedBox, RenderTexture, Text } from '@react-three/drei'

const logLines = [
  '$ node hermes-agent.mjs',
  '[hermes] bridge online @ :7777',
  '[gods-eye] telegram sync: healthy',
  '[watcher] websocket listeners: 12',
  '[queue] encrypted payload relays: 64',
  '[vacuum] anti-gravity field stabilized',
]

export function Monitor() {
  return (
    <group>
      <RoundedBox args={[2.6, 1.5, 0.12]} radius={0.08} smoothness={8}>
        <meshStandardMaterial color="#0f1117" metalness={0.85} roughness={0.3} />
      </RoundedBox>

      <mesh position={[0, 0.02, 0.064]}>
        <planeGeometry args={[2.34, 1.28]} />
        <meshStandardMaterial emissive="#58b8ff" emissiveIntensity={2.3} toneMapped={false}>
          <RenderTexture attach="map" anisotropy={16}>
            <color attach="background" args={['#02060c']} />
            <Text
              position={[-1.08, 0.5, 0]}
              fontSize={0.11}
              maxWidth={2.16}
              lineHeight={1.3}
              anchorX="left"
              anchorY="top"
              color="#7de1ff"
            >
              {logLines.join('\n')}
            </Text>
          </RenderTexture>
        </meshStandardMaterial>
      </mesh>

      <RoundedBox args={[0.24, 0.72, 0.14]} radius={0.05} position={[0, -1.02, 0]}>
        <meshStandardMaterial color="#171a22" metalness={0.8} roughness={0.4} />
      </RoundedBox>

      <RoundedBox args={[1.02, 0.09, 0.55]} radius={0.04} position={[0, -1.42, 0]}>
        <meshStandardMaterial color="#12141b" metalness={0.9} roughness={0.35} />
      </RoundedBox>
    </group>
  )
}
