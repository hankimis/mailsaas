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

async function test() {
  try {
    // Try creating a session URL using the WHM API directly
    console.log('1. Trying WHM create_user_session API...');
    
    const result = await client.get('/json-api/create_user_session', {
      params: {
        api_version: 1,
        user: 'hankim@mymatiltalk.com',
        service: 'webmaild',
        locale: 'ko',
      }
    });
    
    console.log('Result:', JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error('Error 1:', error.response?.data || error.message);
  }
  
  try {
    // Alternative: Try creating a session via cpanel API
    console.log('\n2. Trying remote_create_session...');
    
    const result2 = await client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_module: 'Session',
        cpanel_jsonapi_func: 'remote_create_session',
        cpanel_jsonapi_apiversion: 3,
        user: 'hankim',
        domain: 'mymatiltalk.com',
        service: 'webmail',
      }
    });
    
    console.log('Result:', JSON.stringify(result2.data, null, 2));

  } catch (error) {
    console.error('Error 2:', error.response?.data || error.message);
  }
}

test();
