const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Configure JWKS client targeting Keycloak certs endpoint
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_REALM_URL || 'http://localhost:8080/realms/coaching-realm'}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

// Helper to retrieve the signing public key based on token header key ID (kid)
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error(`[JWKS ERROR] Fetch signing key failed: ${err.message}`);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

const verifyKeycloakToken = (roleRequired) => {
  return (req, res, next) => {
    // 1. Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Bearer token required' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Perform JWT verification using dynamic public key
    jwt.verify(
      token,
      getKey,
      {
        issuer: process.env.KEYCLOAK_REALM_URL || 'http://localhost:8080/realms/coaching-realm'
      },
      (err, decoded) => {
        if (err) {
          console.error(`[AUTH ERROR] Token verification failed: ${err.message}`);
          return res.status(403).json({ success: false, error: `Forbidden: Invalid JWT (${err.message})` });
        }

        // Verify Authorized Party (Keycloak Client ID)
        const allowedClients = ['coaching-client', 'coaching-coach'];
        if (decoded && !allowedClients.includes(decoded.azp)) {
          console.warn(`[AUTH WARN] Token client '${decoded.azp}' is not authorized`);
          return res.status(403).json({ success: false, error: 'Forbidden: Invalid client ID' });
        }

        // Attach decoded claims to the request object
        req.user = decoded;

        // 3. Verify Keycloak Realm Roles if RBAC is requested
        if (roleRequired) {
          const realmRoles = decoded.realm_access?.roles || [];
          if (!realmRoles.includes(roleRequired)) {
            console.warn(`[AUTH WARN] Access Denied: User '${decoded.preferred_username}' lacks role '${roleRequired}'`);
            return res.status(403).json({ success: false, error: `Forbidden: Lacks role '${roleRequired}'` });
          }
        }

        console.log(`[AUTH SUCCESS] User '${decoded.preferred_username}' authorized with role '${roleRequired || 'any'}'`);
        next();
      }
    );
  };
};

module.exports = { verifyKeycloakToken };
