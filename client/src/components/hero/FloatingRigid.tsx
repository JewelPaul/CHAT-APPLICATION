import { useFrame } from '@react-three/fiber'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
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

const objectPosition = new THREE.Vector3()
const projectedPointer = new THREE.Vector3()
const pointerDirection = new THREE.Vector3()
const pointerOnPlane = new THREE.Vector3()
const repelVector = new THREE.Vector3()

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

  useFrame(({ pointer, camera }, delta) => {
    if (!body.current) return

    const translation = body.current.translation()
    objectPosition.set(translation.x, translation.y, translation.z)

    projectedPointer.set(pointer.x, pointer.y, 0.2).unproject(camera)
    pointerDirection.copy(projectedPointer).sub(camera.position).normalize()

    if (Math.abs(pointerDirection.z) < 0.0001) return

    const distanceToObjectPlane = (objectPosition.z - camera.position.z) / pointerDirection.z
    if (distanceToObjectPlane <= 0) return

    pointerOnPlane.copy(camera.position).addScaledVector(pointerDirection, distanceToObjectPlane)
    repelVector.copy(objectPosition).sub(pointerOnPlane)

    const distance = repelVector.length()
    if (distance > repelRadius || distance < 0.0001) return

    const impulse = (1 - distance / repelRadius) * repelStrength * delta * 60
    body.current.applyImpulse(repelVector.normalize().multiplyScalar(impulse), true)
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
