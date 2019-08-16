import IG from './impact'
import {ig} from './igUtils'

class Image {

  static cache = {}
  static drawCount = 0
  static reloadCache() {
    for (var path in Image.cache) {
      Image.cache[path].reload()
    }
  }

  data = null
  width = 0
  height = 0
  loaded = false
  failed = false
  loadCallback = null
  path = ''
  
  static staticInstantiate(path) {
    return Image.cache[path] || null
  }
  
  constructor(path) {
    this.path = path
    this.load()
  }
  
  
  load(loadCallback) {
    if (this.loaded) {
      if (loadCallback) {
        loadCallback(this.path, true)
      }
      return
    } else if (!this.loaded && IG.instance.ready) {
      this.loadCallback = loadCallback || null
      ig.log('Image', 'loading in running game', this.path)
      this.data = new window.Image()
      this.data.onload = this.onload.bind(this)
      this.data.onerror = this.onerror.bind(this)
      this.data.src = IG.prefix + this.path + IG.nocache
    } else {
      ig.log('Image', 'IG.instance.addResource ', this.path)
      IG.instance.addResource(this)
    }
    
    Image.cache[this.path] = this
  }
  
  
  reload() { 
    this.loaded = false
    this.data = new window.Image()
    this.data.onload = this.onload.bind(this)
    this.data.src = this.path + '?' + Date.now()
  }
  
  
  onload() {
    ig.log('Image', 'onload callback')
    this.width = this.data.width
    this.height = this.data.height
    this.loaded = true
    
    if (IG.instance.system.scale != 1) {
      this.resize(IG.instance.system.scale)
    }
    
    if (this.loadCallback) {
      ig.log('Image', ' calling this.loadCallback')
      this.loadCallback(this.path, true)
    }
  }
  
  
  onerror() {
    this.failed = true
    
    if (this.loadCallback) {
      this.loadCallback(this.path, false)
    }
  }
  
  
  resize(scale) {
    // Nearest-Neighbor scaling
    
    // The original image is drawn into an offscreen canvas of the same size
    // and copied into another offscreen canvas with the new size. 
    // The scaled offscreen canvas becomes the image (data) of this object.

    // TODO cdreier, potential error "width = 0"
    var origPixels = IG.instance.getImagePixels(this.data, 0, 0, this.width, this.height)
    
    var widthScaled = this.width * scale
    var heightScaled = this.height * scale

    var scaled = ig.$new('canvas')
    scaled.width = widthScaled
    scaled.height = heightScaled
    var scaledCtx = scaled.getContext('2d')
    var scaledPixels = scaledCtx.getImageData(0, 0, widthScaled, heightScaled)
      
    for (var y = 0; y < heightScaled; y++) {
      for (var x = 0; x < widthScaled; x++) {
        var index = (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4
        var indexScaled = (y * widthScaled + x) * 4
        scaledPixels.data[indexScaled] = origPixels.data[index]
        scaledPixels.data[indexScaled + 1] = origPixels.data[index + 1]
        scaledPixels.data[indexScaled + 2] = origPixels.data[index + 2]
        scaledPixels.data[indexScaled + 3] = origPixels.data[index + 3]
      }
    }
    scaledCtx.putImageData(scaledPixels, 0, 0)
    this.data = scaled
  }
  
  
  draw(targetX, targetY, sourceX, sourceY, width, height) {
    if (!this.loaded) {
      return 
    }
    
    var scale = IG.instance.system.scale
    sourceX = sourceX ? sourceX * scale : 0
    sourceY = sourceY ? sourceY * scale : 0
    width = (width ? width : this.width) * scale
    height = (height ? height : this.height) * scale
    
    IG.instance.system.context.drawImage( 
      this.data, sourceX, sourceY, width, height,
      IG.instance.system.getDrawPos(targetX), 
      IG.instance.system.getDrawPos(targetY),
      width, height
    )
    
    Image.drawCount++
  }

  
  drawTile(targetX, targetY, tile, tileWidth, tileHeight, flipX, flipY) {
    tileHeight = tileHeight ? tileHeight : tileWidth
    
    if (!this.loaded || tileWidth > this.width || tileHeight > this.height) {
      return 
    }
    
    var scale = IG.instance.system.scale
    var tileWidthScaled = Math.floor(tileWidth * scale)
    var tileHeightScaled = Math.floor(tileHeight * scale)
    
    var scaleX = flipX ? -1 : 1
    var scaleY = flipY ? -1 : 1
    
    if (flipX || flipY) {
      IG.instance.system.context.save()
      IG.instance.system.context.scale(scaleX, scaleY)
    }
    IG.instance.system.context.drawImage( 
      this.data, 
      (Math.floor(tile * tileWidth) % this.width) * scale,
      (Math.floor(tile * tileWidth / this.width) * tileHeight) * scale,
      tileWidthScaled,
      tileHeightScaled,
      IG.instance.system.getDrawPos(targetX) * scaleX - (flipX ? tileWidthScaled : 0), 
      IG.instance.system.getDrawPos(targetY) * scaleY - (flipY ? tileHeightScaled : 0),
      tileWidthScaled,
      tileHeightScaled
    )
    if (flipX || flipY) {
      IG.instance.system.context.restore()
    }
    
    Image.drawCount++
  }
}

export default Image