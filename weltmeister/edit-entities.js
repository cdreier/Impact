import {IG, ig, Game} from 'impact'
import Weltmeister from './weltmeister'
import Config from './config'

// .requires(
// 	'weltmeister.entities'
// )
class EditEntities {
  visible = true
  active = true
  
  div = null
  hotkey = -1
  ignoreLastClick = false
  name = 'entities'
  
  entities = []
  namedEntities = {}
  selectedEntity = null
  entityClasses = {}
  menuDiv = null
  selector = {size: {x: 2, y: 2}, pos: {x: 0, y: 0}, offset: {x: 0, y: 0}}
  wasSelectedOnScaleBorder = false
  gridSize = Config.entityGrid
  entityDefinitions = null
  
  
  
  constructor(div) {
    this.div = div
    div.bind('mouseup', this.click.bind(this))
    this.div.children('.visible').bind('mousedown', this.toggleVisibilityClick.bind(this))
    
    this.menu = $('#entityMenu')
    this.importEntityClass(Weltmeister.entityModules)
    this.entityDefinitions = $('#entityDefinitions')
    
    $('#entityKey').bind('keydown', function(ev){ 
      if (ev.which == 13){ 
        $('#entityValue').focus() 
        return false
      }
      return true
    })
    $('#entityValue').bind('keydown', this.setEntitySetting.bind(this))
  }
  
  
  clear() {
    this.entities = []
    this.selectEntity(null)
  }
  
  
  sort() {
    this.entities.sort(Game.SORT.Z_INDEX)
  }
  
  
  
  
  // -------------------------------------------------------------------------
  // Loading, Saving
  
  
  fileNameToClassName(name) {
    var typeName = '-' + name.replace(/^.*\/|\.js/g, '')
    typeName = typeName.replace(/-(\w)/g, function(m, a) {
      return a.toUpperCase()
    })
    return 'Entity' + typeName
  }
  
  
  importEntityClass(modules) {
    var unloadedClasses = []
    for (var m in modules) {
      var className = modules[m] //this.fileNameToClassName(modules[m])
      var entityName = className.replace(/^Entity/, '')
      
      // ig.global[className] should be the actual class object
      // if (className && ig.global[className]) {

      // Ignore entities that have the _wmIgnore flag
      if (!(className)._wmIgnore) {
        var a = $('<div/>', {
          'id': className,
          'href': '#',
          'html': entityName,
          'mouseup': this.newEntityClick.bind(this),
        })
        this.menu.append(a)
        this.entityClasses[className] = m
      }
      // } else {
      //   unloadedClasses.push(modules[m] + ' (expected name: ' + className + ')')
      // }
    }

    if (unloadedClasses.length > 0) {
      var warning = 'The following entity classes were not loaded due to\n'
        + 'file and class name mismatches: \n\n'
        + unloadedClasses.join('\n')
      alert(warning)
    }
  }
  
  
  getEntityByName(name) {
    return this.namedEntities[name]
  }
  
  
  getSaveData() {
    var ents = []
    for (var i = 0; i < this.entities.length; i++) {
      var ent = this.entities[i]
      var type = ent._wmClassName
      var data = {type: type, x: ent.pos.x, y: ent.pos.y}
      
      var hasSettings = false
      for (var p in ent._wmSettings) {
        hasSettings = true
      }
      if (hasSettings) {
        data.settings = ent._wmSettings
      }
      
      ents.push(data)
    }
    return ents
  }
  
  
  
  
  // -------------------------------------------------------------------------
  // Selecting
  
  
  selectEntityAt(x, y) {
    this.selector.pos = { x: x, y: y }
    
    // Find all possible selections
    var possibleSelections = []
    for (var i = 0; i < this.entities.length; i++) {
      if (this.entities[i].touches(this.selector)) {
        possibleSelections.push(this.entities[i])
      }
    }
    
    // Nothing found? Early out.
    if (!possibleSelections.length) {
      this.selectEntity(null)
      return false
    }
    
    // Find the 'next' selection
    var selectedIndex = possibleSelections.indexOf(this.selectedEntity)
    var nextSelection = (selectedIndex + 1) % possibleSelections.length
    var ent = possibleSelections[nextSelection]
    
    // Select it!
    this.selector.offset = {
      x: (x - ent.pos.x + ent.offset.x),
      y: (y - ent.pos.y + ent.offset.y),
    }
    this.selectEntity(ent)
    this.wasSelectedOnScaleBorder = this.isOnScaleBorder(ent, this.selector)
    return ent
  }
  
  
  selectEntity(entity) {
    if (entity && entity != this.selectedEntity) {
      this.selectedEntity = entity
      $('#entitySettings').fadeOut(100, (function(){
        this.loadEntitySettings()
        $('#entitySettings').fadeIn(100)
      }).bind(this))
    } else if (!entity) {
      $('#entitySettings').fadeOut(100)
      $('#entityKey').blur()
      $('#entityValue').blur()
    }
    
    this.selectedEntity = entity
    $('#entityKey').val('')
    $('#entityValue').val('')
  }
  
  

  
  // -------------------------------------------------------------------------
  // Creating, Deleting, Moving
  
  
  deleteSelectedEntity() {
    if (!this.selectedEntity) {
      return false
    }
    
    IG.instance.game.undo.commitEntityDelete(this.selectedEntity)
    
    this.removeEntity(this.selectedEntity)
    this.selectEntity(null)
    return true
  }
  
  
  removeEntity(ent) {
    if (ent.name) {
      delete this.namedEntities[ent.name]
    }
    this.entities.erase(ent)
  }
  
  
  cloneSelectedEntity() {
    if (!this.selectedEntity) {
      return false
    }
    
    var className = this.selectedEntity._wmClassName
    var settings = ig.copy(this.selectedEntity._wmSettings)
    if (settings.name) {
      settings.name = settings.name + '_clone'
    }
    var x = this.selectedEntity.pos.x + this.gridSize
    var y = this.selectedEntity.pos.y
    var newEntity = this.spawnEntity(className, x, y, settings)
    newEntity._wmSettings = settings
    this.selectEntity(newEntity)
    
    IG.instance.game.undo.commitEntityCreate(newEntity)
    
    return true
  }
  
  
  dragOnSelectedEntity(x, y) {
    if (!this.selectedEntity) {
      return false
    }
    
    
    // scale or move?
    if (this.selectedEntity._wmScalable && this.wasSelectedOnScaleBorder) {
      this.scaleSelectedEntity(x, y)	
    } else {
      this.moveSelectedEntity(x, y)
    }
    
    IG.instance.game.undo.pushEntityEdit(this.selectedEntity)
    return true
  }
  
  
  moveSelectedEntity(x, y) {
    x = 
      Math.round((x - this.selector.offset.x) / this.gridSize)
      * this.gridSize + this.selectedEntity.offset.x
    y = 
      Math.round((y - this.selector.offset.y) / this.gridSize)
      * this.gridSize + this.selectedEntity.offset.y
    
    // new position?
    if (this.selectedEntity.pos.x != x || this.selectedEntity.pos.y != y) {
      $('#entityDefinitionPosX').text(x)
      $('#entityDefinitionPosY').text(y)
      
      this.selectedEntity.pos.x = x
      this.selectedEntity.pos.y = y
    }
  }
  
  
  scaleSelectedEntity(x, y) {
    var scale = this.wasSelectedOnScaleBorder
      
    var w = Math.round(x / this.gridSize) * this.gridSize - this.selectedEntity.pos.x
    
    if (!this.selectedEntity._wmSettings.size) {
      this.selectedEntity._wmSettings.size = {}
    }
    
    if (scale == 'n') {
      var h = this.selectedEntity.pos.y - Math.round(y / this.gridSize) * this.gridSize
      if (this.selectedEntity.size.y + h <= this.gridSize) {
        h = (this.selectedEntity.size.y - this.gridSize) * -1
      }
      this.selectedEntity.size.y += h
      this.selectedEntity.pos.y -= h
    } else if (scale == 's') {
      var h = Math.round(y / this.gridSize) * this.gridSize - this.selectedEntity.pos.y
      this.selectedEntity.size.y = Math.max(this.gridSize, h)
    } else if (scale == 'e') {
      var w = Math.round(x / this.gridSize) * this.gridSize - this.selectedEntity.pos.x
      this.selectedEntity.size.x = Math.max(this.gridSize, w)
    } else if (scale == 'w') {
      var w = this.selectedEntity.pos.x - Math.round(x / this.gridSize) * this.gridSize
      if (this.selectedEntity.size.x + w <= this.gridSize) {
        w = (this.selectedEntity.size.x - this.gridSize) * -1
      }
      this.selectedEntity.size.x += w
      this.selectedEntity.pos.x -= w
    }
    this.selectedEntity._wmSettings.size.x = this.selectedEntity.size.x
    this.selectedEntity._wmSettings.size.y = this.selectedEntity.size.y
    
    this.loadEntitySettings()
  }
  
  
  newEntityClick(ev) {
    this.hideMenu()
    var newEntity = this.spawnEntity(ev.target.id, 0, 0, {})
    this.selectEntity(newEntity)
    this.moveSelectedEntity(this.selector.pos.x, this.selector.pos.y)
    IG.instance.editor.setModified()
    
    IG.instance.game.undo.commitEntityCreate(newEntity)
  }
  
  
  spawnEntity(className, x, y, settings) {
    settings = settings || {}
    var entityClass = window.window.igEntities[className]

    if (entityClass) {
      var newEntity = new (entityClass)(x, y, settings)
      newEntity._wmInEditor = true
      newEntity._wmClassName = className
      newEntity._wmSettings = {}
      for (var s in settings) {
        newEntity._wmSettings[s] = settings[s]
      }
      this.entities.push(newEntity)
      if (settings.name) {
        this.namedEntities[settings.name] = newEntity
      }
      this.sort()
      return newEntity
    }
    return null
  }
  
  
  isOnScaleBorder(entity, selector) {	
    var border = 2
    var w = selector.pos.x - entity.pos.x
    var h = selector.pos.y - entity.pos.y
    
    if (w < border) return 'w'
    if (w > entity.size.x - border) return 'e'
    
    if (h < border) return 'n'
    if (h > entity.size.y - border) return 's'
    
    return false
  }
  
  
  
  
  // -------------------------------------------------------------------------
  // Settings
  
  
  loadEntitySettings(ent) {
    
    if (!this.selectedEntity) {
      return
    }
    var html = 
      '<div class="entityDefinition"><span class="key">x</span>:<span class="value" id="entityDefinitionPosX">' + this.selectedEntity.pos.x + '</span></div>'
      + '<div class="entityDefinition"><span class="key">y</span>:<span class="value" id="entityDefinitionPosY">' + this.selectedEntity.pos.y + '</span></div>'
    
    html += this.loadEntitySettingsRecursive(this.selectedEntity._wmSettings)
    this.entityDefinitions.html(html)
    
    var className = this.selectedEntity._wmClassName.replace(/^Entity/, '')
    $('#entityClass').text(className)
    
    $('.entityDefinition').bind('mouseup', this.selectEntitySetting)
  }
  
  
  loadEntitySettingsRecursive(settings, path) {
    path = path || ''
    var html = ''
    for (var key in settings) {
      var value = settings[key]
      if (typeof (value) == 'object') {
        html += this.loadEntitySettingsRecursive(value, path + key + '.')
      } else {
        html += '<div class="entityDefinition"><span class="key">' + path + key + '</span>:<span class="value">' + value + '</span></div>'
      }
    }
    
    return html
  }
  
  
  setEntitySetting(ev) {
    if (ev.which != 13) {
      return true
    }
    var key = $('#entityKey').val()
    var value = $('#entityValue').val()
    var floatVal = parseFloat(value)
    if (value == floatVal) {
      value = floatVal
    }
    
    if (key == 'name') {
      if (this.selectedEntity.name) {
        delete this.namedEntities[this.selectedEntity.name]
      }
      this.namedEntities[value] = this.selectedEntity
    }
    
    if (key == 'x') {
      this.selectedEntity.pos.x = Math.round(value)
    } else if (key == 'y') {
      this.selectedEntity.pos.y = Math.round(value)
    } else {
      this.writeSettingAtPath(this.selectedEntity._wmSettings, key, value)
      ig.merge(this.selectedEntity, this.selectedEntity._wmSettings)
    }
    
    this.sort()
    
    IG.instance.game.setModified()
    IG.instance.game.draw()
    
    $('#entityKey').val('')
    $('#entityValue').val('')
    $('#entityValue').blur()
    this.loadEntitySettings()
    
    $('#entityKey').focus() 
    return false
  }

  
  writeSettingAtPath(root, path, value) {
    path = path.split('.')
    var cur = root
    for (var i = 0; i < path.length; i++) {
      var n = path[i]
      if (i < path.length - 1 && typeof (cur[n]) != 'object') {
        cur[n] = {}
      }
      
      if (i == path.length - 1) {
        cur[n] = value
      }
      cur = cur[n]		
    }
    
    this.trimObject(root)
  }
  
  
  trimObject(obj) {
    var isEmpty = true
    for (var i in obj) {
      if (
        (obj[i] === '') ||
         (typeof (obj[i]) == 'object' && this.trimObject(obj[i]))
      ) {
        delete obj[i]
      }
      
      if (typeof (obj[i]) != 'undefined') {
        isEmpty = false
      }
    }
    
    return isEmpty
  }
  
  
  selectEntitySetting(ev) {
    $('#entityKey').val($(this).children('.key').text())
    $('#entityValue').val($(this).children('.value').text())
    $('#entityValue').select()
  }
  
  
  
  
  
  
  // -------------------------------------------------------------------------
  // UI
  
