import * as THREE from 'three'
import { Three } from './core/Three'
import { DRACOLoader, GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'
import vertexShader from './shader/customStandard.vs'
import fragmentShader from './shader/customStandard.fs'

export class Canvas extends Three {
  private shaders: THREE.WebGLProgramParametersWithUniforms[] = []

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.init()
    this.createLights()

    this.loadAssets().then((assets) => {
      this.createObject(assets)
      this.renderer.setAnimationLoop(this.anime.bind(this))
    })
  }

  private init() {
    this.scene.background = new THREE.Color('#f0f0f0')
    this.camera.position.set(-3.16, 1.13, 10.39)
    this.camera.lookAt(this.scene.position)
  }

  private async loadAssets() {
    const gltfLoader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    gltfLoader.setDRACOLoader(dracoLoader)
    const gltf = await gltfLoader.loadAsync(import.meta.env.BASE_URL + 'model/band.drc')
    dracoLoader.dispose()

    const textureLoader = new THREE.TextureLoader()
    const texture = await textureLoader.loadAsync(import.meta.env.BASE_URL + 'texture/text.png')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.userData.aspect = texture.source.data.width / texture.source.data.height

    return { gltf, texture }
  }

  private createLights() {
    const dir = new THREE.DirectionalLight('#fff', 3)
    dir.position.set(5, 5, 5)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    const frustum = 5
    dir.shadow.camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.01, 20)
    dir.shadow.bias = -0.001
    this.scene.add(dir)

    // this.scene.add(new THREE.CameraHelper(dir.shadow.camera))
  }

  private createMaterial(texture: THREE.Texture, direction: number, speed: number) {
    const material = new THREE.MeshStandardMaterial({ color: '#000', side: THREE.DoubleSide })
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uText: { value: texture },
        uTextAspect: { value: texture.userData.aspect },
        uTime: { value: 0 },
        uDirection: { value: direction },
        uSpeed: { value: speed },
      })
      shader.vertexShader = vertexShader
      shader.fragmentShader = fragmentShader

      this.shaders.push(shader)
    }
    return material
  }

  private createObject(assets: { gltf: GLTF; texture: THREE.Texture }) {
    for (let i = 0; i < assets.gltf.scene.children.length; i++) {
      const mesh = assets.gltf.scene.children[i] as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      const dir = i % 2 === 0 ? 1 : -1
      const speed = 1 + i / assets.gltf.scene.children.length
      mesh.material = this.createMaterial(assets.texture, dir, speed)
    }

    assets.gltf.scene.position.y = -0.8
    assets.gltf.scene.rotation.y = Math.PI / 5.5
    this.scene.add(assets.gltf.scene)
  }

  private anime() {
    // this.controls.update()
    const dt = this.clock.getDelta()

    // console.log(this.camera.position)

    for (const shader of this.shaders) {
      shader.uniforms.uTime.value += dt
    }

    this.render()
  }
}
