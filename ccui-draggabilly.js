/***********************************************
* CCUI Draggabilly JavaScript Library
* Authors: https://github.com/torworx/ccui-foundation/blob/master/README.md 
* Compiled At: 2013-10-29 14:49
***********************************************/


( function( window ) {

'use strict';


var document = window.document;
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

function noop() {}



var defView = document.defaultView;

var getStyle = defView && defView.getComputedStyle ?
  function( elem ) {
    return defView.getComputedStyle( elem, null );
  } :
  function( elem ) {
    return elem.currentStyle;
  };



var isElement = ( typeof HTMLElement === 'object' ) ?
  function isElementDOM2( obj ) {
    return obj instanceof HTMLElement;
  } :
  function isElementQuirky( obj ) {
    return obj && typeof obj === 'object' &&
      obj.nodeType === 1 && typeof obj.nodeName === 'string';
  };
var lastTime = 0;
var prefixes = 'webkit moz ms o'.split(' ');

var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;

var prefix;
for( var i = 0; i < prefixes.length; i++ ) {
  if ( requestAnimationFrame && cancelAnimationFrame ) {
    break;
  }
  prefix = prefixes[i];
  requestAnimationFrame = requestAnimationFrame || window[ prefix + 'RequestAnimationFrame' ];
  cancelAnimationFrame  = cancelAnimationFrame  || window[ prefix + 'CancelAnimationFrame' ] ||
                            window[ prefix + 'CancelRequestAnimationFrame' ];
}


if ( !requestAnimationFrame || !cancelAnimationFrame )  {
  requestAnimationFrame = function( callback ) {
    var currTime = new Date().getTime();
    var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
    var id = window.setTimeout( function() {
      callback( currTime + timeToCall );
    }, timeToCall );
    lastTime = currTime + timeToCall;
    return id;
  };

  cancelAnimationFrame = function( id ) {
    window.clearTimeout( id );
  };
}



function draggabillyDefinition( classie, EventEmitter, eventie, getStyleProperty, getSize ) {



var transformProperty = getStyleProperty('transform');

var is3d = !!getStyleProperty('perspective');



function Draggabilly( element, options ) {
  this.element = element;

  this.options = extend( {}, this.options );
  extend( this.options, options );

  this._create();

}


extend( Draggabilly.prototype, EventEmitter.prototype );

Draggabilly.prototype.options = {
};

Draggabilly.prototype._create = function() {
  this.position = {};
  this._getPosition();

  this.startPoint = { x: 0, y: 0 };
  this.dragPoint = { x: 0, y: 0 };

  this.startPosition = extend( {}, this.position );
  var style = getStyle( this.element );
  if ( style.position !== 'relative' && style.position !== 'absolute' ) {
    this.element.style.position = 'relative';
  }

  this.enable();
  this.setHandles();

};


Draggabilly.prototype.setHandles = function() {
  this.handles = this.options.handle ?
    this.element.querySelectorAll( this.options.handle ) : [ this.element ];

  for ( var i=0, len = this.handles.length; i < len; i++ ) {
    var handle = this.handles[i];
    eventie.bind( handle, 'mousedown', this );
    eventie.bind( handle, 'touchstart', this );
    disableImgOndragstart( handle );
  }
};
function noDragStart() {
  return false;
}


var isIE8 = 'attachEvent' in document.documentElement;


var disableImgOndragstart = !isIE8 ? noop : function( handle ) {

  if ( handle.nodeName === 'IMG' ) {
    handle.ondragstart = noDragStart;
  }

  var images = handle.querySelectorAll('img');
  for ( var i=0, len = images.length; i < len; i++ ) {
    var img = images[i];
    img.ondragstart = noDragStart;
  }
};



Draggabilly.prototype._getPosition = function() {
  
  var style = getStyle( this.element );

  var x = parseInt( style.left, 10 );
  var y = parseInt( style.top, 10 );
  this.position.x = isNaN( x ) ? 0 : x;
  this.position.y = isNaN( y ) ? 0 : y;

  this._addTransformPosition( style );
};


Draggabilly.prototype._addTransformPosition = function( style ) {
  if ( !transformProperty ) {
    return;
  }
  var transform = style[ transformProperty ];
  
  if ( transform.indexOf('matrix') !== 0 ) {
    return;
  }
  
  var matrixValues = transform.split(',');
  
  var xIndex = transform.indexOf('matrix3d') === 0 ? 12 : 4;
  var translateX = parseInt( matrixValues[ xIndex ], 10 );
  
  var translateY = parseInt( matrixValues[ xIndex + 1 ], 10 );
  this.position.x += translateX;
  this.position.y += translateY;
};
Draggabilly.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};


Draggabilly.prototype.getTouch = function( touches ) {
  for ( var i=0, len = touches.length; i < len; i++ ) {
    var touch = touches[i];
    if ( touch.identifier === this.pointerIdentifier ) {
      return touch;
    }
  }
};



Draggabilly.prototype.onmousedown = function( event ) {
  this.dragStart( event, event );
};

Draggabilly.prototype.ontouchstart = function( event ) {
  
  if ( this.isDragging ) {
    return;
  }

  this.dragStart( event, event.changedTouches[0] );
};

function setPointerPoint( point, pointer ) {
  point.x = pointer.pageX !== undefined ? pointer.pageX : pointer.clientX;
  point.y = pointer.pageY !== undefined ? pointer.pageY : pointer.clientY;
}


Draggabilly.prototype.dragStart = function( event, pointer ) {
  if ( !this.isEnabled ) {
    return;
  }

  if ( event.preventDefault ) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }

  var isTouch = event.type === 'touchstart';
  this.pointerIdentifier = pointer.identifier;

  this._getPosition();

  this.measureContainment();
  setPointerPoint( this.startPoint, pointer );
  
  this.startPosition.x = this.position.x;
  this.startPosition.y = this.position.y;
  this.setLeftTop();

  this.dragPoint.x = 0;
  this.dragPoint.y = 0;
  this._bindEvents({
    events: isTouch ? [ 'touchmove', 'touchend', 'touchcancel' ] :
      [ 'mousemove', 'mouseup' ],
    node: event.preventDefault ? window : document
  });

  classie.add( this.element, 'is-dragging' );
  this.isDragging = true;

  this.emitEvent( 'dragStart', [ this, event, pointer ] );
  this.animate();
};

Draggabilly.prototype._bindEvents = function( args ) {
  for ( var i=0, len = args.events.length; i < len; i++ ) {
    var event = args.events[i];
    eventie.bind( args.node, event, this );
  }
  
  this._boundEvents = args;
};

Draggabilly.prototype._unbindEvents = function() {
  var args = this._boundEvents;
  
  if ( !args || !args.events ) {
    return;
  }

  for ( var i=0, len = args.events.length; i < len; i++ ) {
    var event = args.events[i];
    eventie.unbind( args.node, event, this );
  }
  delete this._boundEvents;
};

Draggabilly.prototype.measureContainment = function() {
  var containment = this.options.containment;
  if ( !containment ) {
    return;
  }

  this.size = getSize( this.element );
  var elemRect = this.element.getBoundingClientRect();
  var container = isElement( containment ) ? containment :
    typeof containment === 'string' ? document.querySelector( containment ) :
    this.element.parentNode;

  this.containerSize = getSize( container );
  var containerRect = container.getBoundingClientRect();

  this.relativeStartPosition = {
    x: elemRect.left - containerRect.left,
    y: elemRect.top  - containerRect.top
  };
};



Draggabilly.prototype.onmousemove = function( event ) {
  this.dragMove( event, event );
};

Draggabilly.prototype.ontouchmove = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this.dragMove( event, touch );
  }
};


