var BaseMap = require('../base_map');

var MapboxGL = BaseMap.extend({
  /**
   * Max Zoom is 18
   * @augments ffwdme.Class
   * @constructs
   *
   */

  markerSource: null,

  setupMap: function() {
    mapboxgl.accessToken = this.options.access_token;
    this.map = new mapboxgl.Map({
      container: this.el.attr('id'),
      style: this.options.styleURL,
      center: [this.options.center.lng, this.options.center.lat],
      zoom: 17,
      pitch: 75
    });

    this.map.on('style.load', function () {
      if(!this.options.disableLeafletLocate) {
        this.drawMarkerWithoutRoute({
          point: this.options.center
        });
      }
      this.mapReady();
    }.bind(this));
  },

  hideMarker: function() {
    this.marker && $(this.marker._icon).hide();
  },

  rotateMarker: function(e) {
    this.map.easeTo({
      center: [e.geoposition.coords.longitude, e.geoposition.coords.latitude],
      zoom: this.getZoom(),
      bearing: e.geoposition.coords.heading || this.map.getBearing()
    });
  },

  drawMarkerWithoutRoute: function(e) {

    if (this.inRoutingMode) return;

    var markerLayer;

    if (!this.marker) {
      this.marker = {
        "type": "Point",
        "coordinates": [e.point.lng, e.point.lat]
      };

      this.markerSource = new mapboxgl.GeoJSONSource({
        data: this.marker
      });

      this.map.addSource('gps-point', this.markerSource);

      markerLayer = {
          "id": "gps-point",
          "type": "symbol",
          "source": "gps-point",
          "layout": {
            "icon-image": "marker-15",
            "icon-size": 1.4,
            "icon-rotate": 180
          }
      };

      this.disableMarker || this.map.addLayer(markerLayer);
    } else {
      this.drawMarkerOnMap(e.point.lat, e.point.lng, true, e.geoposition.coords.heading);
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
/*
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
  */
  },

  drawPolylineOnMap: function(route, center){

    var directions = route.directions, len = directions.length, len2, path;

    var point, lnglats = [];
    for (var i = 0; i < len; i++) {
      if (directions[i].path) {
        path = directions[i].path;
        len2 = path.length;
        for (var j = 0; j < len2; j++) {
          lnglats.push([path[j].lng, path[j].lat]);
        }
      }
    }

    if (!this.polylines) {
      this.polylines = {underlay: {}, overlay: {}};

      this.polylines.underlay.source = {
                "type": "geojson",
                "data": this._lnglatsToLineString(lnglats)
      };
      this.polylines.underlay.layer = {
        "id": "polyline-underlay",
        "type": "line",
        "source": "route",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "red",
            "line-width": 8,
            "opacity": 1
        }
      };

      this.polylines.overlay.layer = {
        "id": "polyline-overlay",
        "type": "line",
        "source": "route",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "white",
            "line-width": 4,
            "opacity": 1
        }
      };
      this.map.addSource('route' , this.polylines.underlay.source);
      this.map.addLayer(this.polylines.underlay.layer);
      this.map.addLayer(this.polylines.overlay.layer);
    } else {
      this.polylines.underlay.source.setData(this._lnglatsToLineString(lnglats));
    }

    // zoom the map to the polyline
    if (center && !this.inRouteOverview) this.map.fitBounds(mapboxgl.LatLngBounds.convert(latlngs));
  },

  drawMarkerOnMap: function(lat, lng, center, bearing){
    this.marker.coordinates = [lng, lat];
    this.markerSource.setData(this.marker);
    if (center && !this.inRouteOverview) {
      this.map.easeTo({
        center: this.marker.coordinates,
        zoom: this.getZoom(),
        bearing: bearing || this.map.getBearing()
      });
    } else {
      this.map.fitBounds(this.polylines.overlay.getBounds());
    }
  },

  drawHelpLine: function(rawPos, desiredPos) {


    var lnglats = [
      [rawPos.lng,      rawPos.lat],
      [desiredPos.lng,  desiredPos.lat]
    ];

    if (!this.helpLine) {
      this.helpLine.source = {
        "type": "geojson",
        "data": {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": lnglats
            }
        }
      };
      this.helpLine.layer = {
        "id": "help-line",
        "type": "line",
        "source": "help-line",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "red",
            "line-width": 2,
            "opacity": 0.5
        }
      };

      this.map.addSource('help-line' , this.helpLine.source);
      this.map.addLayer(this.helpLine.layer);
    } else {
      this.helpLine.source.setData(this._lnglatsToLineString(lnglats));
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
  },

  _lnglatsToLineString: function(lnglats) {
    return {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": lnglats
        }
    };
  }

});

module.exports = MapboxGL;
