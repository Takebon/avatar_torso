import * as THREE from 'three'
import OrbitControls from 'three-orbitcontrols'
const PLYLoader = require('threejs-ply-loader')(THREE)

export default class Model {
	constructor(modelURL, textureURL) {
		this.modelURL = modelURL
		this.textureURL = textureURL
		this.init()
	}

	init() {
		this.createScene()
		this.createCamera()
		this.addControls()
		this.loadModel()
		document.getElementById('loader').style.display = "none"
		this.loop()

		window.addEventListener('resize', this.onResize.bind(this))
	}

	createScene() {
		this.scene = new THREE.Scene()
		this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(window.devicePixelRatio)
		document.getElementById('canvas').appendChild(this.renderer.domElement)
	}

	createCamera() {
		this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200)
		this.camera.position.set(0, 0, 10)
	}

	addControls() {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls.rotateSpeed = 0.7
		this.controls.enableDamping = true
		this.controls.dampingFactor = 0.03
		this.controls.minDistance = 6
		this.controls.maxDistance = 10
		this.controls.maxAzimuthAngle = Math.PI / 2
		this.controls.minAzimuthAngle = -Math.PI / 2
	}

	async loadModel() {
		const textureLoader = new THREE.TextureLoader()
		const texture = await textureLoader.load(this.textureURL)
		const material = new THREE.MeshBasicMaterial({ map: texture })

		const plyLoader = new PLYLoader()
		plyLoader.load(this.modelURL, geometry => {
			geometry.computeVertexNormals()
			const mesh = new THREE.Mesh(geometry, material)
			mesh.position.set(0, 0, 0)
			mesh.scale.multiplyScalar(10)
			this.scene.add(mesh)
		})
	}

	loop() {
		requestAnimationFrame(() => this.loop())
		this.controls.update()
		this.renderer.render(this.scene, this.camera)
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}
}
