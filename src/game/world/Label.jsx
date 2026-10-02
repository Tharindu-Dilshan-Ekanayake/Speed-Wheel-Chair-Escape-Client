import { useMemo } from 'react'
import { DoubleSide } from 'three'

import { emojiTexture, textTexture } from '../textures'

/**
 * A flat text sign (canvas texture on a plane). Height in metres; width follows the
 * text's aspect ratio.
 */
export function Label({ text, height = 1, opts, billboard = false, ...props }) {
  const { texture, aspect } = useMemo(() => textTexture(text, opts), [text, opts])
  const plane = (
    <mesh {...(billboard ? {} : props)} renderOrder={2}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
  if (!billboard) return plane
  return (
    <sprite {...props} scale={[height * aspect, height, 1]} renderOrder={3}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

export function Emoji({ emoji, size = 2, billboard = false, ...props }) {
  const { texture, aspect } = useMemo(() => emojiTexture(emoji), [emoji])
  if (billboard) {
    return (
      <sprite {...props} scale={[size * aspect, size, 1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    )
  }
  return (
    <mesh {...props}>
      <planeGeometry args={[size * aspect, size]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

export default Label
