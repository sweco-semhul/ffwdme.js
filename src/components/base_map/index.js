var Base = require('../base');

var BaseMap = Base.extend({
  /**
   * Max Zoom is 18
   * @augments ffwdme.Class
   * @constructs
   *
   */
  constructor: function(options) {
    this.base(options);
    this.bindAll(this, 'resize', 'drawRoute', 'drawMarkerWithoutRoute', 'onRouteSuccess', 'navigationOnRoute', 'navigationOffRoute', 'rotateMarker', 'setupMap');

    this.mapReadyCallbacks = [];

    this.setupMap();


  },

  attrAccessible: ['el', 'apiKey'],

  map: null,

  polylines: null,

  helpLine: null,

  marker: null,

  markerIcon: null,

  zoomLevel: 17,

  inRoutingMode: false,

  inRouteOverview: false,

  mapReady: false,

  mapReadyCallbacks: null,

  userZoom: 0,

  mapReady: function() {
    this.setupEventsOnMapReady();

    for (var i = 0; i < this.mapReadyCallbacks.length; i++) {
      this.mapReadyCallbacks[i]();
    }

    this.mapReadyCallbacks = [];

    this.mapReady = true;
  },

  canControlMap: function(component) {
    if (component instanceof ffwdme.components.AutoZoom && this.inRouteOverview) { return false; }
    if (component instanceof ffwdme.components.MapRotator && this.inRouteOverview) { return false; }
    return true;
  },

  setupEventsOnMapReady: function() {
    ffwdme.on('geoposition:update', this.rotateMarker);
    ffwdme.on('geoposition:update', this.drawMarkerWithoutRoute);
    ffwdme.on('navigation:onroute', this.navigationOnRoute);
    ffwdme.on('navigation:offroute', this.navigationOffRoute);
    ffwdme.on('routecalculation:success', this.onRouteSuccess);
    ffwdme.on('routecalculation:success', this.drawRoute);
    ffwdme.on('reroutecalculation:success', this.drawRoute);
  },

  navigationOnRoute: function(e) {
    var p = e.navInfo.position;
    this.removeHelpLine();
    this.drawMarkerOnMap(p.lat, p.lng, true);
  },

  navigationOffRoute: function(e) {
    var p = e.navInfo.positionRaw;
    this.drawMarkerOnMap(p.lat, p.lng, true);
    this.drawHelpLine(e.navInfo.positionRaw, e.navInfo.position);
  },

  removeHelpLine: function() {
    this.helpLine && this.map.removeLayer(this.helpLine);
  },

  changeUserZoom: function(value){
    this.userZoom += value;
  },

  getZoom: function() {
    return this.zoomLevel + this.userZoom;
  },

  setZoom: function(zoom) {
    this.zoomLevel = zoom;
    return this.zoomLevel;
  },

  toggleRouteOverview: function(){
    this.inRouteOverview = !this.inRouteOverview;

    if (this.inRouteOverview){
      this.setMapContainerSize($(window).width(), $(window).height(), 0, 0, 0);
    }
    return this.inRouteOverview;
  }

});

module.exports = BaseMap;
