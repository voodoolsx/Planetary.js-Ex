Zoom Plugin
===========

The `zoom` plugin allows for modifying the planet's projection's scale with the mouse wheel.

API
---

**`planetaryjs.plugins.zoom([config])`**

Valid keys for `config` are:

* `initialScale`: the value to initialize the [`d3.behavior.zoom`](https://github.com/mbostock/d3/wiki/Zoom-Behavior) object's scale to; defaults to the scale of the planet's projection at the time the planet is initialized
* `scaleExtent`: the value to use for the `d3.behavior.zoom` object's `scaleExtent` property, which defines how far in and out the planet can be zoomed; defaults to `[50, 2000]`
* `onZoomStart`, `onZoomEnd`, `onZoom`, `afterZoom`: hooks to the `d3.behavior.zoom` object's `zoomstart`, `zoomend`, and `zoom` events; each defaults to a no-op. `onZoom` fires at the start of the `zoom` event, `afterZoom` at the end. The planet instance is available as `this` inside the each of the functions.

<div class='ui raised segment'>
<div class='ui red ribbon label'>JavaScript</div>

```javascript
planetaryjs.plugins.zoom({
  scaleExtent: [200, 1000],
  onZoom: function() {
    console.log("The planet was zoomed!", this, d3.event);
  }
});
```
</div>
