class BiometricService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.publicKeyCredential = null;
  }

  checkSupport() {
    return !!(
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      window.navigator.credentials.create &&
      window.navigator.credentials.get
    );
  }

  // Check if biometric authentication is available
  async isAvailable() {
    if (!this.isSupported) {
      return false;
    }

    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  // Register biometric authentication
  async register(userId, username) {
    if (!this.isSupported) {
      throw new Error('Biometric authentication not supported');
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "NDU Payment Portal",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [
            {
              type: "public-key",
              alg: -7, // ES256
            },
            {
              type: "public-key", 
              alg: -257, // RS256
            },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct",
        },
      });

      // Store credential ID for future authentication
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem('biometric_credential_id', credentialId);

      return {
        credentialId: credentialId,
        publicKey: credential.response.publicKey,
        clientDataJSON: credential.response.clientDataJSON,
        attestationObject: credential.response.attestationObject
      };
    } catch (error) {
      console.error('Biometric registration failed:', error);
      throw error;
    }
  }

  // Authenticate using biometric
  async authenticate() {
    if (!this.isSupported) {
      throw new Error('Biometric authentication not supported');
    }

    const credentialId = localStorage.getItem('biometric_credential_id');
    if (!credentialId) {
      throw new Error('No biometric credential found. Please register first.');
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: new Uint8Array(atob(credentialId).split('').map(c => c.charCodeAt(0))),
            type: "public-key",
          }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      return {
        credentialId: credentialId,
        authenticatorData: credential.response.authenticatorData,
        clientDataJSON: credential.response.clientDataJSON,
        signature: credential.response.signature,
        userHandle: credential.response.userHandle
      };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      throw error;
    }
  }

  // Check if user has registered biometric
  isRegistered() {
    return !!localStorage.getItem('biometric_credential_id');
  }

  // Remove biometric registration
  removeRegistration() {
    localStorage.removeItem('biometric_credential_id');
  }

  // Get user-friendly error messages
  getErrorMessage(error) {
    const errorMessages = {
      'NotAllowedError': 'Biometric authentication was cancelled or not allowed',
      'NotSupportedError': 'Biometric authentication is not supported on this device',
      'SecurityError': 'Security error occurred during authentication',
      'InvalidStateError': 'Invalid state error - please try registering again',
      'UnknownError': 'An unknown error occurred during biometric authentication',
      'ConstraintError': 'Constraint error - biometric authentication constraints not met',
      'AbortError': 'Authentication was aborted by the user'
    };

    return errorMessages[error.name] || 'Biometric authentication failed';
  }

  // Check device capabilities
  async getDeviceInfo() {
    if (!this.isSupported) {
      return {
        supported: false,
        message: 'WebAuthn not supported'
      };
    }

    try {
      const available = await this.isAvailable();
      const registered = this.isRegistered();

      return {
        supported: true,
        available: available,
        registered: registered,
        platform: navigator.platform,
        userAgent: navigator.userAgent
      };
    } catch (error) {
      return {
        supported: true,
        available: false,
        registered: false,
        error: error.message
      };
    }
  }

  // Generate a simple fingerprint for device identification
  async generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('NDU Payment Portal Device Fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL();
    
    // Combine with other device characteristics
    const deviceInfo = {
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      canvas: fingerprint.slice(-50) // Last 50 characters for uniqueness
    };

    // Create a simple hash
    const hash = btoa(JSON.stringify(deviceInfo));
    return hash.slice(0, 16); // Return first 16 characters
  }
}

// Create singleton instance
const biometricService = new BiometricService();

export default biometricService;
