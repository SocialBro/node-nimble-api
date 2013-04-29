node-nimble-api
===============

Javascript wrapper for Nimble CRM API

This is a WIP, but currently covers all basic Contacts API methods and Oauth2 authentication process:

- Get authorization URL.

- Request Access Token.

- Automatically refresh token if it has expired.

- Listing Contacts.

- Listing Contacts using the /ids endpoint, only returning the ids (faster).
 
- Utility shortcut methods to find by the main available search fields, both by exact match ("is" operator) and partial match ("contain" operator).

- Search Contacts by id

- Create Contacts

- Update Contacts

- Delete Contacts