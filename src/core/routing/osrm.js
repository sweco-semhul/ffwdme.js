var Base = require('./base');

var OSRM = Base.extend({
  /**
   * Creates a new instance of the OSRM routing service class.
   * When doing so, this object adds itself as the a global handler for route
   * responses.
   *
   * Options:
   * - apiKey
   *
   * @class The class represents a client for the ffwdme routing service
   * using OSRM.
   *
   * @augments ffwdme.Class
   * @constructs
   *
   */
  constructor: function(options) {
    this.base(options);
    this.bindAll(this, 'parse', 'error');

    if(ffwdme.options.OSRM) {
      this.apiKey = ffwdme.options.OSRM.apiKey || '';
      this.BASE_URL = ffwdme.options.OSRM.url || this.BASE_URL;
    }

    if (options.anchorPoint) {
      this.anchorPoint = options.anchorPoint;
      this.direction = this.start;
      this.start = this.anchorPoint;
    }
  },

  /**
   * The base url for the service.
   *
   * @type String
   */
  BASE_URL: 'https://router.project-osrm.org',

  // set via constructor
  apiKey: null,

  modifier: 'fastest',

  routeType: 'car',

  lang: 'en_EN',

  route: null,

  anchorPoint: null,

  direction: null,

  zoom: 18,

  fetch: function() {

    var via = '';

    if (this.direction) {
      via += '&loc=' + [this.direction.lat, this.direction.lng].join('%2C');
    }
    var reqUrl = [
      this.BASE_URL, '/',
      'viaroute?',
      'instructions=true',
      '&alt=false',
      this.apiKey ? '&key=' + this.apiKey : '',
      '&z=', this.zoom,
      '&loc=',
      [
        this.start.lat,
        this.start.lng,
      ].join('%2C'),
      via,
      '&loc=',
      [
        this.dest.lat,
        this.dest.lng
      ].join('%2C')
    ];

    ffwdme.trigger(this.eventPrefix() + ':start', { routing: this });

    ffwdme.utils.XHR.get({
      url: reqUrl.join(''),
      success: this.parse,
      error: this.error,
      callback: null
    });

    return ffwdme;
  },

  error: function(error) {
    this.base(error);
  },

  parse: function(response) {

    if (response.status !== 200 && response.status !== 0) return this.error(response);

    var routeStruct = { directions: [] };
    routeStruct.summary = {
      distance: parseInt(response.route_summary.total_distance, 10),
      duration: parseInt(response.route_summary.total_time, 10)
    };

    var path = ffwdme.Route.decodePolyline(response.route_geometry, 6);

    var instruction, d;
    var instructions = response.route_instructions;

    // we remove the last instruction as it only says "Finish!" in
    // OSRM and has no value for us.
    instructions.pop();

    // OSRM instructions definition
    // [{drive instruction code}, {street name}, {length}, {location index}, {time}, {formated length}, {post-turn direction}, {post-turn azimuth}, {mode}, {pre-turn direction}, {pre-turn azimuth}]
    for (var i = 0, len = instructions.length; i < len; i++) {
      instruction = instructions[i];
      d = {
        street: instruction[1],
        instruction:  instruction[1], // Street name?
        distance:     parseInt(instruction[2], 10),
        duration:     instruction[4] / 1000,
        turnAngle:    instruction[10], // A guess that this should be {pre-turn azimuth}
        turnType:     this.extractTurnType(instruction[0]) // A guess that this should be {pre-turn direction}
      };

      // Path is between this and next instruction
      var nextInstructionIndex = i+1 >= len ? len-1 : i+1;

      d.path = path.slice(instruction[3], instructions[nextInstructionIndex][3] + 1);
      routeStruct.directions.push(d);
    }

    this.route = new ffwdme.Route().parse(routeStruct);

    this.success(response, this.route);
  },

  // Parse OSRM driving direction types
  extractTurnType: function(t) {
    switch (parseInt(t, 10)) {
      case 1: // continue (go straight)
        return 'C';
      case 2: // turn slight right
        return 'TSLR';
      case 3: // turn right
        return 'TR';
      case 4: // turn sharp right
        return 'TSHR';
      case 5: // U-turn
        return 'TU';
      case 6: // turn sharp left
        return 'TSHL';
      case 7: // turn left
        return 'TL';
      case 8: // turn slight left
        return 'TSLL';
      case 9: // sub destination reached
        return;
      case 10: // continue (go straight)
        return 'C';
      case 11:
      case 12: // roundabout
        return;
      case 15: // destination reached
        return;
      default:
        return;
    }
  }

});

module.exports = OSRM;
