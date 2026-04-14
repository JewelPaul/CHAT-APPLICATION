import { Center, Text3D } from '@react-three/drei'

export function BrandingText() {
  return (
    <Center position={[0, 0.1, -3.8]}>
      <Text3D
        font="/fonts/helvetiker_regular.typeface.json"
        size={0.58}
        height={0.18}
        curveSegments={16}
        bevelEnabled
        bevelSize={0.015}
        bevelThickness={0.028}
        bevelSegments={6}
        letterSpacing={0.03}
      >
        JEWEL PAUL
        <meshPhysicalMaterial
          color="#0b0b10"
          roughness={0.06}
          metalness={0.18}
          transmission={0.84}
          thickness={1.8}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </Text3D>
    </Center>
  )
}
