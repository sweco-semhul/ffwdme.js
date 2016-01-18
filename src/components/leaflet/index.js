var BaseMap = require('../base_map');

var Leaflet = BaseMap.extend({
  /**
   * Max Zoom is 18
   * @augments ffwdme.Class
   * @constructs
   *
   */

  setupMap: function() {
    Leaflet.defineLeafletExtensions();
    var destination = new L.LatLng(this.options.center.lat, this.options.center.lng);

    this.map = new L.Map(this.el.attr('id'), {
      attributionControl: false,
      zoomControl: false
    });

    L.tileLayer(this.options.tileURL, {
      minZoom: 10,
      maxZoom: 18,
    }).addTo(this.map);

    if(!this.options.disableLeafletLocate) {
      this.map.locate({setView: true, maxZoom: 17});
    }

    this.mapReady();
  },

  hideMarker: function() {
    this.marker && $(this.marker._icon).hide();
  },

  rotateMarker: function(e) {
    var heading = e.geoposition.coords.heading;
    heading && this.marker && this.marker.setIconAngle(heading);
  },

  drawMarkerWithoutRoute: function(e) {
    if (this.inRoutingMode) return;

    var markerIcon;

    if (!this.marker) {
      markerIcon = new L.Icon({
        iconUrl: ffwdme.defaults.imageBaseUrl + 'leaflet/map_marker.png',
        shadowUrl: ffwdme.defaults.imageBaseUrl + 'leaflet/map_marker_shadow.png',
        iconSize: new L.Point(40, 40),
        shadowSize: new L.Point(40, 40),
        iconAnchor: new L.Point(20, 20),
        popupAnchor: new L.Point(-3, -76)
      });

      this.marker = new L.Compass(e.point, { icon: markerIcon });
      this.disableMarker || this.map.addLayer(this.marker);
    } else {
      this.drawMarkerOnMap(e.point.lat, e.point.lng, true);
    }
  },

  drawRoute: function(e) {
    if (!this.mapReady) {
      var self = this;
      this.mapReadyCallbacks.push(function() {
        self.removeHelpLine();
        self.drawPolylineOnMap(e.route, false);
      });
      return;
    }


    this.removeHelpLine();
    this.drawPolylineOnMap(e.route, false);
  },

  onRouteSuccess: function(e) {
    this.inRoutingMode = true;

    var destination = e.route.destination();

    var finishMarkerIcon = new L.Icon({
      iconUrl: ffwdme.defaults.imageBaseUrl + 'leaflet/map_marker_finish.png',
      shadowUrl: ffwdme.defaults.imageBaseUrl + 'leaflet/map_marker_shadow.png',
      iconSize: new L.Point(32, 32),
      shadowSize: new L.Point(32, 32),
      iconAnchor: new L.Point(16, 32),
      popupAnchor: new L.Point(-3, -76)
    });

    this.finishMarker = new L.Marker(destination, { icon: finishMarkerIcon });
    this.map.addLayer(this.finishMarker);
  },

  drawPolylineOnMap: function(route, center){
    var directions = route.directions, len = directions.length, len2, path;

    var point, latlngs = [];
    for (var i = 0; i < len; i++) {
      if (directions[i].path) {
        path = directions[i].path;
        len2 = path.length;
        for (var j = 0; j < len2; j++) {
          latlngs.push(new L.LatLng(path[j].lat, path[j].lng));
        }
      }
    }

    if (!this.polylines) {
      this.polylines = {};

      this.polylines.underlay = new L.Polyline(latlngs, { color: 'red', opacity: 1, weight: 8  });
      this.polylines.overlay  = new L.Polyline(latlngs, { color: 'white', opacity: 1, weight: 4 });

      this.map.addLayer(this.polylines.underlay);
      this.map.addLayer(this.polylines.overlay);
    } else {
      this.polylines.underlay.setLatLngs(latlngs);
      this.polylines.overlay.setLatLngs(latlngs);
    }

    // zoom the map to the polyline
    if (center && !this.inRouteOverview) this.map.fitBounds(new L.LatLngBounds(latlngs));
  },

  drawMarkerOnMap: function(lat, lng, center){
    var loc = new L.LatLng(lat, lng);
    this.marker.setLatLng(loc);
    if (center && !this.inRouteOverview) {
      this.map.setView(loc, this.getZoom());
    } else {
      this.map.fitBounds(this.polylines.overlay.getBounds());
    }
  },

  drawHelpLine: function(rawPos, desiredPos) {
    var latlngs = [
      new L.LatLng(rawPos.lat,      rawPos.lng),
      new L.LatLng(desiredPos.lat,  desiredPos.lng)
    ];

    if (!this.helpLine) {
      this.helpLine = new L.Polyline(latlngs, { color: 'red', opacity: 0.5, weight: 2  });
      this.map.addLayer(this.helpLine);
    } else {
      this.helpLine.setLatLngs(latlngs);
      this.map.addLayer(this.helpLine);
    }
  },

  setMapContainerSize: function(width, height, top, left, rotate){
    this.el && this.el.animate({ rotate: rotate + 'deg' });
    this.el.css({
      width: width + 'px',
      height: height + 'px',
      top: top,
      left: left
    });
    if (this.map) this.map._onResize();
  }

}, {
  defineLeafletExtensions: function() {

    // see https://github.com/CloudMade/Leaflet/issues/386
    L.Compass = L.Marker
    .extend({

      setIconAngle: function (iconAngle) {
        this.options.iconAngle = iconAngle;
        this.update();
      },

      _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);

        var iconAngle = this.options.iconAngle;

        if (iconAngle) {
          this._icon.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(pos) + ' rotate(' + iconAngle + 'deg)';
        }
      }
    });

  }
});

module.exports = Leaflet;
