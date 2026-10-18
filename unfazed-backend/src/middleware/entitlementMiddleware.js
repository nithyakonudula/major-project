const {canAccess}=require('../services/entitlementService');
module.exports=featureKey=>async(req,res,next)=>{try{const access=await canAccess(req.therapist._id,featureKey);if(!access.allowed)return res.status(403).json({message:access.reason||'Upgrade your plan to use this feature',upgradeRequired:true,entitlement:access});req.entitlement=access;next();}catch(e){next(e);}};
