/**
 * ffwdme.js - Turn by turn navigation in the browser.
 * @version v0.4.1
 * @copyright Copyright (c) 2011-2015 Christian Bäuerlein, Silvia Hundegger; 2012-2015 flinc GmbH
 * @license MIT
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Geolocation = ffwdme.components.Base.extend({

  constructor: function(options) {
    this.base(options);
    this.bindAll(this, 'navigationOnRoute',
                       'onGeopositionUpdate',
                       'navigationOffRoute',
                       'watchHtml5Position');
    ffwdme.on('navigation:onroute', this.navigationOnRoute);
    ffwdme.on('navigation:offroute', this.navigationOffRoute);
    ffwdme.on('geoposition:update', this.onGeopositionUpdate);
    navigator.geolocation.watchPosition(this.watchHtml5Position, this.errorWatchHtml5Position);

    this.render();
  },

  classes: 'ffwdme-widget-container ffwdme-grid-w8 ffwdme-grid-h5',

  html5GeoUpdateCounter: 0,

  ffwdmeGeoUpdateCounter: 0,

  ffwdmeOnRouteCounter: 0,

  ffwdmeOffRouteCounter: 0,

  currentAccuracy: 0,

  currentHeading: 0,

  errorWatchHtml5Position: function(){
    //error?
  },

  watchHtml5Position: function(position){
    this.html5GeoUpdateCounter += 1;
    this.label('.ffwdme-components-html5GeoUpdateCounter',this.html5GeoUpdateCounter);
  },

  navigationOnRoute: function(e) {
    this.ffwdmeOnRouteCounter += 1;
    this.label('.ffwdme-components-ffwdmeOnRouteCounter',this.ffwdmeOnRouteCounter);
  },

  navigationOffRoute: function(e) {
    this.ffwdmeOffRouteCounter += 1;
    this.label('.ffwdme-components-ffwdmeOffRouteCounter',this.ffwdmeOffRouteCounter);
  },

  onGeopositionUpdate: function(e) {
    this.ffwdmeGeoUpdateCounter += 1;

    heading = e.geoposition.coords.heading;
    if (heading) this.currentHeading = Number((heading).toFixed(2));

    accuracy = e.geoposition.coords.accuracy;
    if (accuracy) this.currentAccuracy = Number((accuracy).toFixed(2));

    this.label('.ffwdme-components-ffwdmeGeoUpdateCounter',this.ffwdmeGeoUpdateCounter);
    this.label('.ffwdme-components-currentAccuracy',this.currentAccuracy);
    this.label('.ffwdme-components-currentHeading',this.currentHeading);
  },

  make: function(){
    this.base();
    var content = [
      '<div class="ffwdme-components-geolocation-debug ffwdme-components-label-small">',
        '<div>Html5 geo update: <span class="ffwdme-components-html5GeoUpdateCounter">-</span></div>',
        '<div>ffwdme geo update: <span class="ffwdme-components-ffwdmeGeoUpdateCounter">-</span></div>',
        '<div>Accuracy: <span class="ffwdme-components-currentAccuracy">-</span></div>',
        '<div>Heading: <span class="ffwdme-components-currentHeading">-</span></div>',
        '<div>On Route: <span class="ffwdme-components-ffwdmeOnRouteCounter">-</span></div>',
        '<div>Off Route: <span class="ffwdme-components-ffwdmeOffRouteCounter">-</span></div>',
      '</div>'
    ].join('');


    $(this.el).addClass('ffwdme-components-container').html(content);
    return this;
  },

  label: function(cssClass, val) {
    return this.accessor(cssClass, val);
  },

  accessor: function(selector, val) {
    var el = this.$(selector);
    if (typeof val === 'undefined') return el.html();
    el.html(val);
    return el;
  }
});

module.exports = Geolocation;

},{}],2:[function(require,module,exports){
var NavInfo = ffwdme.components.Base.extend({

  constructor: function(options) {
    this.base(options);

    for (var i = 0; i < this.nodeIds.length; i++) {
      this.nodes[this.nodeIds[i]] = $('#' + this.nodeIds[i]);
    }

    this.nodes.ratioCompletedDirectionProgress  = $("#ratio-completed-direction-progress");
    this.nodes.ratioCompletedRouteProgress      = $("#ratio-completed-route-progress");

    $('#nav-info-trigger').click(function(){
      $('#nav-info').toggleClass('hidden');
      $('#routing').addClass('hidden');
    });

    this.bindAll(this, 'navigationOnRoute', 'navigationOffRoute');
    ffwdme.on('navigation:onroute', this.navigationOnRoute);
    ffwdme.on('navigation:offroute', this.navigationOffRoute);
  },

  nodes: {},

  nodeIds: [
    "street", "turnAngle", "distanceToNextDirection", "distanceToDestination", "timeToDestination", "timeToNextDirection", "ratioCompletedDirection", "ratioCompletedRoute"
  ],

  navigationOnRoute: function(e) {
    var p = e.navInfo.position, id;
    try {
      for (var i = 0; i < this.nodeIds.length; i++) {
        id = this.nodeIds[i];
        this.nodes[id].html(e.navInfo.nextDirection[id] || e.navInfo[id]);
      }

      this.nodes.ratioCompletedDirectionProgress.css('width', (e.navInfo.ratioCompletedDirection * 100) + "%");
      this.nodes.ratioCompletedRouteProgress.css('width', (e.navInfo.ratioCompletedRoute * 100) + "%");
    } catch(e) {
      console.warn("Error while updating the nodes");
      console.dir(e);
    }
  },

  navigationOffRoute: function(e) {
    console.warn(ffwdme.navigation.routePointCounter + ": NO NEAREST POINT # " + ffwdme.navigation.offRouteCounter + " -> distance: " + e.navInfo.nearest.distance + " m");
  }
});

module.exports = NavInfo;

},{}],3:[function(require,module,exports){
var Routing = ffwdme.components.Base.extend({

  constructor: function(options) {
    this.base(options);
    this.bindAll(this, 'start', 'error', 'success', 'calculateRouteByForm', 'fetchCombination');

    $('#load-combination').click(this.fetchCombination);
    $('#calc-route-by-form').click(this.calculateRouteByForm);

    var self = this;
    $('#player-start').click(function(){ self.player.start(); });
    $('#player-pause').click(function(){ self.player.pause(); });
    $('#player-reset').click(function(){ self.player.reset(); });

    $('#routing-trigger').click(function(){
      $('#routing').toggleClass('hidden');
      $('#nav-info').addClass('hidden');
    });

    ffwdme.on('routecalculation:start', this.start);
    ffwdme.on('routecalculation:error', this.error);
    ffwdme.on('routecalculation:success', this.success);
  },

  player: null,

  start: function(data) {
    console.info('routing started');
  },

  error: function(data) {
    console.error('routing FAILED');
  },

  success: function(response) {
    console.info('routing SUCCESSFULL!');
    console.dir(response);
    ffwdme.navigation.setRoute(response.route).start();
  },

  fetchCombination: function() {
    var values = $('#select-combination').val().split(';');
    var trackId = values[0];

    $('#custom-route-start-lat').val(values[1]);
    $('#custom-route-start-lng').val(values[2]);
    $('#custom-route-dest-lat').val(values[3]);
    $('#custom-route-dest-lng').val(values[4]);

    try {
      this.player = new ffwdme.debug.geoprovider.PlayerLocal({
        // dieburg industriegebiet
        //id: '2011-03-18-16-48-12'
        id: trackId
      });
      $('#geoprovider-track').text(trackId);
    } catch(e) {
      $('#geoprovider-track').text('Could not fetch the recorded track!: ' + trackId);
    }
  },

  calculateRouteByForm: function() {
    var slat = document.getElementById('custom-route-start-lat').value;
    var slng = document.getElementById('custom-route-start-lng').value;
    var dlat = document.getElementById('custom-route-dest-lat').value;
    var dlng = document.getElementById('custom-route-dest-lng').value;

    var route = new ffwdme.routingService({
      start: { lat: slat, lng: slng },
      dest:  { lat: dlat, lng: dlng }
    }).fetch();
  }
});

module.exports = Routing;

},{}],4:[function(require,module,exports){
var Player = ffwdme.Class.extend({

  /**
   *  The player is an abstract class to play back tracks of gps positions.
   *  While it can't manipulate the native navigator.geolocation interface of
   *  the browser it uses the event model of ffwdme and triggers the geoposition:update event.
   *
   *  The recorded are supposed to provide real time simulation of
   *  navigation use cases on the desktop routes recorded with mobile devices.
   *
   *  In order to use it you must inherit from this class and implement all abstract methods.
   *  Remember: You can NOT use this class directly - only its subclasses.
   *
   *  @augments ffwdme.Class
   *  @constructs
   */
  constructor: function(options) {
  },

  /**
   *  The track that is replayed by the player.
   *  @type {ffwdme.geoprovider.Track}
   */
  track: null,

  /**
   *  The current index of the points list on the track.
   *  @type {Integer}
   */
  currentIndex: null,

  /**
   *  The current point of the track that will be passed as geo position
   *  on the next update.
   *  @type {Object}
   */
  currentPoint: null,

  /**
   *  The timeout id of the currently running loop.
   *  @type {Integer}
   */
  watchId: null,

  /**
   *  An abstract method that needs to be overwritten by inheriting classes.
   *  The load method must be implemented in order to take completely care
   *  of loading a recorded track for the player.
   */
  load: function() {},

  /**
   *  This method iterates through the points of the track and
   *  updates the geoposition of ffwdme.
   */
  loop: function() {
    this.currentPoint = this.track.points[this.currentIndex];
    var nextPoint = this.track.points[this.currentIndex+1];

    if (this.currentPoint && nextPoint) {
      var timeToWait = nextPoint.timestampRelative - this.currentPoint.timestampRelative;
      var data = {
        geoposition: this.currentPoint,
        point: new ffwdme.LatLng(this.currentPoint.coords.latitude, this.currentPoint.coords.longitude)
      };
      ffwdme.geolocation.last = data;
      ffwdme.trigger('geoposition:update', data);
      this.watchId = setTimeout(this.bind(this.loop, this), timeToWait);
      this.currentIndex++;
    }
  },

  /**
   *  Starts the playback of the track.
   */
  start: function() {
    if (this.currentIndex === null) {
      this.currentIndex = 0;
    }
    this.loop();
  },

  /**
   *  Pauses the playback of the track.
   */
  pause: function() {
    clearTimeout(this.watchId);
  },

  /**
   *  Resets the playback of the track. This means next time you start it will
   *  start from the beginning.
   */
  reset: function() {
    this.currentIndex = 0;
  },

  /**
   *  Stop the playback of the track (same as pause + reset).
   */
  stop: function() {
    this.pause();
    this.reset();
  },

  /**
   *  @void
   */
  getCurrentPosition: function(successCallback, errorCallback, options) {
    //TODO: Implement for support of the html5 geoposition api
  },

  /**
   *  @return {Integer} The watchId
   */
  watchPosition: function(successCallback, errorCallback, options) {
    //TODO: Implement for support of the html5 geoposition api
  },

  clearWatch: function(watchId) {
    //TODO: Implement for support of the html5 geoposition api
  }

});

