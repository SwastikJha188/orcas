import * as THREE from "three";

/**
 * An endless floor grid: one plane that follows the camera across the floor,
 * with the lines drawn in world space by the shader (so they never slide) and
 * faded out with distance and density, so the grid has no edge to reach.
 */
export interface InfiniteGrid {
  mesh: THREE.Mesh;
  /** Re-centre under the camera; call before each render. */
  follow: (camera: THREE.Camera) => void;
  setColor: (color: THREE.ColorRepresentation, opacity: number) => void;
}

export function createInfiniteGrid({ cell, fade, y = 0.01 }: { cell: number; fade: [number, number]; y?: number }): InfiniteGrid {
  const geometry = new THREE.PlaneGeometry(fade[1] * 2.2, fade[1] * 2.2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 1 },
      uCell: { value: cell },
      uFade: { value: new THREE.Vector2(...fade) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uCell;
      uniform vec2 uFade;
      varying vec3 vWorld;
      void main() {
        vec2 c = vWorld.xz / uCell;
        vec2 d = fwidth(c);
        vec2 g = abs(fract(c - 0.5) - 0.5) / max(d, vec2(1e-4));
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        // Thin out where cells shrink to a few pixels, instead of moiré at the horizon.
        float density = 1.0 - smoothstep(0.2, 0.55, max(d.x, d.y));
        float fade = 1.0 - smoothstep(uFade.x, uFade.y, distance(cameraPosition.xz, vWorld.xz));
        float a = line * uOpacity * density * fade;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.raycast = () => undefined;
  return {
    mesh,
    follow: (camera) => {
      mesh.position.x = camera.position.x;
      mesh.position.z = camera.position.z;
    },
    setColor: (color, opacity) => {
      (material.uniforms.uColor.value as THREE.Color).set(color);
      material.uniforms.uOpacity.value = opacity;
    },
  };
}
