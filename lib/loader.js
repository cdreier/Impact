// import Image from './image'
// import Font from "./font"
// import Sound from './sound'
import IG from './impact'
import {ig} from './igUtils'

class Loader {
  resources = []
  
  gameClass = null
  status = 0
  done = false
  
  _unloaded = []
  _drawStatus = 0
  _intervalId = 0
  _loadCallbackBound = null
  system = null
  
  constructor(system, gameClass, resources) {
    this.system = system
    this.gameClass = gameClass
    this.resources = resources
    this._loadCallbackBound = this._loadCallback.bind(this)
    
    for (var i = 0; i < this.resources.length; i++) {
      this._unloaded.push(this.resources[i].path)
    }
  }
  
  
  load() {
    ig.log('Loader', 'start load')
    this.system.clear('#000')
    
    if (!this.resources.length) {
      ig.log('Loader', 'no resources')
      this.end()
      return
    }

    ig.log('Loader', 'loading initial resources')
    for (var i = 0; i < this.resources.length; i++) {
      this.loadResource(this.resources[i])
    }
    this._intervalId = setInterval(this.draw.bind(this), 16)
  }
  
  
  loadResource(res) {
    res.load(this._loadCallbackBound)
  }
  
  
  end() {
    if (this.done) {
      return 
    }
    
    this.done = true
    clearInterval(this._intervalId)
    this.system.setGame(this.gameClass)
  }
  
  
  draw() {
    this._drawStatus += (this.status - this._drawStatus) / 5
    this.s = IG.instance.system.scale
    this.w = IG.instance.system.width * 0.6
    this.h = IG.instance.system.height * 0.1
    this.x = IG.instance.system.width * 0.5 - this.w / 2
    this.y = IG.instance.system.height * 0.5 - this.h / 2
    
    this.system.context.fillStyle = '#000'
    this.system.context.fillRect(0, 0, 480, 320)
    
    this.system.context.fillStyle = '#fff'
    this.system.context.fillRect(this.x * this.s, this.y * this.s, this.w * this.s, this.h * this.s)
    
    this.system.context.fillStyle = '#000'
    this.system.context.fillRect(this.x * this.s + this.s, this.y * this.s + this.s, this.w * this.s - this.s - this.s, this.h * this.s - this.s - this.s)
    
    this.system.context.fillStyle = '#fff'
    this.system.context.fillRect(this.x * this.s, this.y * this.s, this.w * this.s * this._drawStatus, this.h * this.s)
  }
  
  
  _loadCallback(path, status) {
    if (status) {
      this._unloaded.erase(path)
    } else {
      throw ('Failed to load resource: ' + path)
    }
    
    this.status = 1 - (this._unloaded.length / this.resources.length)
    if (this._unloaded.length == 0) { // all done?
      setTimeout(this.end.bind(this), 250)
    }
  }
}

export default Loader