module.exports = Player;

},{}],5:[function(require,module,exports){
var Player = require('./player');
var Track = require('./track');

var PlayerLocal = Player.extend({
  /**
   *  A geoprovider player that loads recorded tracks from the hard disk.
   *  It uses ajax and the ffwdme development server, so it will probably only work
   *  on the localhost.
   *
   *  @augments ffwdme.geoprovider.Player
   *  @constructs
   *
   *  @params {Integer} id
   *    The id of the track to load from the server.
   */
  constructor: function(options){
    this.base(options);
    this.id = options.id;

    this.load();
  },

  /**
   *  The base url to load the files from.
   *  @type {String}
   */
  BASE_URL: "/recorded_routes/",

  /**
   *  The id of the track to load (which is actually the file name,
   *  which itself is actually a timestamp)
   *
   *  @type {String}
   */
  id: null,

  /**
   *  Loads the track from the server.
   */
  load: function() {
    var url = this.BASE_URL + this.id + '.json', self = this;

    $.getJSON(url, function(data) {
      self.track = new Track();
      self.track.points = data.track.points;
    });
  }
});

module.exports = PlayerLocal;

},{"./player":4,"./track":7}],6:[function(require,module,exports){
var Track = require('./track');

var Recorder = ffwdme.Class.extend({
  /**
   *  The recorder is an abstract class to record tracks of gps positions.
   *
   *  The recorded tracks can be used together with the player for real time simulation of
   *  navigation use cases on the desktop routes recorded with mobile devices.
   *
   *  In order to use it you must inherit from this class and implement all abstract methods.
   *  Remember: You can NOT use this class directly - only subclasses.
   *
   *  @augments ffwdme.Class
   *  @constructs
   */
  constructor: function() {},

  /**
   *  The track that is recorded by the recorder.
   *  @type {ffwdme.geoprovider.Track}
   */
  track: null,

  recording: false,

  /**
   *  Callback when a new geoposition is recieved.
   */
  onUpdate: function(position) {
    this.track.add(position.geoposition);
  },

  /**
   *  Starts the recording of a track.
   */
  start: function() {
    this.track = new Track();
    this.onUpdate = this.bind(this.onUpdate, this);
    ffwdme.on('geoposition:update', this.onUpdate);
    this.recording = true;
    return this;
  },

  /**
   *  Stops the recording of the track.
   */
  stop: function() {
    ffwdme.off('geoposition:update', this.onUpdate);
    this.recording = false;
    return this;
  },

  /**
   *  An abstract method that needs to be overwritten by inheriting classes.
   *  The save method must be implemented in order to take completely care
   *  of persisting the recorded track.
   */
  save: function() {}

});

module.exports = Recorder;

},{"./track":7}],7:[function(require,module,exports){
var Track = ffwdme.Class.extend({
/**
 * @augments ffwdme.Class
 * @constructs
 *
 */
  constructor: function(){
    this.points = [];
  },

  /**
   *  The geo points of this track.
   *  A point has the same interface as a HTML5 geolocation api Position object.
   *  (see http://dev.w3.org/geo/api/spec-source.html#position), except on additional
   *  attribute "timestampRelative" which represents the time in milliseconds passed since the
   *  beginning of the track.
   */
  points: null,

  /**
   *  The first timestamp of the track (in milliseconds) that was passed
   *  by the geolocation interface.
   *  @type {Integer}
   */
  startTime: null,

  /**
   *  Appends a position object to the track.
   *  If using the navigator.geolocation interface it will be
   *  a html5 geoposition Position object.
   *
   *  @type {Position}
   */
  add: function(geoposition) {
    if (!this.points.length) {
      this.startTime = geoposition.timestamp;
    }

    var geoAttr = Track.locationAttributes,
        newLocation = {
          coords:             {},
          timestamp:          geoposition.timestamp,
          timestampRelative:  geoposition.timestamp - this.startTime
        };

    for (var i = 0, len = geoAttr.length; i < len; i++) {
      try {
        newLocation.coords[geoAttr[i]] = geoposition.coords[geoAttr[i]];
      } catch (e) {
        console.info("error while working with: " + geoAttr[i]);
      }
    }

    this.points.push(newLocation);
    return this;
  },

  /**
   *  Returns a JSON representation of the track.
   *
   *  @return {String}
   */
  toJSON: function() {
    var obj = {
      track: {
        points: this.points
      }
    };

    return JSON.stringify(obj);
  },

  /*
   *  Parses the track information from a JSON string.
   *
   *  @param {String} jsonStr
   *    A string representation of a track.
   */
  parseJSON: function(jsonStr) {
    if (!jsonStr) return;
    var trackObj = JSON.parse(jsonStr);
    this.points = trackObj.track.points;
  }
},
{
  /**
   *  The attributes from a html5 position object that should be copied into a new track point.
   *  @type {Array}
   */
  locationAttributes: [ "latitude", "longitude", "altitude", "accuracy", "altitudeAccuracy", "heading", "speed" ]
});

module.exports = Track;

},{}],8:[function(require,module,exports){
var GeoProviderPlayerLocal = require('./geoprovider/player_local');
var GeoProviderRecorder = require('./geoprovider/recorder');
var ComponentGeolocation = require('./components/geolocation');
var ComponentNavInfo = require('./components/nav_info');
var ComponentRouting = require('./components/routing');

;(function(ffwdme){
  ffwdme.debug = {
    geoprovider: {
      PlayerLocal: GeoProviderPlayerLocal,
      Recorder: GeoProviderRecorder
    },
    components: {
      Geolocation: ComponentGeolocation,
      NavInfo: ComponentNavInfo,
      Routing: ComponentRouting
    }
  };
})(ffwdme);

},{"./components/geolocation":1,"./components/nav_info":2,"./components/routing":3,"./geoprovider/player_local":5,"./geoprovider/recorder":6}]},{},[8]);
