import DebugMenu from './menu'
import DebuggableEntity from './entities-panel'
import DebugGraphPanel from './graph-panel'
import {DebugPanel, DebugOption} from './panel'
import IG from '../impact'


const createDebugger = instance => {

  // problem with the delayed loader... FIXME
  setTimeout(() => {
    const d = new DebugMenu(instance)

    const entityPanel = createEntityPanel(instance)
    d.addPanel(entityPanel)
    
    
    const graphPanel = createPerformancePanel(instance)
    d.addPanel(graphPanel)

  }, IG.loaderDelay + 100)
}


const createPerformancePanel = instance => {

  const panel = new DebugGraphPanel(instance, 'graph', 'Performance')

  instance.game.update = new Proxy(instance.game.update, {
    apply: function(target, thisArg, argumentsList){
      panel.beginClock('update')
      const result = target.call(thisArg)
      panel.endClock('update')
      return result
    },
  })

  instance.game.draw = new Proxy(instance.game.draw, {
    apply: function(target, thisArg, argumentsList){
      panel.beginClock('draw')
      const result = target.call(thisArg)
      panel.endClock('draw')
      return result
    },
  })
  
  instance.game.checkEntities = new Proxy(instance.game.checkEntities, {
    apply: function(target, thisArg, argumentsList){
      panel.beginClock('checks')
      const result = target.call(thisArg)
      panel.endClock('checks')
      return result
    },
  })

  return panel
}


const createEntityPanel = instance => {
  // construct entities
  instance.game.entities = instance.game.entities.map(e => {
    return new Proxy(e, {
      get: function(target, prop, receiver){
        switch (prop){
          case 'draw':
            DebuggableEntity.draw(e)
            break
        }
        // TODO: static calls not trapped?
        if (prop == 'checkPair'){
          console.log('checkPair')
        }
        return target[prop]
      },
    })
  })
  // add entity panel
  const entityPanel = new DebugPanel('entities', 'Entities')
  entityPanel.addOption(new DebugOption('Checks & Collisions', DebuggableEntity, '_debugEnableChecks'))
  entityPanel.addOption(new DebugOption('Show Collision Boxes', DebuggableEntity, '_debugShowBoxes'))
  entityPanel.addOption(new DebugOption('Show Velocities', DebuggableEntity, '_debugShowVelocities'))
  entityPanel.addOption(new DebugOption('Show Names & Targets', DebuggableEntity, '_debugShowNames'))
  return entityPanel
}


export {
  createDebugger,
}