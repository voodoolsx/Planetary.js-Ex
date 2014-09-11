//$(document).ready(function () {


	var canvas = document.getElementById('globe');

	window.onresize = function () {
		document.getElementsByTagName("h6")[1].innerHTML = document.body.clientWidth + "x" + document.body.clientHeight;
	};


	//  var planet = planetaryjs.planet();
	//  // Loading this plugin technically happens automatically,
	//  // but we need to specify the path to the `world-110m.json` file.
	//  planet.loadPlugin(planetaryjs.plugins.earth({
	//    topojson: { file: '/world-110m.json' }
	//  }));
	//  // Scale the planet's radius to half the canvas' size
	//  // and move it to the center of the canvas.
	//  planet.projection
	//    .scale(canvas.width / 2)
	//    .translate([canvas.width / 2, canvas.height / 2]);
	//  planet.draw(canvas);


	var globe = planetaryjs.planet();

	// Load our custom `autorotate` plugin; see below.

	globe.loadPlugin(autorotate(1));

	// The `earth` plugin draws the oceans and the land; it's actually
	// a combination of several separate built-in plugins.
	//
	// Note that we're loading a special TopoJSON file
	// (world-110m-withlakes.json) so we can render lakes.
	globe.loadPlugin(planetaryjs.plugins.earth({
		topojson: {
			file: './js/world-110m-withlakes.json'
		},

		// oceans:   { fill:   'rgba(0,0,100,.5)' },
		oceans: {
			fill: 'transparent'
		},
		land: {
			fill: 'rgba(69,198,68,.8)'
		},

		borders: {
			stroke: 'rgba(0,0,0,.5)'
		}
	}));
	// Load our custom `lakes` plugin to draw lakes; see below.
	globe.loadPlugin(lakes({
		//fill: 'white'
	}));
	// The `pings` plugin draws animated pings on the globe.
	globe.loadPlugin(planetaryjs.plugins.pings());
	// The `zoom` and `drag` plugins enable
	// manipulating the globe with the mouse.

	globe.loadPlugin(planetaryjs.plugins.drag({
		// Dragging the globe should pause the
		// automatic rotation until we release the mouse.
		onDragStart: function () {
			this.plugins.autorotate.pause();
		},
		onDragEnd: function () {
			this.plugins.autorotate.resume();
		}
	}));
	//h1.);
	if (document.body.clientWidth < 1024) {
		canvas.width = 700;
		globe.projection.scale(350).translate([350, 400]).rotate([0, -10, 0]);
	} else {
		canvas.width = 1000;
		globe.projection.scale(500).translate([500, 400]).rotate([100, -40, 0]);
		globe.loadPlugin(planetaryjs.plugins.zoom({
			scaleExtent: [200, 800]
		}));
	}
	canvas.height = 900;
	// Set up the globe's initial scale, offset, and rotation.


	// Every few hundred milliseconds, we'll draw another random ping.
	var colors = ['red', 'pink', 'yellow', 'orange', 'cyan', 'purple'];
	var lat = [40.40, 37.47, 18.59, 31.12, -22.55, 51.30];
	var lng = [-73.56, -122.25, 72.50, 121.30, -43.12, -0.08];

	setInterval(function () {
//		for (var i = 0; i < lat.length; i++) {
//			globe.plugins.pings.add(lng[i], lat[i], {
//				color: colors[i],
//				ttl: 1000,
//				angle: 1.5
//			});
//
//		}

			globe.plugins.pings.add({
				color: 'blue',
				ttl: 1000,
				angle: 1.5
			});



	}, 100);

	// Special code to handle high-density displays (e.g. retina, so	me phones)
	// In the future, Planetary.js will handle this by itself (or via a plugin).
	if (window.devicePixelRatio == 2) {
		canvas.width = 800;
		canvas.height = 350;
		context = canvas.getContext('2d');
		context.scale(2, 2);
	}
	// Draw that globe!

	globe.draw(canvas);

	// This plugin will automatically rotate the globe around its vertical
	// axis a configured number of degrees every second.
	function autorotate(degPerSec) {
		// Planetary.js plugins are functions that take a `planet` instance
		// as an argument...
		return function (planet) {
			var lastTick = null;
			var paused = false;
			planet.plugins.autorotate = {
				pause: function () {
					paused = true;
				},
				resume: function () {
					paused = false;
				}
			};
			// ...and configure hooks into certain pieces of its lifecycle.
			planet.onDraw(function () {
				////////////////////////////////////



				/////////////////////////////////////
				if (paused || !lastTick) {
					lastTick = new Date();
				} else {
					var now = new Date();
					var delta = now - lastTick;
					// This plugin uses the built-in projection (provided by D3)
					// to rotate the globe each time we draw it.
					var rotation = planet.projection.rotate();
					rotation[0] += degPerSec * delta / 1000;
					if (rotation[0] >= 180) rotation[0] -= 360;
					planet.projection.rotate(rotation);
					lastTick = now;
				}
			});
		};
	};

	// This plugin takes lake data from the special
	// TopoJSON we're loading and draws them on the map.
	function lakes(options) {
		options = options || {};
		var lakes = null;

		return function (planet) {
			planet.onInit(function () {
				// We can access the data loaded from the TopoJSON plugin
				// on its namespace on `planet.plugins`. We're loading a custom
				// TopoJSON file with an object called "ne_110m_lakes".
				var world = planet.plugins.topojson.world;
				lakes = topojson.feature(world, world.objects.ne_110m_lakes);
			});

			planet.onDraw(function () {
				planet.withSavedContext(function (context) {
					context.beginPath();
					planet.path.context(context)(lakes);
					context.fillStyle = options.fill || 'black';
					context.fill();
				});
			});
		};
	};

//});
