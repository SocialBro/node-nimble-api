var VERSION = '0.0.8', 
    oauth2 = require('./utils/oauth2').OAuth2,
    qs = require('qs'),
    _s = require('underscore.string'),
    SEARCH_FIELDS = ["email", "skype id", "twitter", "linkedin", "facebook", "phone", "last name", "street", "city", "state", "zip",  "country", "company name", "title", "name", "first name", "lead source", "lead type", "lead status", "rating",  "address", "tag",  "custom_fields", "record type", "description", "saved_search"];
    //"company last contacted", "created", "updated",

require('date-utils');

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
  this.redirect_uri = options.redirect_uri;
}

/**
 * Generates the authorization url for authentication process STEP B
 * http://nimble.readthedocs.org/en/latest/obtaining_key/#authorization-process-overview
 * 
 * @param  {Object} params should contain redirect_uri
 */
Nimble.prototype.getAuthorizationUrl = function(params) {
  params = params || {};

  if(!params.redirect_uri) return new Error('redirect_uri param is required');  
  this.redirect_uri = params.redirect_uri;
  params['response_type'] = 'code';

  return this.oauth.getAuthorizeUrl(params);
}

/**
 * Performs authentication token request as a POST using the code sent
 * to the redirect_uri. (STEP E)
 * http://nimble.readthedocs.org/en/latest/obtaining_key/#authorization-process-overview
 *
 * We need to have available the same redirect_uri that is provided in step B for this step.
 * This can be provided:
 * A) In the constructor
 * B) Using the same Nimble object for getAuthorizationUrl and requestToken, as the getAuthorizationUrl function
 * assigns this value
 * 
 * @param  {String}   code     Authorization Grant Code received at the redirect_uri
 * @param  {Function} callback 
 */