Draggabilly.prototype.dragMove = function( event, pointer ) {

  setPointerPoint( this.dragPoint, pointer );
  this.dragPoint.x -= this.startPoint.x;
  this.dragPoint.y -= this.startPoint.y;

  if ( this.options.containment ) {
    var relX = this.relativeStartPosition.x;
    var relY = this.relativeStartPosition.y;
    this.dragPoint.x = Math.max( this.dragPoint.x, -relX );
    this.dragPoint.y = Math.max( this.dragPoint.y, -relY );
    this.dragPoint.x = Math.min( this.dragPoint.x, this.containerSize.width - relX - this.size.width );
    this.dragPoint.y = Math.min( this.dragPoint.y, this.containerSize.height - relY - this.size.height );
  }

  this.position.x = this.startPosition.x + this.dragPoint.x;
  this.position.y = this.startPosition.y + this.dragPoint.y;

  this.emitEvent( 'dragMove', [ this, event, pointer ] );
};
Draggabilly.prototype.onmouseup = function( event ) {
  this.dragEnd( event, event );
};

Draggabilly.prototype.ontouchend = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this.dragEnd( event, touch );
  }
};


Draggabilly.prototype.dragEnd = function( event, pointer ) {
  this.isDragging = false;

  delete this.pointerIdentifier;
  if ( transformProperty ) {
    this.element.style[ transformProperty ] = '';
    this.setLeftTop();
  }
  this._unbindEvents();

  classie.remove( this.element, 'is-dragging' );

  this.emitEvent( 'dragEnd', [ this, event, pointer ] );

};
Draggabilly.prototype.ontouchcancel = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  this.dragEnd( event, touch );
};



Draggabilly.prototype.animate = function() {
  
  if ( !this.isDragging ) {
    return;
  }

  this.positionDrag();

  var _this = this;
  requestAnimationFrame( function animateFrame() {
    _this.animate();
  });

};


var translate = is3d ?
  function( x, y ) {
    return 'translate3d( ' + x + 'px, ' + y + 'px, 0)';
  } :
  function( x, y ) {
    return 'translate( ' + x + 'px, ' + y + 'px)';
  };


Draggabilly.prototype.setLeftTop = function() {
  this.element.style.left = this.position.x + 'px';
  this.element.style.top  = this.position.y + 'px';
};

Draggabilly.prototype.positionDrag = transformProperty ?
  function() {
    this.element.style[ transformProperty ] = translate( this.dragPoint.x, this.dragPoint.y );
  } : Draggabilly.prototype.setLeftTop;

Draggabilly.prototype.enable = function() {
  this.isEnabled = true;
};

Draggabilly.prototype.disable = function() {
  this.isEnabled = false;
  if ( this.isDragging ) {
    this.dragEnd();
  }
};

return Draggabilly;

}
if ( typeof define === 'function' && define.amd ) {
  
  define( [
      'classie/classie',
      'eventEmitter/EventEmitter',
      'eventie/eventie',
      'get-style-property/get-style-property',
      'get-size/get-size'
    ],
    draggabillyDefinition );
} else {
  
  window.Draggabilly = draggabillyDefinition(
    window.classie,
    window.EventEmitter,
    window.eventie,
    window.getStyleProperty,
    window.getSize
  );
}

})( window );
