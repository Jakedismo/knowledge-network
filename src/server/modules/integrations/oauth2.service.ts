import * as crypto from 'crypto';
import { OAuth2Config, OAuth2Token, AuthenticationError } from './types';

export class OAuth2Service {
  generateAuthorizationUrl(
    config: OAuth2Config,
    state?: string,
    additionalParams?: Record<string, string>
  ): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state: state || this.generateState(),
      ...additionalParams,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    config: OAuth2Config
  ): Promise<OAuth2Token> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    });

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AuthenticationError(`Failed to exchange code: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error: any) {
      throw new AuthenticationError(`OAuth2 token exchange failed: ${error.message}`);
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    config: OAuth2Config
  ): Promise<OAuth2Token> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AuthenticationError(`Failed to refresh token: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error: any) {
      throw new AuthenticationError(`OAuth2 token refresh failed: ${error.message}`);
    }
  }

  async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token',
    config: Partial<OAuth2Config> & { revokeUrl: string }
  ): Promise<void> {
    const params = new URLSearchParams({
      token,
      token_type_hint: tokenType,
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
    });

    try {
      const response = await fetch(config.revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new AuthenticationError(`Failed to revoke token: ${error}`);
      }
    } catch (error: any) {
      throw new AuthenticationError(`OAuth2 token revocation failed: ${error.message}`);
    }
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateState(providedState: string, expectedState: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(providedState),
      Buffer.from(expectedState)
    );
  }

  // Helper method for PKCE (Proof Key for Code Exchange)
  generatePKCEChallenge(): { verifier: string; challenge: string } {
    const verifier = this.generateState();
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  // Helper method for JWT decoding (without verification)
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(payload);
    } catch (error) {
      throw new AuthenticationError('Failed to decode token');
    }
  }

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      const exp = decoded.exp;

      if (!exp) {
        return false; // No expiration claim
      }

      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch {
      return true; // Assume expired if we can't decode
    }
  }
}