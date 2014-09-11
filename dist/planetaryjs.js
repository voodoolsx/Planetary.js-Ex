/*! Planetary.js v1.1.1
 *  Copyright (c) 2013 Brandon Tilley
 *
 *  Released under the MIT license
 *  Date: 2014-05-18T17:34:29.246Z
 */

	var cityData = [];
	$.getJSON("GeoServlet", function (response) {
		cityData=response;

		var myScript2 = document.createElement("script");
				myScript2.type = "text/javascript";
				myScript2.src = "./js/rotatingGlobe.js";
				document.body.appendChild(myScript2);
	});

(function (root, factory) {


	if (typeof define === 'function' && define.amd) {
	define(['d3', 'topojson'], function(d3, topojson) {
		return (root.planetaryjs = factory(d3, topojson, root));
	});
	} else if (typeof exports === 'object') {
	module.exports = factory(require('d3'), require('topojson'));
	} else {
	root.planetaryjs = factory(root.d3, root.topojson, root);
	}

}(this, function(d3, topojson, window) {
	'use strict';

	var originalPlanetaryjs = null;
	if (window) originalPlanetaryjs = window.planetaryjs;
	var plugins = [];
	var doDrawLoop = function(planet, canvas, hooks) {
	d3.timer(function() {
		if (planet.stopped) {
		return true;
		}

		planet.context.clearRect(0, 0, canvas.width, canvas.height);
		for (var i = 0; i < hooks.onDraw.length; i++) {
		hooks.onDraw[i]();
		}
	});

	};

	var initPlugins = function(planet, localPlugins) {
	// Add the global plugins to the beginning of the local ones
	for (var i = plugins.length - 1; i >= 0; i--) {
		localPlugins.unshift(plugins[i]);
	}

	// Load the default plugins if none have been loaded so far
	if (localPlugins.length === 0) {
		if (planetaryjs.plugins.earth)
		planet.loadPlugin(planetaryjs.plugins.earth());
		if (planetaryjs.plugins.pings)
		planet.loadPlugin(planetaryjs.plugins.pings());
	}

	for (i = 0; i < localPlugins.length; i++) {
		localPlugins[i](planet);
	}
	};

	var runOnInitHooks = function(planet, canvas, hooks) {
	// onInit hooks can be asynchronous if they take a parameter;
	// iterate through them one at a time
	if (hooks.onInit.length) {

		var completed = 0;
		var doNext = function(callback) {
		var next = hooks.onInit[completed];

		if (next.length) {
			next(function() {
			completed++;
			callback();
			});
		} else {
			next();
			completed++;
			setTimeout(callback, 0);
		}
		};
		var check = function() {
		if (completed >= hooks.onInit.length) doDrawLoop(planet, canvas, hooks);
		else doNext(check);
		};
		doNext(check);
	} else {
		doDrawLoop(planet, canvas, hooks);
	}

	};

	var startDraw = function(planet, canvas, localPlugins, hooks) {
	planet.canvas = canvas;
	planet.context = canvas.getContext('2d');

	if (planet.stopped !== true) {
		initPlugins(planet, localPlugins);
	}
	planet.stopped = false;
	runOnInitHooks(planet, canvas, hooks);
	};

	var planetaryjs = {
	plugins: {},

	noConflict: function() {
		window.planetaryjs = originalPlanetaryjs;
		return planetaryjs;
	},

	loadPlugin: function(plugin) {
		plugins.push(plugin);
	},

	planet: function() {

		var localPlugins = [];
		var hooks = {
		onInit: [],
		onDraw: [],
		onStop: []
		};

		var planet = {
		plugins: {},

		draw: function(canvas) {
			startDraw(planet, canvas, localPlugins, hooks);
		},

		onInit: function(fn) {
			hooks.onInit.push(fn);
		},

		onDraw: function(fn) {
			hooks.onDraw.push(fn);
		},

		onStop: function(fn) {
			hooks.onStop.push(fn);
		},

		loadPlugin: function(plugin) {
			localPlugins.push(plugin);
		},

		stop: function() {
			planet.stopped = true;
			for (var i = 0; i < hooks.onStop.length; i++) {
			hooks.onStop[i](planet);
			}
		},

		withSavedContext: function(fn) {
			if (!this.context) {
			throw new Error("No canvas to fetch context for");
			}

			this.context.save();
			fn(this.context);
			this.context.restore();
		}
		};

		planet.projection = d3.geo.orthographic().clipAngle(90);

		planet.path = d3.geo.path().projection(planet.projection);

		return planet;
	}
	};

	planetaryjs.plugins.topojson = function(config) {
	return function(planet) {
		planet.plugins.topojson = {};

		planet.onInit(function(done) {

		if (config.world) {
			planet.plugins.topojson.world = config.world;
			setTimeout(done, 0);
		} else {

			var file = config.file || 'https://github.com/BinaryMuse/planetary.js/releases/download/v1.1.1/world-110m.json';

			d3.json(file, function(err, world) {
			if (err) {
				//alert(file);
				throw new Error("Could not load JSON " + file);
			}

			planet.plugins.topojson.world = world;

			done();
			});
		}
		});
	};
	};

	planetaryjs.plugins.oceans = function(config) {
	return function(planet) {
		planet.onDraw(function() {
		planet.withSavedContext(function(context) {
			context.beginPath();
			planet.path.context(context)({type: 'Sphere'});

			context.fillStyle = config.fill || 'black';
			context.fill();
		});


		});
	};
	};

	planetaryjs.plugins.land = function(config) {
	return function(planet) {
		var land = null;

		planet.onInit(function() {
		var world = planet.plugins.topojson.world;
		land = topojson.feature(world, world.objects.land);
		});

		planet.onDraw(function() {

		planet.withSavedContext(function(context) {
			context.beginPath();
			planet.path.context(context)(land);

			if (config.fill !== false) {
			context.fillStyle = config.fill || 'white';
			context.fill();
			}

			if (config.stroke) {
			if (config.lineWidth) context.lineWidth = config.lineWidth;
			context.strokeStyle = config.stroke;
			context.stroke();
			}
		});
		});
	};
	};

	planetaryjs.plugins.borders = function(config) {
	return function(planet) {

		var borders = null;
		var borderFns = {
		internal: function(a, b) {
			return a.id !== b.id;
		},
		external: function(a, b) {
			return a.id === b.id;
		},
		both: function(a, b) {
			return true;
		}
		};

		planet.onInit(function() {
		var world = planet.plugins.topojson.world;
		var countries = world.objects.countries;
		var type = config.type || 'internal';
		borders = topojson.mesh(world, countries, borderFns[type]);
		});

		planet.onDraw(function() {
		planet.withSavedContext(function(context) {
			context.beginPath();
			planet.path.context(context)(borders);
			context.strokeStyle = config.stroke || 'gray';
			if (config.lineWidth) context.lineWidth = config.lineWidth;
			context.stroke();
		});
		});
	};
	};

	planetaryjs.plugins.earth = function(config) {
	config = config || {};
	var topojsonOptions = config.topojson || {};
	var oceanOptions = config.oceans || {};
	var landOptions = config.land || {};
	var bordersOptions = config.borders || {};

	return function(planet) {
		planetaryjs.plugins.topojson(topojsonOptions)(planet);
		planetaryjs.plugins.oceans(oceanOptions)(planet);
		planetaryjs.plugins.land(landOptions)(planet);
		planetaryjs.plugins.borders(bordersOptions)(planet);
	};
	};





///////////////////********************************ping*****************///////////////////


	planetaryjs.plugins.pings = function(config) {
	var pings = [];
	config = config || {};

	var addPing = function(lng, lat, options) {
		options = options || {};
		options.color = options.color || config.color || 'white';
		options.angle = options.angle || config.angle || 5;
		options.ttl   = options.ttl   || config.ttl   || 2000;
		var ping = { time: new Date(), options: options };
		if (config.latitudeFirst) {
		ping.lat = lng;
		ping.lng = lat;
		} else {
		ping.lng = lng;
		ping.lat = lat;
		}
		pings.push(ping);
	};

	var addAllPing = function(options) {


		options = options || {};
		options.color = options.color || config.color || 'white';
		options.angle = options.angle || config.angle || 5;
		options.ttl   = options.ttl   || config.ttl   || 2000;
		for (var i=0;i<cityData.length;i++){
			var ping = { time: new Date(), options: options };
			if (config.latitudeFirst) {
			ping.lat = cityData[i].longitude;
			ping.lng = cityData[i].latitude;
			} else {
			ping.lng = cityData[i].longitude;
			ping.lat = cityData[i].latitude;
			}
			pings.push(ping);
		}


	};


	var drawPings = function(planet, context, now) {
		var newPings = [];
		for (var i = 0; i < pings.length; i++) {
		var ping = pings[i];
		var alive = now - ping.time;
		if (alive < ping.options.ttl) {
			newPings.push(ping);
			drawPing(planet, context, now, alive, ping);
		}
		}
		pings = newPings;
	};

	var drawPing = function(planet, context, now, alive, ping) {
		var alpha = 1;
		//alive = 900;
		var color = d3.rgb(ping.options.color);
		if(alive>700&&alive<1900){
		   color = "rgba(40,60,200,1)";
		}

		else{
			color = "white";
		}

		context.strokeStyle = color;
		var circle = d3.geo.circle().origin([ping.lng, ping.lat])
		.angle(alive / ping.options.ttl * ping.options.angle - 0)();


		context.beginPath();

		planet.path.context(context)(circle);
		context.stroke();

	};

	return function (planet) {
		planet.plugins.pings = {
		add: addAllPing
		};

		planet.onDraw(function() {
		var now = new Date();
		planet.withSavedContext(function(context) {
			drawPings(planet, context, now);
		});
		});
	};
	};

/*****************************ping*****************///////////////////



	planetaryjs.plugins.zoom = function (options) {
	options = options || {};
	var noop = function() {};
	var onZoomStart = options.onZoomStart || noop;
	var onZoomEnd   = options.onZoomEnd   || noop;
	var onZoom      = options.onZoom      || noop;
	var afterZoom   = options.afterZoom   || noop;
	var startScale  = options.initialScale;
	var scaleExtent = options.scaleExtent || [50, 2000];

	return function(planet) {
		planet.onInit(function() {
		var zoom = d3.behavior.zoom()
			.scaleExtent(scaleExtent);

		if (startScale !== null && startScale !== undefined) {
			zoom.scale(startScale);
		} else {
			zoom.scale(planet.projection.scale());
		}

		zoom
			.on('zoomstart', onZoomStart.bind(planet))
			.on('zoomend', onZoomEnd.bind(planet))
			.on('zoom', function() {
			onZoom.call(planet);
			planet.projection.scale(d3.event.scale);
			afterZoom.call(planet);
			});
		d3.select(planet.canvas).call(zoom);
		});
	};
	};

	planetaryjs.plugins.drag = function(options) {
	options = options || {};
	var noop = function() {};
	var onDragStart = options.onDragStart || noop;
	var onDragEnd   = options.onDragEnd   || noop;
	var onDrag      = options.onDrag      || noop;
	var afterDrag   = options.afterDrag   || noop;

	return function(planet) {

		planet.onInit(function() {
		var drag = d3.behavior.drag()
			.on('dragstart', onDragStart.bind(planet))
			.on('dragend', onDragEnd.bind(planet))
			.on('drag', function() {
			onDrag.call(planet);
			var dx = d3.event.dx;
			var dy = d3.event.dy;
			var rotation = planet.projection.rotate();
			var radius = planet.projection.scale();
			var scale = d3.scale.linear()
				.domain([-1 * radius, radius])
				.range([-90, 90]);
			var degX = scale(dx);
			var degY = scale(dy);
			rotation[0] += degX;
			rotation[1] -= degY;
			if (rotation[1] > 90)   rotation[1] = 90;
			if (rotation[1] < -90)  rotation[1] = -90;
			if (rotation[0] >= 180) rotation[0] -= 360;
			planet.projection.rotate(rotation);
			afterDrag.call(planet);
			});
		d3.select(planet.canvas).call(drag);


		var mouseEve = function(){
			var pos =[0, 0];
			var canvas = document.getElementById("globe");
			pos = d3.mouse(canvas);
			var px = pos[0];
			var py = pos[1];

			var cood = [0,0];
			cood = planet.projection.invert(pos);
			var cx = cood[0];
			var cy = cood[1];

			var zoom = planet.projection.scale()/100.0;


			//**************///////////

			var city = "";
			for (var i=0;i<cityData.length;i++){
				var diff = Math.sqrt( Math.pow(cx-cityData[i].longitude,2) + Math.pow(cy-cityData[i].latitude,2));
				if(	diff<5){
					this.style.cursor="pointer";
					city = cityData[i].name;
					planet.plugins.autorotate.pause();
					var tip = document.getElementById("tip").style;
					tip.display = "inherit";
					var pcood = [0,0];
					pcood = planet.projection([cityData[i].longitude,cityData[i].latitude]);

					var width = (cityData[i].name.length)*25;

					tip.left = (pcood[0]+(0.2*(document.body.clientWidth)) - width/2) + "px";
					tip.top = pcood[1]+70+ "px";
					tip.WebkitAnimation = "fadeInDown 0.5s";

					tip.width = width+"px";

					document.getElementById("tip").innerHTML = cityData[i].name;
					document.getElementById("tip_a").href = cityData[i].link;
					break;
				}
			}
			if(city===""){
				planet.plugins.autorotate.resume();
				var tip = document.getElementById("tip").style;
				this.style.cursor="move";
				if(tip.display!=="none"){
					tip.WebkitAnimation = "fadeOutUp 0.3s forwards";
					setTimeout(function(){tip.display="none";},200);
				}
			}
		};



		d3.select(planet.canvas).on('mousemove', mouseEve);
			d3.select(planet.canvas).on('mouseover', mouseEve);
		});
	};
	};

	return planetaryjs;
}));
