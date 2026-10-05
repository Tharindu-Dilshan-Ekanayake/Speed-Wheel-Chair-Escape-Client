import { useMemo } from 'react'
import { DoubleSide } from 'three'

import { emojiTexture, textTexture } from '../textures'

/**
 * A flat text sign (canvas texture on a plane). Height in metres; width follows the
 * text's aspect ratio. Cut out the empty pixels but write depth for the lettering,
 * so nearby signs occlude distant ones instead of blending into a stacked overlay.
 */
export function Label({ text, height = 1, opts, billboard = false, ...props }) {
  const { texture, aspect } = useMemo(() => textTexture(text, opts), [text, opts])
  const plane = (
    <mesh {...(billboard ? {} : props)}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} alphaTest={0.5} alphaToCoverage toneMapped={false} side={DoubleSide} />
    </mesh>
  )
  if (!billboard) return plane
  return (
    <sprite {...props} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent={false} alphaTest={0.5} alphaToCoverage toneMapped={false} />
    </sprite>
  )
}

export function Emoji({ emoji, size = 2, billboard = false, ...props }) {
  const { texture, aspect } = useMemo(() => emojiTexture(emoji), [emoji])
  if (billboard) {
    return (
      <sprite {...props} scale={[size * aspect, size, 1]}>
        <spriteMaterial map={texture} transparent={false} alphaTest={0.5} alphaToCoverage toneMapped={false} />
      </sprite>
    )
  }
  return (
    <mesh {...props}>
      <planeGeometry args={[size * aspect, size]} />
      <meshBasicMaterial map={texture} alphaTest={0.5} alphaToCoverage toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

export default Label
