import '../css/style.scss'
import Model from './model'
const JSZip = require('jszip')
const download = require('downloadjs')

class App {
	constructor() {
		this.setVariables()
	}

	setVariables() {
		this.clientID = null
		this.clientSecret = null
		this.baseURL = 'https://api.avatarsdk.com/'
		this.clientInput = document.getElementById('clientInput')
		this.clientID_input = document.getElementById('clientId')
		this.clientSecret_input = document.getElementById('clientSecret')
		this.clientBtn = document.getElementById('clientDataBtn')
		this.downloadBtn = document.getElementById('downloadBtn')
		this.clearBtn = document.getElementById('clearBtn')
		this.imageInput = document.getElementById('imageInput')
		this.clientID = localStorage.getItem('clientId')
		this.clientSecret = localStorage.getItem('clientSecret')
		this.token = localStorage.getItem('token')
		this.tokenExp = localStorage.getItem('tokenExp')
		this.preview_url = localStorage.getItem('preview_url')
		this.texture_url = localStorage.getItem('texture_url')
		this.mesh_url = localStorage.getItem('mesh_url')
		this.previewDefaultIcon = document.querySelector('.image-preview__default_icon')
		this.previewImage = document.querySelector('.image-preview__image')
		this.image = document.getElementById('image')
		this.label = document.getElementById('label')
		this.uploadBtn = document.getElementById('uploadBtn')
		this.title = document.getElementById('title')
		this.loader = document.getElementById('loader')
		this.setClientStuff()
	}

	setClientStuff() {
		if (this.clientID && this.clientSecret) return this.getToken()
		this.clientInput.style.display = 'flex'
		this.clientBtn.addEventListener('click', this.setClient.bind(this))
		return
	}

	setClient() {
		if (this.clientID_input.value && this.clientSecret_input.value) {
			this.clientID = this.clientID_input.value
			this.clientSecret = this.clientSecret_input.value
			localStorage.setItem('clientId', this.clientID_input.value)
			localStorage.setItem('clientSecret', this.clientSecret_input.value)
			return this.getToken()
		}
	}

	getToken() {
		if (Date.now() > this.tokenExp * 1000 || !this.token) {
			return this.requestToken()
		} else {
			return this.grabImage()
		}
	}

	async requestToken() {
		const headers = new Headers()
		headers.append('Content-Type', 'application/x-www-form-urlencoded')

		const urlencoded = new URLSearchParams()
		urlencoded.append('grant_type', 'client_credentials')
		urlencoded.append('client_id', this.clientID)
		urlencoded.append('client_secret', this.clientSecret)

		const requestOptions = {
			method: 'POST',
			headers,
			body: urlencoded,
			redirect: 'follow'
		}
		try {
			const resp = await fetch(`${this.baseURL}/o/token/`, requestOptions)
			if (resp.status == 401) {
				alert('Something went wrong! Verify the client_id and the client_secret')
				localStorage.removeItem('clientId')
				localStorage.removeItem('clientSecret')
				this.clientID = null
				this.clientSecret = null
				this.clientID_input.value = ''
				this.clientSecret_input.value = ''
				return null
			} else {
				const data = await resp.json()
				const token = data.access_token
				const tokenTipe = data.token_type
				const expIn = data.expires_in
				localStorage.setItem('token', `${tokenTipe} ${token}`)
				const tokenExp = Math.floor(Date.now() / 1000) + expIn
				localStorage.setItem('tokenExp', tokenExp)
				this.token = `${tokenTipe} ${token}`
				this.grabImage()
			}
		} catch (err) {
			alert('Upppps something went wrong!')
			console.log('Upppps something went wrong!', err)
		}
	}

