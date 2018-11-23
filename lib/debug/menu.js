import {ig} from "../igUtils"
import Image from "../image"

class Debug {
	options = {}
	panels = {}
	numbers ={}
	container = null
	panelMenu = null
	activePanel = null
	
	debugTime = 0
	debugTickAvg = 0.016
	debugRealTime = Date.now()

	impactInstance = null
	
	constructor(instance) {

		this.impactInstance = instance

		Object.assign(this.impactInstance.system, {
			__run: this.impactInstance.system.run,
			__setGameNow: this.impactInstance.system.setGameNow,
			run: () => {
				this.beforeRun()
				this.impactInstance.system.__run()
				this.afterRun()
			},
			setGameNow: ( gameClass ) => {
				this.impactInstance.system.__setGameNow( gameClass )
				this.ready()
			}
		})

		// Inject the Stylesheet
		var style = ig.$new('link');
		style.rel = 'stylesheet';
		style.type = 'text/css';
		style.href = 'lib/debug/debug.css';
		ig.$('body')[0].appendChild( style );

		// Create the Debug Container
		this.container = ig.$new('div');
		this.container.className ='ig_debug';
		ig.$('body')[0].appendChild( this.container );
		
		// Create and add the Menu Container
		this.panelMenu = ig.$new('div');
		this.panelMenu.innerHTML = '<div class="ig_debug_head">Impact.Debug:</div>';
		this.panelMenu.className ='ig_debug_panel_menu';
		
		this.container.appendChild( this.panelMenu );
		
		// Create and add the Stats Container
		this.numberContainer = ig.$new('div');
		this.numberContainer.className ='ig_debug_stats';
		this.panelMenu.appendChild( this.numberContainer );
		
		// Set ig.log(), ig.assert() and ig.show()
		if( window.console && window.console.log && window.console.assert ) {
			// Can't use .bind() on native functions in IE9 :/
			ig.log = console.log.bind ? console.log.bind(console) : console.log;
			ig.assert = console.assert.bind ? console.assert.bind(console) : console.assert;
		}
		ig.show = this.showNumber.bind(this);
	}
	
	
	addNumber( name, width ) {
		var number = ig.$new('span');		
		this.numberContainer.appendChild( number );
		this.numberContainer.appendChild( document.createTextNode(name) );
		
		this.numbers[name] = number;
	}
	
	
	showNumber( name, number, width ) {
		if( !this.numbers[name] ) {
			this.addNumber( name, width );
		}
		this.numbers[name].textContent = number;
	}
	
	
	addPanel( panelDef ) {
		// Create the panel and options
		var panel = new (panelDef.type)( panelDef.name, panelDef.label );
		if( panelDef.options ) {
			for( var i = 0; i < panelDef.options.length; i++ ) {
				var opt = panelDef.options[i];
				panel.addOption( new ig.DebugOption(opt.name, opt.object, opt.property) );
			}
		}
		
		this.panels[ panel.name ] = panel;
		panel.container.style.display = 'none';
		this.container.appendChild( panel.container );
		
		
		// Create the menu item
		var menuItem = ig.$new('div');
		menuItem.className = 'ig_debug_menu_item';
		menuItem.textContent = panel.label;
		menuItem.addEventListener(
			'click',
			(function(ev){ this.togglePanel(panel); }).bind(this),
			false
		);
		panel.menuItem = menuItem;
		
		// Insert menu item in alphabetical order into the menu
		var inserted = false;
		for( var i = 1; i < this.panelMenu.childNodes.length; i++ ) {
			var cn = this.panelMenu.childNodes[i];
			if( cn.textContent > panel.label ) {
				this.panelMenu.insertBefore( menuItem, cn );
				inserted = true;
				break;
			}
		}
		if( !inserted ) {
			// Not inserted? Append at the end!
			this.panelMenu.appendChild( menuItem );
		}
	}
	
	
	showPanel( name ) {
		this.togglePanel( this.panels[name] );
	}
	
	
	togglePanel( panel ) {
		if( panel != this.activePanel && this.activePanel ) {
			this.activePanel.toggle( false );
			this.activePanel.menuItem.className = 'ig_debug_menu_item';
			this.activePanel = null;
		}
		
		var dsp = panel.container.style.display;
		var active = (dsp != 'block');
		panel.toggle( active );
		panel.menuItem.className = 'ig_debug_menu_item' + (active ? ' active' : '');
		
		if( active ) {
			this.activePanel = panel;
		}
	}
	
	
	ready() {
		for( var p in this.panels ) {
			this.panels[p].ready();
		}
	}
	
	
	beforeRun() {
		var timeBeforeRun = Date.now();
		this.debugTickAvg = this.debugTickAvg * 0.8 + (timeBeforeRun - this.debugRealTime) * 0.2;
		this.debugRealTime = timeBeforeRun;
		
		if( this.activePanel ) {
			this.activePanel.beforeRun();
		}
	}
	
	
	afterRun() {
		var frameTime = Date.now() - this.debugRealTime;
		var nextFrameDue = (1000/this.impactInstance.system.fps) - frameTime;
		
		this.debugTime = this.debugTime * 0.8 + frameTime * 0.2;
		
		
		if( this.activePanel ) {
			this.activePanel.afterRun();
		}
		
		this.showNumber( 'ms',  this.debugTime.toFixed(2) );
		this.showNumber( 'fps',  Math.round(1000/this.debugTickAvg) );
		this.showNumber( 'draws', Image.drawCount );
		if( this.impactInstance.game && this.impactInstance.game.entities ) {
			this.showNumber( 'entities', this.impactInstance.game.entities.length );
		}
		Image.drawCount = 0;
	}
}



class DebugPanel {
	active = false
	container = null
	options = []
	panels = []
	label = ''
	name = ''
	
	
	constructor( name, label ) {
		this.name = name;
		this.label = label;
		this.container = ig.$new('div');
		this.container.className = 'ig_debug_panel ' + this.name;
	}
	
	
	toggle( active ) {
		this.active = active;
		this.container.style.display = active ? 'block' : 'none';
	}
	
	
	addPanel( panel ) {
		this.panels.push( panel );
		this.container.appendChild( panel.container );
	}
	
	
	addOption( option ) {
		this.options.push( option );
		this.container.appendChild( option.container );
	}
	
	
	ready(){}
	beforeRun(){}
	afterRun(){}
}



class DebugOption {
	name = ''
	labelName = ''
	className = 'ig_debug_option'
	label = null
	mark = null
	container = null
	active = false
	
	colors = {
		enabled: '#fff',
		disabled: '#444'
	}
	
	
	constructor( name, object, property ) {
		this.name = name;
		this.object = object;
		this.property = property;
		
		this.active = this.object[this.property];
		
		this.container = ig.$new('div');
		this.container.className = 'ig_debug_option';
		
		this.label = ig.$new('span');
		this.label.className = 'ig_debug_label';
		this.label.textContent = this.name;
		
		this.mark = ig.$new('span');
		this.mark.className = 'ig_debug_label_mark';
		
		this.container.appendChild( this.mark );
		this.container.appendChild( this.label );
		this.container.addEventListener( 'click', this.click.bind(this), false );
		
		this.setLabel();
	}
	
	
	setLabel() {
		this.mark.style.backgroundColor = this.active ? this.colors.enabled : this.colors.disabled;
	}
	
	
	click( ev ) {
		this.active = !this.active;
		this.object[this.property] = this.active;
		this.setLabel();
		
		ev.stopPropagation();
		ev.preventDefault();
		return false;
	}
}


export default Debug