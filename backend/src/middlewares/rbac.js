const orgModel = require('../models/org.model');

async function loadOrgMembership(req, res, next) {
  const isFallback = !req.params.orgId;
  const orgId = req.params.orgId || req.user.orgId;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      error: 'Organization ID is required',
      code: 'MISSING_ORG_ID',
    });
  }

  try {
    const membership = await orgModel.findMembership(req.user.userId, orgId);

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: isFallback ? 'Membership not found' : 'You are not a member of this organization',
        code: 'NOT_ORG_MEMBER',
      });
    }

    req.orgMember = {
      userId: membership.user_id,
      organizationId: membership.organization_id,
      role: membership.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

function requireOrgRole(...roles) {
  return (req, res, next) => {
    if (!req.orgMember) {
      return res.status(500).json({
        success: false,
        error: 'loadOrgMembership must run before requireOrgRole',
        code: 'MIDDLEWARE_ORDER',
      });
    }

    if (!roles.includes(req.orgMember.role)) {
      return res.status(403).json({
        success: false,
        error: `Required role: ${roles.join(' or ')}`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

module.exports = { loadOrgMembership, requireOrgRole };