	grabImage() {		
		if (this.preview_url && this.texture_url && this.mesh_url) {
			this.runLoader()
			this.downloadModel(this.preview_url, this.texture_url, this.mesh_url)
			this.clientInput.style.display = null
			this.imageInput.style.display = 'flex'
			this.uploadBtn.style.display = 'none'
			this.label.style.pointerEvents = 'none'
		}
		this.clientInput.style.display = null
		this.imageInput.style.display = 'flex'	

		this.image.addEventListener('change', e => {
			const file = e.target.files[0]
			if (file) {
				const reader = new FileReader()
				this.previewDefaultIcon.style.display = 'none'
				this.previewImage.style.display = 'block'
				reader.addEventListener('load', img => {
					this.previewImage.setAttribute('src', img.target.result)
					uploadBtn.addEventListener('click', this.uploadImage.bind(this, file))
				})
				reader.readAsDataURL(file)
			} else {
				this.previewDefaultIcon.style.display = null
				this.previewImage.style.display = null
				this.previewImage.setAttribute('src', '')
			}
		})
	}

	async uploadImage(file) {
		this.runLoader()
		let headers = new Headers()
		headers.append('Authorization', `${this.token}`)

		let body = new FormData()
		body.append('photo', file)
		body.append('name', 'avatar')
		body.append('pipeline', 'head_1.2')

		let requestOptions = {
			method: 'POST',
			headers,
			body,
			redirect: 'follow'
		}

		const resp = await fetch(`${this.baseURL}/avatars/`, requestOptions)
		const data = await resp.json()

		this.getModel(data.url)
	}

	async getModel(url) {
		let headers = new Headers()
		headers.append('Authorization', `${this.token}`)

		let requestOptions = {
			method: 'GET',
			headers,
			redirect: 'follow'
		}

		const resp = await fetch(url, requestOptions)
		const data = await resp.json()

		localStorage.setItem('preview_url', data.preview)
		localStorage.setItem('texture_url', data.texture)
		localStorage.setItem('mesh_url', data.mesh)
		this.downloadModel(data.preview, data.texture, data.mesh)
	}
	async downloadModel(preview_URL, texture_URL, mesh_URL) {
		let headers = new Headers()
		headers.append('Authorization', `${this.token}`)

		let requestOptions = {
			method: 'GET',
			headers,
			redirect: 'follow'
		}
		try {
			let preview = await fetch(preview_URL, requestOptions)
			if (preview.status === 404) {
				console.clear()
				throw 404
			}
			preview = await preview.blob()
			const objectURL = URL.createObjectURL(preview)
			this.previewImage.setAttribute('src', objectURL)

			const texture = await fetch(texture_URL, requestOptions)
			const textureBlob = await texture.blob()
			const textureURL = URL.createObjectURL(textureBlob)

			const mesh = await fetch(mesh_URL, requestOptions)
			const meshBlob = await mesh.blob()
			const new_zip = new JSZip()
			const zipModel = await new_zip.loadAsync(meshBlob)
			const model = await zipModel.file('model.ply').async('Uint8Array')
			const modelFile = new File([model], 'model.ply', { type: 'model/ply' })
			const modelURL = URL.createObjectURL(modelFile)

			this.label.style.pointerEvents = 'none'
			this.uploadBtn.style.display = 'none'
			this.title.innerText = 'Preview'
			this.previewDefaultIcon.style.display = 'none'
			this.previewImage.style.display = 'block'
			this.downloadBtn.style.display = 'block'
			this.clearBtn.style.display = 'block'
			this.downloadBtn.addEventListener('click', this.downStuff.bind(this, textureBlob, meshBlob))
			this.clearBtn.addEventListener('click', this.clearModel.bind(this))

			this.threeModel = new Model(modelURL, textureURL)
		} catch (err) {
			if (err === 404) {
				console.log('Upppps wait a minute! The server is still working!')
				setTimeout(() => {
					this.downloadModel(preview_URL, texture_URL, mesh_URL)
				}, 2000)
			}
			console.log(err)
		}
	}
	downStuff(texture, mesh) {
		download(texture, 'model.jpg', `${texture.type}`)
		download(mesh, 'model.zip', `${mesh.type}`)
	}
	clearModel() {	
		localStorage.removeItem('preview_url')
		localStorage.removeItem('texture_url')
		localStorage.removeItem('mesh_url') 
		location.reload()
	}
	runLoader(){
		this.loader.style.display = "flex"
	}
	stopLoader(){
		this.loader.style.display = "none"
	}
}

const app = new App()
