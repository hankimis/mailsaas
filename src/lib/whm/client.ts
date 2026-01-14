import axios, { AxiosInstance } from 'axios';

// ============================================
// WHM API Client
// ============================================

interface WHMConfig {
  host: string;
  port: number;
  username: string;
  apiToken: string;
  ssl: boolean;
}

interface WHMResponse<T = unknown> {
  metadata: {
    version: number;
    reason: string;
    result: number;
    command: string;
  };
  data?: T;
}

class WHMClient {
  private client: AxiosInstance;
  private config: WHMConfig;

  constructor(config?: Partial<WHMConfig>) {
    this.config = {
      host: config?.host || process.env.WHM_HOST!,
      port: config?.port || parseInt(process.env.WHM_PORT || '2087'),
      username: config?.username || process.env.WHM_USERNAME!,
      apiToken: config?.apiToken || process.env.WHM_API_TOKEN!,
      ssl: config?.ssl ?? (process.env.WHM_SSL === 'true'),
    };

    const baseURL = `${this.config.ssl ? 'https' : 'http'}://${this.config.host}:${this.config.port}`;

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `whm ${this.config.username}:${this.config.apiToken}`,
      },
      timeout: 30000,
    });
  }

  // Generic API call
  private async call<T>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<WHMResponse<T>> {
    const response = await this.client.get(`/json-api/${endpoint}`, {
      params: {
        api_version: 1,
        ...params,
      },
    });

    return response.data;
  }

  // ============================================
  // Account Management
  // ============================================

  /**
   * Create a new cPanel account for a company
   */
  async createAccount(params: {
    domain: string;
    username: string;
    password: string;
    plan?: string;
    contactEmail: string;
  }) {
    const response = await this.call<{ rawout: string }>('createacct', {
      domain: params.domain,
      username: params.username,
      password: params.password,
      plan: params.plan || 'default',
      contactemail: params.contactEmail,
      featurelist: 'default',
      quota: 1000, // 1GB default
      maxsub: 100,
      maxpark: 0,
      maxaddon: 0,
      bwlimit: 'unlimited',
      hasshell: 0,
      cgi: 1,
    });

    return response;
  }

  /**
   * Suspend a cPanel account
   */
  async suspendAccount(username: string, reason = 'Payment failed') {
    return this.call('suspendacct', {
      user: username,
      reason,
    });
  }

  /**
   * Unsuspend a cPanel account
   */
  async unsuspendAccount(username: string) {
    return this.call('unsuspendacct', {
      user: username,
    });
  }

  /**
   * Terminate a cPanel account
   */
  async terminateAccount(username: string, keepDNS = false) {
    return this.call('removeacct', {
      user: username,
      keepdns: keepDNS ? 1 : 0,
    });
  }

  /**
   * Get account summary
   */
  async getAccountSummary(username: string) {
    return this.call('accountsummary', {
      user: username,
    });
  }

  // ============================================
  // Domain Management
  // ============================================

  /**
   * Add addon domain to cPanel account
   */
  async addAddonDomain(params: {
    cpanelUser: string;
    domain: string;
    subdomain?: string;
    dir?: string;
  }) {
    const subdomain = params.subdomain || params.domain.replace(/\./g, '_');
    const dir = params.dir || `/${params.domain}`;

    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'AddonDomain',
        cpanel_jsonapi_func: 'addaddondomain',
        cpanel_jsonapi_apiversion: 2,
        newdomain: params.domain,
        subdomain: subdomain,
        dir: dir,
      },
    });

    return response.data;
  }

  /**
   * List addon domains for a cPanel account
   */
  async listAddonDomains(cpanelUser: string) {
    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: cpanelUser,
        cpanel_jsonapi_module: 'AddonDomain',
        cpanel_jsonapi_func: 'listaddondomains',
        cpanel_jsonapi_apiversion: 2,
      },
    });

    return response.data;
  }

  /**
   * Check if domain exists in cPanel account
   */
  async domainExists(params: {
    cpanelUser: string;
    domain: string;
  }) {
    try {
      const result = await this.listAddonDomains(params.cpanelUser);
      const domains = result?.cpanelresult?.data || [];
      return domains.some((d: { domain: string }) => d.domain === params.domain);
    } catch {
      return false;
    }
  }

  // ============================================
  // Email Account Management
  // ============================================

  /**
   * Create email account via cPanel UAPI (through WHM)
   */
  async createEmailAccount(params: {
    cpanelUser: string;
    email: string;
    password: string;
    quota?: number;
    domain: string;
  }) {
    const [localPart] = params.email.split('@');

    // Use WHM's cpanel API gateway
    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'add_pop',
        cpanel_jsonapi_apiversion: 3,
        email: localPart,
        password: params.password,
        quota: params.quota || 1000, // MB
        domain: params.domain,
      },
    });

    return response.data;
  }

  /**
   * Delete email account
   */
  async deleteEmailAccount(params: {
    cpanelUser: string;
    email: string;
    domain: string;
  }) {
    const [localPart] = params.email.split('@');

    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'delete_pop',
        cpanel_jsonapi_apiversion: 3,
        email: localPart,
        domain: params.domain,
      },
    });

    return response.data;
  }

  /**
   * Change email password
   */
  async changeEmailPassword(params: {
    cpanelUser: string;
    email: string;
    password: string;
    domain: string;
  }) {
    const [localPart] = params.email.split('@');

    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'passwd_pop',
        cpanel_jsonapi_apiversion: 3,
        email: localPart,
        password: params.password,
        domain: params.domain,
      },
    });

    return response.data;
  }

  /**
   * Get email quota usage
   */
  async getEmailQuota(params: {
    cpanelUser: string;
    email: string;
    domain: string;
  }) {
    const [localPart] = params.email.split('@');

    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'get_pop_quota',
        cpanel_jsonapi_apiversion: 3,
        email: `${localPart}@${params.domain}`,
      },
    });

    return response.data;
  }

  /**
   * List all email accounts for a domain
   */
  async listEmailAccounts(params: {
    cpanelUser: string;
    domain: string;
  }) {
    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: params.cpanelUser,
        cpanel_jsonapi_module: 'Email',
        cpanel_jsonapi_func: 'list_pops_with_disk',
        cpanel_jsonapi_apiversion: 3,
        domain: params.domain,
      },
    });

    return response.data;
  }

  // ============================================
  // Webmail Session Management
  // ============================================

  /**
   * Create webmail session for auto-login (SSO)
   */
  async createWebmailSession(params: {
    login: string;
    domain: string;
  }) {
    const response = await this.client.get('/json-api/cpanel', {
      params: {
        api_version: 1,
        cpanel_jsonapi_user: this.config.username,
        cpanel_jsonapi_module: 'Session',
        cpanel_jsonapi_func: 'create_webmail_session_for_mail_user',
        cpanel_jsonapi_apiversion: 3,
        login: params.login,
        domain: params.domain,
      },
    });

    return response.data;
  }

  // ============================================
  // DNS Management
  // ============================================

  /**
   * Get DNS zone for a domain
   */
  async getDNSZone(domain: string) {
    return this.call('dumpzone', {
      domain,
    });
  }

  /**
   * Add DNS record
   */
  async addDNSRecord(params: {
    domain: string;
    name: string;
    type: string;
    value: string;
    ttl?: number;
    priority?: number;
  }) {
    const recordParams: Record<string, string | number> = {
      domain: params.domain,
      name: params.name,
      type: params.type,
      address: params.value,
      ttl: params.ttl || 3600,
    };

    if (params.type === 'MX' && params.priority !== undefined) {
      recordParams.priority = params.priority;
      recordParams.exchange = params.value;
      delete recordParams.address;
    }

    return this.call('addzonerecord', recordParams);
  }

  // ============================================
  // Server Info
  // ============================================

  /**
   * Get server version
   */
  async getVersion() {
    return this.call('version');
  }

  /**
   * Get server load
   */
  async getLoadAvg() {
    return this.call('loadavg');
  }

  /**
   * List all accounts
   */
  async listAccounts() {
    return this.call('listaccts');
  }
}

// Export singleton instance
export const whmClient = new WHMClient();

// Export class for custom configurations
export { WHMClient };
export type { WHMConfig, WHMResponse };
