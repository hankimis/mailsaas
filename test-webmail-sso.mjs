import axios from 'axios';

const WHM_HOST = 'host51.registrar-servers.com';
const WHM_PORT = 2087;
const WHM_USERNAME = 'mymakurv';
const WHM_API_TOKEN = 'D7K6HCLJUCWUUSPZSZDPOO8C5OS93OOI';

const client = axios.create({
  baseURL: `https://${WHM_HOST}:${WHM_PORT}`,
  headers: {
    Authorization: `whm ${WHM_USERNAME}:${WHM_API_TOKEN}`,
  },
  timeout: 30000,
});

async function getWebmailSession() {
  try {
    // cPanel API to create a webmail session
    // This creates a one-time login URL for webmail
    console.log('1. Trying to create webmail session...');
    
    // Method 1: create_user_session
    const session = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Session',
        cpanel_jsonapi_func: 'create_webmail_session_for_mail_user',
        cpanel_jsonapi_apiversion: 3,
        login: 'testuser@mymatiltalk.com',
        domain: 'mymatiltalk.com',
      }
    });
    console.log('Session result:', JSON.stringify(session.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getWebmailSession();
