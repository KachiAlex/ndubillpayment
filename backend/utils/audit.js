const database = require('./database');

/**
 * Audit logging utility for tracking critical operations
 */
class AuditLogger {
  /**
   * Log an audit event
   * @param {Object} options
   * @param {string} options.action - The action performed (e.g., 'fee_created', 'payment_processed')
   * @param {string} options.userId - The ID of the user who performed the action
   * @param {string} options.userEmail - The email of the user
   * @param {string} options.userType - The type of user (student, bursar, admin)
   * @param {string} options.entityType - The type of entity affected (e.g., 'fee', 'payment', 'user')
   * @param {string|number} options.entityId - The ID of the entity affected
   * @param {Object} options.oldValues - Previous values (for updates)
   * @param {Object} options.newValues - New values (for creates/updates)
   * @param {Object} options.req - Express request object (for IP and user agent)
   */
  static async log({
    action,
    userId,
    userEmail,
    userType,
    entityType = null,
    entityId = null,
    oldValues = null,
    newValues = null,
    req = null
  }) {
    try {
      const auditData = {
        action,
        user_id: userId || null,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
        user_agent: req?.headers['user-agent'] || null
      };

      // Add user info if available from request
      if (req?.user) {
        auditData.user_email = req.user.email;
        auditData.user_type = req.user.user_type;
      } else if (userEmail) {
        auditData.user_email = userEmail;
        auditData.user_type = userType;
      }

      await database.db('audit_logs').insert(auditData);
    } catch (err) {
      console.error('[AuditLogger] Failed to log audit event:', err.message);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Middleware to log route access
   */
  static middleware(action, entityType) {
    return async (req, res, next) => {
      // Store original json method to capture response
      const originalJson = res.json;
      
      res.json = function(data) {
        // Restore original method
        res.json = originalJson;
        
        // Log after response is sent (fire and forget)
        if (req.user) {
          const entityId = data?.fee?.id || data?.payment?.id || data?.refund?.id || data?.user?.id || null;
          
          AuditLogger.log({
            action,
            userId: req.user.id,
            userEmail: req.user.email,
            userType: req.user.user_type,
            entityType,
            entityId,
            newValues: data,
            req
          }).catch(err => console.error('[AuditMiddleware] Logging error:', err));
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
}

module.exports = AuditLogger;
