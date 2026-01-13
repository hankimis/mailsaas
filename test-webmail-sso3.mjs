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
    // Method: cpanel UAPI Webmail::get_session_for_user
    console.log('1. Getting webmail session token...');
    
    const session = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Webmail',
        cpanel_jsonapi_func: 'get_session_for_user',
        cpanel_jsonapi_apiversion: 3,
        user: 'hankim',
        domain: 'mymatiltalk.com',
      }
    });
    console.log('Session result:', JSON.stringify(session.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getWebmailSession();
