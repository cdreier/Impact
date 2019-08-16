Number.prototype.map = function(istart, istop, ostart, ostop) {
  return ostart + (ostop - ostart) * ((this - istart) / (istop - istart))
}

Number.prototype.limit = function(min, max) {
  return Math.min(max, Math.max(min, this))
}

Number.prototype.round = function(precision) {
  precision = Math.pow(10, precision || 0)
  return Math.round(this * precision) / precision
}

Number.prototype.floor = function() {
  return Math.floor(this)
}

Number.prototype.ceil = function() {
  return Math.ceil(this)
}

Number.prototype.toInt = function() {
  return (this | 0)
}

Number.prototype.toRad = function() {
  return (this / 180) * Math.PI
}

Number.prototype.toDeg = function() {
  return (this * 180) / Math.PI
}

if (typeof Array.prototype.erase == undefined || typeof Array.prototype.erase == 'undefined') {
  Object.defineProperty(Array.prototype, 'erase', {value: function(item) {
    for (var i = this.length; i--;) {
      if (this[i] === item) {
        this.splice(i, 1)
      }
    }
    return this
  }})
}

if (typeof Array.prototype.random == undefined || typeof Array.prototype.random == 'undefined') {
  Object.defineProperty(Array.prototype, 'random', {value: function(item) {
    return this[Math.floor(Math.random() * this.length)]
  }})
}

Function.prototype.bind = Function.prototype.bind || function(oThis) {
  if (typeof this !== 'function') {
    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable')
  }

  var aArgs = Array.prototype.slice.call(arguments, 1),
    fToBind = this,
    fNOP = function() {},
    fBound = function() {
      return fToBind.apply(
        (this instanceof fNOP && oThis ? this : oThis),
        aArgs.concat(Array.prototype.slice.call(arguments))
      )
    }

  fNOP.prototype = this.prototype
  fBound.prototype = new fNOP()

  return fBound
}

const ig = {
  $: (selector) => {
    return selector.charAt(0) == '#'
      ? document.getElementById(selector.substr(1))
      : document.getElementsByTagName(selector)
  },
  $new: (name) => {
    return document.createElement(name)
  },
  setVendorAttribute: (el, attr, val) => {
    var uc = attr.charAt(0).toUpperCase() + attr.substr(1)
    el[attr] = el['ms' + uc] = el['moz' + uc] = el['webkit' + uc] = el['o' + uc] = val
  },
  getVendorAttribute: (el, attr) => {
    var uc = attr.charAt(0).toUpperCase() + attr.substr(1)
    return el[attr] || el['ms' + uc] || el['moz' + uc] || el['webkit' + uc] || el['o' + uc]
  },
  normalizeVendorAttribute: (el, attr) => {
    var prefixedVal = ig.getVendorAttribute(el, attr)
    if (!el[attr] && prefixedVal) {
      el[attr] = prefixedVal
    }
  },
  copy: function(object) {
    if (
      !object || typeof (object) != 'object' ||
       object instanceof HTMLElement
    ) {
      return object
    } else if (object instanceof Array) {
      var c = []
      for (var i = 0, l = object.length; i < l; i++) {
        c[i] = ig.copy(object[i])
      }
      return c
    } else {
      var c = {}
      for (var i in object) {
        c[i] = ig.copy(object[i])
      }
      return c
    }
  },
  merge: function(original, extended) {
    for (var key in extended) {
      var ext = extended[key]
      if (
        typeof (ext) != 'object' ||
        ext instanceof HTMLElement ||
        ext === null
      ) {
        original[key] = ext
      } else {
        if (!original[key] || typeof (original[key]) != 'object') {
          original[key] = (ext instanceof Array) ? [] : {}
        }
        ig.merge(original[key], ext)
      }
    }
    return original
  },
  log: function(...msg){
    const env = process.env.NODE_ENV
    if (env == 'development') {
      console.log(`[${msg[0]}]`, ...msg.slice(1)) // eslint-disable-line
    }
  },
}

export {
  ig,
}