Nimble.prototype.requestToken = function(code, callback) {
  var params = 
    {
      'grant_type': 'authorization_code',
      'redirect_uri': this.redirect_uri
    }, 
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
 * Refreshes the authorization token in case it has expired.
 * You can provide the refreshToken received from Nimble or let the wrapper
 * use the refreshToken provided to the constructor.
 * 
 * @param  {String}   refreshToken   Refresh Token provided by Nimble
 * @param  {Function} callback 
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
 * Wrapper to perform a GET request handling automatically any possible 
 * error due to token expiration. The wrapper will automatically perform
 * a refreshToken request in case we receive an expired token error.
 * 
 * @param  {String}   url      Url to perform the GET request
 * @param  {Function} callback
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
 * Wrapper to perform a POST request handling automatically any possible 
 * error due to token expiration. The wrapper will automatically perform
 * a refreshToken request in case we receive an expired token error.
 * 
 * @param  {String}   url      Url to perform the POST request
 * @param  {Object}   params   Object containing the params to be sent as body
 * @param  {Function} callback
 */
Nimble.prototype._post = function(url, params, callback) {
  var self = this,
      resumeRequest = function() {
        return self._post(url, params, callback);
      },
      post_data = JSON.stringify(params),
      post_headers = {
       'Content-Type': 'application/json'
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

/**
 * Wrapper to perform a PUT request handling automatically any possible 
 * error due to token expiration. The wrapper will automatically perform
 * a refreshToken request in case we receive an expired token error.
 * 
 * @param  {String}   url      Url to perform the PUT request
 * @param  {Object}   params   Object containing the params to be sent as body
 * @param  {Function} callback
 */
Nimble.prototype._put = function(url, params, callback) {
  var self = this,
      resumeRequest = function() {
        return self._put(url, params, callback);
      },
      put_data = JSON.stringify(params),
      put_headers = {
       'Content-Type': 'application/json'
      };

  self.oauth._request("PUT", url, put_headers, put_data, self.accessToken, function(err, result, response) {
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
 * Wrapper to perform a DELETE request handling automatically any possible 
 * error due to token expiration. The wrapper will automatically perform
 * a refreshToken request in case we receive an expired token error.
 * 
 * @param  {String}   url      Url to perform the DELETE request
 * @param  {Object}   params   Object containing the params to be sent as body
 * @param  {Function} callback
 */
Nimble.prototype._delete = function(url, params, callback) {
  var self = this,
      resumeRequest = function() {
        return self._delete(url, params, callback);
      },
      delete_data = JSON.stringify(params),
      delete_headers = {
       'Content-Type': 'application/json'
      };

  self.oauth._request("DELETE", url, delete_headers, delete_data, self.accessToken, function(err, result, response) {
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


/** CONTACTS **/

/**
 * Performs contacts listing.
 * http://nimble.readthedocs.org/en/latest/contacts/basic/list.html
 * @param  {Object}   params   params for the contacts listing
 * @param  {Function} callback
 */
Nimble.prototype.findContacts = function(params, callback) {
  params = params || {};

  if(params.query) params.query = JSON.stringify(params.query);

  var url = this.baseApi + '/contacts?' + qs.stringify(params);
  return this._get(url, function(err, result, response) {
    if(err) return callback(err);
    
    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}
/*
  For each one of the available search fields, we define a shortcut method findByFIELD.
  These methods receive an exactly parameter that tells if the search is to be made with the
  "is" operator, or, when available, the "contain" operator.

  http://nimble.readthedocs.org/en/latest/contacts/basic/search.html#available-search-fields

  TODO: Allow search fields "company last contacted", "created" and "updated".
 */
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
      //The rest can either find exact match or just containing the value
      default:
        if(exactly) {
          query[field]["is"] = value;
        } else {
          query[field]["contain"] = value;
        }
      break;

    }

    return this.findContacts({query: query}, callback);
  }

});

/**
 * Performs contacts listing using the /ids endpoint, where only
 * ids will be returned.
 *
 * http://nimble.readthedocs.org/en/latest/contacts/basic/list.html
 * @param  {Object}   params   params for the contacts listing
 * @param  {Function} callback
 */
Nimble.prototype.findContactIds = function(params, callback) {
  params = params || {};

  if(params.query) params.query = JSON.stringify(params.query);

  var url = this.baseApi + '/contacts/ids?' + qs.stringify(params);
  return this._get(url, function(err, result, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/**
 * Gets contacts by their id.
 * May receive a comma separated list of ids, a single id, or an array of ids
 *
 * http://nimble.readthedocs.org/en/latest/contacts/basic/details.html
 * @param  {String}   ids      string id, comma separated list of ids, or ids array
 * @param  {Function} callback
 */
Nimble.prototype.findContactsById = function(ids, callback) {
  if(!ids) return callback(new Error('Contact ids required'));

  var _ids = (ids instanceof Array) ? ids.join(',') : ids,
      url = this.baseApi + '/contact/' + _ids;

  return this._get(url, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/**
 * Creates contacts
 *
 * http://nimble.readthedocs.org/en/latest/contacts/basic/create.html
 * @param  {Object}   params   fields for the contact
 * @param  {Function} callback
 */
Nimble.prototype.createContact = function(params, callback) {
  var params = params || {},
      url = this.baseApi + '/contact/';
  return this._post(url, params, function(err, result, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(null, res, response);
  });
}

/**
 * Updates contacts
 *
 * http://nimble.readthedocs.org/en/latest/contacts/basic/update.html
 * @param  {String}   id       id of the contact to update
 * @param  {Object}   params   params to update
 * @param  {Function} callback
 */
Nimble.prototype.updateContact = function(id, params, callback) {
  if(!id) return callback(new Error('Contact id is required'));

  var params = params || {},
      url = this.baseApi + '/contact/' + id;

  return this._put(url, params, function(err, result, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(null, res, response);
  });
}

/**
 * Deletes contacts
 * May receive a comma separated list of ids, a single id, or an array of ids
 *
 * http://nimble.readthedocs.org/en/latest/contacts/basic/delete.html
 * @param  {String}   ids      string id, comma separated list of ids, or ids array
 * @param  {Function} callback
 */
Nimble.prototype.deleteContact = function(ids, callback) {
  if(!ids) return callback(new Error('Contact ids required'));
  
  var _ids = (ids instanceof Array) ? ids.join(',') : ids,
      url = this.baseApi + '/contact/' + _ids;

  return this._delete(url, {}, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/** NOTES **/

/**
 * Gets notes by their id.
 *
 * http://nimble.readthedocs.org/en/latest/contacts/notes/show.html 
 * @param  {String}   id      string note id
 * @param  {Function} callback
 */
Nimble.prototype.showNote = function(id, callback) {
  if(!id) return callback(new Error('Note id is required'));

  var url = this.baseApi + '/contacts/notes/' + id;

  return this._get(url, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/**
 * List contact notes.
 *
 * http://nimble.readthedocs.org/en/latest/contacts/notes/show.html 
 * @param  {String}   id      string note id
 * @param  {Function} callback
 */
Nimble.prototype.listContactNotes = function(id, callback) {
  if(!id) return callback(new Error('Contact id is required'));

  var url = this.baseApi + '/contacts/' + id + '/notes';

  return this._get(url, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/**
 * Creates a note for the contacts contained in params.contacts_ids
 *
 * http://nimble.readthedocs.org/en/latest/contacts/notes/create.html
 * @param  {Object}   params containing the required params for notes creation: contacts_ids, note, and note_preview
 * @param  {Function} callback
 */
Nimble.prototype.createNote = function(params, callback) {
  var params = params || {};

  if(!params.contact_ids) return callback(new Error('Contacts ids required'));
  if(!params.note) return callback(new Error('Note required'));
  if(!params.note_preview) return callback(new Error('Note preview required'));

  var url = this.baseApi + '/contacts/notes/';
  return this._post(url, params, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

/**
 * Updates a note
 *
 * http://nimble.readthedocs.org/en/latest/contacts/notes/update.html
 * @param  {String}   id       Note id 
 * @param  {Object}   params   params containing the required params for notes update: contacts_ids, note, and note_preview
 * @param  {Function} callback [description]
 */
Nimble.prototype.updateNote = function(id, params, callback) {
  if(!id) return callback(new Error('Note id is required'));

  var params = params || {},
      url = this.baseApi + '/contacts/notes/' + id;

  return this._put(url, params, function(err, result, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(null, res, response);
  });
}

/**
 * Deletes a note
 *
 * http://nimble.readthedocs.org/en/latest/contacts/notes/delete.html
 * @param  {String}   id       Note id
 * @param  {Function} callback
 */
Nimble.prototype.deleteNote = function(id, callback) {
  if(!id) return callback(new Error('Note id is required'));

  var url = this.baseApi + '/contacts/notes/' + id;

  return this._delete(url, {}, function(err, result, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(null, res, response);
  });
}

/**
 * Creates a new task
 * As the due_date must have the format 'YYYY-MM-DD HOURS:MINUTES' we try to
 * perform a conversion in case the string provided does not match the required format.
 * 
 * https://nimble.readthedocs.org/en/latest/activities/tasks/create.html
 * @param  {[Object]}   params   params containing the required param for task creation: subject
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Nimble.prototype.createTask = function(params, callback) {
  var params = params || {};

  if(!params.subject) return callback(new Error('Subject required'));
  if(params.due_date) {
    try {
      var auxDate = new Date(params.due_date);
      params.due_date = auxDate.toFormat('YYYY-MM-DD HH24:MI');
    }catch(e) {
      return callback(e);
    }    
  }
  var url = this.baseApi + '/activities/task/';
  return this._post(url, params, function(err, results, response) {
    if(err) return callback(err);

    var res;
    try {
      res = JSON.parse(result);
    } catch(e) {
      err = e;
    }

    return callback(err, res, response);
  });
}

module.exports = Nimble;


