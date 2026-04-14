import { useFrame } from '@react-three/fiber'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'

interface FloatingRigidProps {
  children: ReactNode
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  linearVelocity: [number, number, number]
  angularVelocity: [number, number, number]
  repelRadius?: number
  repelStrength?: number
  colliders?: 'ball' | 'cuboid' | 'hull' | false
}

export function FloatingRigid({
  children,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  linearVelocity,
  angularVelocity,
  repelRadius = 1.25,
  repelStrength = 0.11,
  colliders = 'hull',
}: FloatingRigidProps) {
  const body = useRef<RapierRigidBody | null>(null)

  const vectors = useMemo(() => ({
    objectPosition: new THREE.Vector3(),
    projectedPointer: new THREE.Vector3(),
    pointerDirection: new THREE.Vector3(),
    pointerOnPlane: new THREE.Vector3(),
    repelVector: new THREE.Vector3(),
  }), [])

  useFrame(({ pointer, camera }, delta) => {
    if (!body.current) return

    const translation = body.current.translation()
    vectors.objectPosition.set(translation.x, translation.y, translation.z)

    vectors.projectedPointer.set(pointer.x, pointer.y, 0.2).unproject(camera)
    vectors.pointerDirection.copy(vectors.projectedPointer).sub(camera.position).normalize()

    // Small epsilon prevents unstable pointer-plane intersections when the ray is nearly parallel to the plane.
    if (Math.abs(vectors.pointerDirection.z) < 0.0001) return

    const distanceToObjectPlane = (vectors.objectPosition.z - camera.position.z) / vectors.pointerDirection.z
    if (distanceToObjectPlane <= 0) return

    vectors.pointerOnPlane.copy(camera.position).addScaledVector(vectors.pointerDirection, distanceToObjectPlane)
    vectors.repelVector.copy(vectors.objectPosition).sub(vectors.pointerOnPlane)

    const distance = vectors.repelVector.length()
    if (distance > repelRadius || distance < 0.0001) return

    const impulse = (1 - distance / repelRadius) * repelStrength * delta * 60
    body.current.applyImpulse(vectors.repelVector.normalize().multiplyScalar(impulse), true)
  })

  return (
    <RigidBody
      ref={body}
      position={position}
      rotation={rotation}
      colliders={colliders}
      gravityScale={0}
      linearDamping={0.18}
      angularDamping={0.1}
      restitution={0.5}
      friction={0.2}
      canSleep={false}
      linearVelocity={linearVelocity}
      angularVelocity={angularVelocity}
    >
      <group scale={scale}>{children}</group>
    </RigidBody>
  )
}
