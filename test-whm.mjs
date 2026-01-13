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

async function testWHM() {
  try {
    // 1. Test WHM connection
    console.log('1. Testing WHM connection...');
    const version = await client.get('/json-api/version', {
      params: { api_version: 1 }
    });
    console.log('WHM Version:', version.data);

    // 2. List domains on this account
    console.log('\n2. Listing domains...');
    const domains = await client.get('/execute/DomainInfo/list_domains', {
      params: {
        cpanel_jsonapi_user: WHM_USERNAME,
        cpanel_jsonapi_apiversion: 3,
      }
    });
    console.log('Domains:', JSON.stringify(domains.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWHM();
