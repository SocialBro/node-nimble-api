var VERSION = '0.0.1', 
    oauth2 = require('oauth').OAuth2,
    qs = require('qs'),
    _s = require('underscore.string'),
    SEARCH_FIELDS = ["email", "skype id", "twitter", "linkedin", "facebook", "phone", "last name", "street", "city", "state", "zip",  "country", "company name", "title", "name", "first name", "lead source", "lead type", "lead status", "rating",  "address", "tag",  "custom_fields", "record type", "description", "saved_search"];
    //"company last contacted", "created", "updated",

/**
 * 
 */
function Nimble(options) {
  if(!(this instanceof Nimble)) return new Nimble(options);

  this.oauth = new oauth2(options.appId,
                          options.appSecret,
                          'https://api.nimble.com',
                          '/oauth/authorize',
                          '/oauth/token');
  
  this.apiVersion = options.apiVersion || 'v1';
  this.baseApi = 'https://api.nimble.com/api/' + this.apiVersion;
  this.accessToken = options.accessToken;
  this.refreshToken = options.refreshToken;
  this.expiresIn = options.expiresIn;
}

/**
 * [getAuthorizationUrl description]
 * @param  {[type]} params should contain redirect_uri
 * @return {[type]}        [description]
 */
Nimble.prototype.getAuthorizationUrl = function(params) {
  params = params || {};

  if(!params.redirect_uri) return new Error('redirect_uri param is required');  
  params['response_type'] = 'code';

  return this.oauth.getAuthorizeUrl(params);
}

/**
 * [requestToken description]
 * @param  {[type]}   code     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.requestToken = function(code, callback) {
  var params = {'grant_type': 'authorization_code'},
      self = this;

  self.oauth.getOAuthAccessToken(code, params, function(err, accessToken, refreshToken, results) {
    if(err) return callback(err);
    
    self.accessToken = accessToken;
    self.refreshToken = refreshToken;
    self.expiresIn = results['expires_in'];
    return callback(null, accessToken, refreshToken, results);
  });
}

/**
 * [refreshToken description]
 * @param  {[type]}   code     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.doRefreshToken = function(refreshToken, callback) {
  
  if(typeof refreshToken === 'function') {
    callback = refreshToken;
    refreshToken = null;
  }

  var params = {'grant_type': 'refresh_token'},
      self = this,
      _refreshToken = refreshToken || self.refreshToken;

  if(!_refreshToken) return new Error('Impossible refreshing access token, as no refreshToken has been provided / is stored');

  self.oauth.getOAuthAccessToken(_refreshToken, params, function(err, accessToken, refreshToken, results) {
    if(err) return callback(err);
    
    self.accessToken = accessToken;
    self.refreshToken = refreshToken;
    self.expiresIn = results['expires_in'];
    return callback(null, accessToken, refreshToken, results);
  });
}

/**
 * [_get description]
 * @param  {[type]}   url      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype._get = function(url, callback) {
  var self = this,
      resumeRequest = function() {
        return self._get(url, callback);
      };

  self.oauth.get(url, this.accessToken, function(err, result, response) {
    if(err) {
      if(err.statusCode === 401 && self.refreshToken) {
        self.doRefreshToken(self.refreshToken, function(err, accessToken, refreshToken, results) {
          if(err) return callback(err);
          return resumeRequest();
        });
      } else {
        return callback(err);
      }
    } else {
      return callback(null, result, response);
    }
  });
}
/**
 * [_post description]
 * @param  {[type]}   url      [description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype._post = function(url, params, callback) {
  var self = this,
      resumeRequest = function() {
        return self._post(url, params, callback);
      },
      post_data = JSON.stringify(params),
      post_headers = {
       'Content-Type': 'application/x-www-form-urlencoded'
      };

  self.oauth._request("POST", url, post_headers, post_data, self.accessToken, function(err, result, response) {
    if(err) {
      if(err.statusCode === 401 && self.refreshToken) {
        self.doRefreshToken(self.refreshToken, function(err, accessToken, refreshToken, results) {
          if(err) return callback(err);
          return resumeRequest();
        });
      } else {
        return callback(err);
      }
    } else {
      return callback(null, result, response);
    }
  });

}

Nimble.prototype._put = function(url, params, callback) {
  var self = this,
      resumeRequest = function() {
        return self._put(url, params, callback);
      },
      post_data = JSON.stringify(params),
      post_headers = {
       'Content-Type': 'application/x-www-form-urlencoded'
      };

  self.oauth._request("PUT", url, post_headers, post_data, self.accessToken, function(err, result, response) {
    if(err) {
      if(err.statusCode === 401 && self.refreshToken) {
        self.doRefreshToken(self.refreshToken, function(err, accessToken, refreshToken, results) {
          if(err) return callback(err);
          return resumeRequest();
        });
      } else {
        return callback(err);
      }
    } else {
      return callback(null, result, response);
    }
  });

}

/********** REST API **********/

/**
 * [listContacts description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.listContacts = function(params, callback) {
  params = params || {};

  if(params.query) params.query = JSON.stringify(params.query);

  var url = this.baseApi + '/contacts?' + qs.stringify(params);
  return this._get(url, function(err, result, response) {
    if(err) return callback(err);
    return callback(err, JSON.parse(result), response);
  });
}

SEARCH_FIELDS.forEach(function(field) {
  
  Nimble.prototype['findBy' + _s.classify(field)] = function(value, exactly, callback) {
    var query = {};

    query[field] = {};
    
    switch(field) {
      //These ones can't find with contain so no doubt about what operator to use
      case "lead source":
      case "lead type":
      case "lead status":
      case "rating":
      case "tag":
      case "record type":
      case "saved search":
        query[field]["is"] = value;
      break;
      //The rest can either look exactly or just containing the value
      default:
        if(exactly) {
          query[field]["is"] = value;
        } else {
          query[field]["contain"] = value;
        }
      break;

    }

    return this.listContacts({query: query}, callback);
  }

});

/**
 * [listContactIds description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.listContactIds = function(params, callback) {
  params = params || {};

  if(params.query) params.query = JSON.stringify(params.query);

  var url = this.baseApi + '/contacts/ids?' + qs.stringify(params);
  return this._get(url, function(err, result, response) {
    if(err) return callback(err);
    return callback(err, JSON.parse(result), response);
  });
}

/**
 * [findContactsById description]
 * @param  {[type]}   ids      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.findContactsById = function(ids, callback) {
  var _ids = (ids instanceof Array) ? ids.join(',') : ids,
      url = this.baseApi + '/contact/' + _ids;

  return this._get(url, function(err, results, response) {
    if(err) return callback(err);
    return callback(err, JSON.parse(results), response);
  });
}

/**
 * [createContact description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.createContact = function(params, callback) {
  var params = params || {},
      url = this.baseApi + '/contact/';
  return this._post(url, params, function(err, result, response) {
    if(err) return callback(err);
    return callback(null, JSON.parse(result), response);
  });
}

/**
 * [updateContact description]
 * @param  {[type]}   id       [description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.updateContact = function(id, params, callback) {
  if(!id) return callback(new Error('Contact Id is required'));

  var params = params || {},
      url = this.baseApi + '/contact/' + id;

  return this._put(url, params, function(err, result, response) {
    if(err) return callback(err);
    return callback(null, JSON.parse(result), response);
  });
}


module.exports = Nimble;


