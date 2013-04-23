var VERSION = '0.0.1', 
    oauth2 = require('oauth').OAuth2,
    querystring = require('qs');

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
Nimble.prototype.refreshToken = function(code, callback) {
  var params = {'grant_type': 'refresh_token'};

  self.oauth.getOAuthAccessToken(code, params, function(err, accessToken, refreshToken, results) {
    if(err) return callback(err);
    
    self.accessToken = accessToken;
    self.refreshToken = refreshToken;
    self.expiresIn = results['expires_in'];
    return callback(null, accessToken, refreshToken, results);
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

  var url = this.baseApi + '/contacts/list/?' + querystring.stringify(params);
  return this.oauth.get(url, this.accessToken, function(err, result, response) {
    return callback(err, JSON.parse(result), response);
  });
}

/**
 * [listContactIds description]
 * @param  {[type]}   params   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.listContactIds = function(params, callback) {
  params = params || {};

  if(params.query) params.query = JSON.stringify(params.query);

  var url = this.baseApi + '/contacts/list/ids?' + querystring.stringify(params);
  return this.oauth.get(url, this.accessToken, function(err, result, response) {
    return callback(err, result, response);
  });
}

/**
 * [getContactsById description]
 * @param  {[type]}   ids      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.getContactsById = function(ids, callback) {
  var params = {},
      _ids = (ids instanceof Array) ? ids.join(',') : ids;

  params['id'] = _ids;
  var url = this.baseApi + '/contacts/detail?' + querystring.stringify(params);
  return this.oauth.get(url, this.accessToken, function(err, result, response) {
    return callback(err, result, response);
  });
}

module.exports = Nimble;


