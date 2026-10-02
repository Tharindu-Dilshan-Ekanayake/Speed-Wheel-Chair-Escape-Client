import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useRef } from 'react'

import Rider from '../game/Rider'
import { PetModel } from '../game/Pets'

/** Dev-only: /?pose shows riders from several angles to tune the seated pose. */
function Animated({ push, chairId, x, rot }) {
  const motion = useRef({ time: 0, push, phase: 0, grounded: true, wheel: 0 })
  useFrame((_s, dt) => {
    motion.current.time += dt
    motion.current.phase = Number(new URLSearchParams(location.search).get('phase') || 0)
    motion.current.push = push
  })
  return (
    <group position={[x, 0, 0]} rotation={[0, rot, 0]}>
      <Rider name="Pose" level={1} chairId={chairId} motionRef={motion} fxKey="pose" auraId="none" />
    </group>
  )
}

export default function PoseLab() {
  return (
    <Canvas flat camera={{ position: [0, 2, 7], fov: 50 }} style={{ background: '#8fd3ff', height: '100vh' }}>
      <hemisphereLight args={['#fff', '#888', 1.4]} />
      <directionalLight position={[3, 6, 4]} intensity={1.5} />
      <Suspense fallback={null}>
        <Animated push={0} chairId="classic" x={-3} rot={Math.PI / 2} />
        <Animated push={1} chairId="blaze" x={0} rot={Math.PI / 2} />
        <Animated push={0} chairId="galaxy" x={3} rot={0} />
        <group position={[5, 0, 0]}><PetModel type="unicorn" /></group>
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#a3a6e3" />
      </mesh>
      <OrbitControls target={[0, 1, 0]} />
    </Canvas>
  )
}
