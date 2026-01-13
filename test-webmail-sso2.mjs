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
    // Try WHM API directly for creating session token
    console.log('1. Getting session URL for email user...');
    
    // Method: create_user_session (WHM API)
    const session = await client.get('/json-api/create_user_session', {
      params: {
        api_version: 1,
        user: WHM_USERNAME,
        service: 'webmaild',
      }
    });
    console.log('Session result:', JSON.stringify(session.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getWebmailSession();
