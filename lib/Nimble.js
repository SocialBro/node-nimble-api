var VERSION = '0.0.1', 
    oauth2 = require('oauth').OAuth2,
    http = require('http');

function Nimble(options) {
  if(!(this instanceof Nimble)) return new Nimble(options);
 
  this.oauth = new oauth2(options.appId,
                          options.appSecret,
                          'https://nimble.api.com',
                          '/oauth/authorize',
                          '/oauth/access_token');
}

/**
 * [getAuthorizationUrl description]
 * @param  {[type]} params should contain redirect_uri
 * @return {[type]}        [description]
 */
Nimble.prototype.getAuthorizationUrl = function(params) {
  params['response_type'] = 'code';

  return this.oauth.getAuthorizeUrl(params);
}



module.exports = Nimble;