  setHotkey(hotkey) {
    this.hotkey = hotkey
    this.div.attr('title', 'Select Layer (' + this.hotkey + ')')
  }
  
  
  showMenu(x, y) {
    this.selector.pos = { 
      x: Math.round((x + IG.instance.editor.screen.x) / this.gridSize) * this.gridSize, 
      y: Math.round((y + IG.instance.editor.screen.y) / this.gridSize) * this.gridSize,
    }
    this.menu.css({top: (y * IG.instance.system.scale + 2), left: (x * IG.instance.system.scale + 2) })
    this.menu.show()
  }
  
  
  hideMenu(x, y) {
    IG.instance.editor.mode = Weltmeister.MODE.DEFAULT
    this.menu.hide()
  }
  
  
  setActive(active) {
    this.active = active
    if (active) {
      this.div.addClass('layerActive')
    } else {
      this.div.removeClass('layerActive')
    }
  }
  
  
  toggleVisibility() {
    this.visible ^= 1
    if (this.visible) {
      this.div.children('.visible').addClass('checkedVis')
    } else {
      this.div.children('.visible').removeClass('checkedVis')
    }
    IG.instance.game.draw()
  }
  
  
  toggleVisibilityClick(ev) {
    if (!this.active) {
      this.ignoreLastClick = true
    }
    this.toggleVisibility()
  }
  
  
  click() {
    if (this.ignoreLastClick) {
      this.ignoreLastClick = false
      return
    }
    IG.instance.editor.setActiveLayer('entities')
  }
  
  
  mousemove(x, y) {
    this.selector.pos = { x: x, y: y }
    
    if (this.selectedEntity) {
      if (this.selectedEntity._wmScalable && this.selectedEntity.touches(this.selector)) {
        var scale = this.isOnScaleBorder(this.selectedEntity, this.selector)
        if (scale == 'n' || scale == 's') {
          $('body').css('cursor', 'n-resize')
          return
        } else if (scale == 'e' || scale == 'w') {
          $('body').css('cursor', 'e-resize')
          return
        }
      }
    }
    
    $('body').css('cursor', 'default')
  }
  
  
  
  
  
  
  // -------------------------------------------------------------------------
  // Drawing
  
  
  draw() {
    if (this.visible) {
      for (var i = 0; i < this.entities.length; i++) {
        this.drawEntity(this.entities[i])
      }
    }
  }
  
  
  drawEntity(ent) {
    
    // entity itself
    ent.draw()
    
    // box
    if (ent._wmDrawBox) {
      IG.instance.system.context.fillStyle = ent._wmBoxColor || 'rgba(128, 128, 128, 0.9)'
      IG.instance.system.context.fillRect(
        IG.instance.system.getDrawPos(ent.pos.x - IG.instance.game.screen.x),
        IG.instance.system.getDrawPos(ent.pos.y - IG.instance.game.screen.y), 
        ent.size.x * IG.instance.system.scale, 
        ent.size.y * IG.instance.system.scale
      )
    }
    
    
    if (Config.labels.draw) {
      // description
      var className = ent._wmClassName.replace(/^Entity/, '')
      var description = className + (ent.name ? ': ' + ent.name : '')
      
      // text-shadow
      IG.instance.system.context.fillStyle = 'rgba(0,0,0,0.4)'
      IG.instance.system.context.fillText(
        description,
        IG.instance.system.getDrawPos(ent.pos.x - IG.instance.game.screen.x), 
        IG.instance.system.getDrawPos(ent.pos.y - IG.instance.game.screen.y + 0.5)
      )
      
      // text
      IG.instance.system.context.fillStyle = Config.colors.primary
      IG.instance.system.context.fillText(
        description,
        IG.instance.system.getDrawPos(ent.pos.x - IG.instance.game.screen.x), 
        IG.instance.system.getDrawPos(ent.pos.y - IG.instance.game.screen.y)
      )
    }

    
    // line to targets
    if (typeof (ent.target) == 'object') {
      for (var t in ent.target) {
        this.drawLineToTarget(ent, ent.target[t])
      }
    }
  }

  
  drawLineToTarget(ent, target) {
    target = IG.instance.game.getEntityByName(target)
    if (!target) {
      return
    }
    
    IG.instance.system.context.strokeStyle = '#fff'
    IG.instance.system.context.lineWidth = 1
    
    IG.instance.system.context.beginPath()
    IG.instance.system.context.moveTo(
      IG.instance.system.getDrawPos(ent.pos.x + ent.size.x / 2 - IG.instance.game.screen.x),
      IG.instance.system.getDrawPos(ent.pos.y + ent.size.y / 2 - IG.instance.game.screen.y)
    )
    IG.instance.system.context.lineTo(
      IG.instance.system.getDrawPos(target.pos.x + target.size.x / 2 - IG.instance.game.screen.x),
      IG.instance.system.getDrawPos(target.pos.y + target.size.y / 2 - IG.instance.game.screen.y)
    )
    IG.instance.system.context.stroke()
    IG.instance.system.context.closePath()
  }
  
  
  drawCursor(x, y) {
    if (this.selectedEntity) {
      IG.instance.system.context.lineWidth = 1
      IG.instance.system.context.strokeStyle = Config.colors.highlight
      IG.instance.system.context.strokeRect( 
        IG.instance.system.getDrawPos(this.selectedEntity.pos.x - IG.instance.editor.screen.x) - 0.5, 
        IG.instance.system.getDrawPos(this.selectedEntity.pos.y - IG.instance.editor.screen.y) - 0.5, 
        this.selectedEntity.size.x * IG.instance.system.scale + 1, 
        this.selectedEntity.size.y * IG.instance.system.scale + 1
      )
    }
  }
}

export default EditEntities