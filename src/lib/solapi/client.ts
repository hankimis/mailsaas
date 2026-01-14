import crypto from 'crypto';

// ============================================
// Solapi API Client for KakaoTalk AlimTalk
// ============================================

interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  senderPhone: string;
  kakaoChannelId: string;
}

interface SendMessageParams {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  groupId?: string;
  error?: string;
}

interface MessageStatus {
  messageId: string;
  status: 'PENDING' | 'SENDING' | 'SUCCESS' | 'FAIL' | 'REFUND';
  statusMessage?: string;
}

class SolapiClient {
  private baseURL = 'https://api.solapi.com';
  private config: SolapiConfig;

  constructor(config?: Partial<SolapiConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.SOLAPI_API_KEY!,
      apiSecret: config?.apiSecret || process.env.SOLAPI_API_SECRET!,
      senderPhone: config?.senderPhone || process.env.SOLAPI_SENDER_PHONE!,
      kakaoChannelId: config?.kakaoChannelId || process.env.SOLAPI_KAKAO_CHANNEL_ID!,
    };
  }

  /**
   * Generate HMAC-SHA256 authorization header
   */
  private generateAuthHeader(): string {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(date + salt)
      .digest('hex');

    return `HMAC-SHA256 apiKey=${this.config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  }

  /**
   * Fetch wrapper with auth and timeout
   */
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.generateAuthHeader(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send KakaoTalk AlimTalk message
   */
  async sendAlimTalk(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const result = await this.fetchWithAuth<{
        groupInfo?: { messageId: string; groupId: string };
        message?: string;
      }>('/messages/v4/send', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              to: this.formatPhoneNumber(params.to),
              from: this.config.senderPhone,
              kakaoOptions: {
                pfId: this.config.kakaoChannelId,
                templateId: params.templateId,
                variables: params.variables,
              },
            },
          ],
        }),
      });

      if (result.groupInfo) {
        return {
          success: true,
          messageId: result.groupInfo.messageId,
          groupId: result.groupInfo.groupId,
        };
      }

      return {
        success: false,
        error: result.message || 'No response from Solapi',
      };
    } catch (error) {
      console.error('Solapi send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send multiple AlimTalk messages
   */
  async sendBulkAlimTalk(
    messages: SendMessageParams[]
  ): Promise<{ success: boolean; groupId?: string; results: SendMessageResult[] }> {
    try {
      const formattedMessages = messages.map((msg) => ({
        to: this.formatPhoneNumber(msg.to),
        from: this.config.senderPhone,
        kakaoOptions: {
          pfId: this.config.kakaoChannelId,
          templateId: msg.templateId,
          variables: msg.variables,
        },
      }));

      const data = await this.fetchWithAuth<{
        groupInfo?: { groupId: string };
      }>('/messages/v4/send-many', {
        method: 'POST',
        body: JSON.stringify({ messages: formattedMessages }),
      });

      if (data.groupInfo) {
        return {
          success: true,
          groupId: data.groupInfo.groupId,
          results: messages.map(() => ({ success: true })),
        };
      }

      return {
        success: false,
        results: messages.map(() => ({
          success: false,
          error: 'Send failed',
        })),
      };
    } catch (error) {
      console.error('Solapi bulk send error:', error);
      return {
        success: false,
        results: messages.map(() => ({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      };
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    try {
      const response = await this.fetchWithAuth<{
        messageList?: Array<{
          messageId: string;
          status: MessageStatus['status'];
          statusMessage?: string;
        }>;
      }>(`/messages/v4/list?messageId=${encodeURIComponent(messageId)}`);

      const message = response.messageList?.[0];

      if (message) {
        return {
          messageId: message.messageId,
          status: message.status,
          statusMessage: message.statusMessage,
        };
      }

      return null;
    } catch (error) {
      console.error('Get message status error:', error);
      return null;
    }
  }

  /**
   * Get group status (for bulk sends)
   */
  async getGroupStatus(groupId: string) {
    try {
      return await this.fetchWithAuth(`/messages/v4/groups/${groupId}`);
    } catch (error) {
      console.error('Get group status error:', error);
      return null;
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Korean phone number
    if (digits.startsWith('010') || digits.startsWith('011')) {
      return `+82${digits.substring(1)}`;
    }

    // Already has country code
    if (digits.startsWith('82')) {
      return `+${digits}`;
    }

    // Default: assume Korean
    return `+82${digits}`;
  }
}

// Export singleton instance
export const solapiClient = new SolapiClient();

// Export class for custom configurations
export { SolapiClient };
export type { SolapiConfig, SendMessageParams, SendMessageResult, MessageStatus };
