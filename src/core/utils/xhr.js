/**
 * @class
 *
 */
var XHR = {

  get: function(options) {
    this._request(options);
  },

  _request: function(options) {
    var onSuccess = options.success || function() {},
        onError = options.error || function() {},
        method = options.method || 'GET';

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
        if(xmlhttp.status == 200){
          onSuccess(this._parseResponse(xmlhttp));
       } else {
          onError(xmlhttp);
       }
      }
    }.bind(this);

    xmlhttp.open(method, options.url, true);
    xmlhttp.send();
  },

  _parseResponse: function(xmlhttp) {
    var contentType = xmlhttp.getResponseHeader('Content-Type');
    if(contentType && contentType.indexOf('application/json') !== -1) {
      try {
        return JSON.parse(xmlhttp.responseText);
      } catch (e) {
        return xmlhttp.responseText
      }
    } else {
      return xmlhttp.responseText;
    }
  }

};

module.exports = XHR;
