import express from 'express';
import { register, login, googleLogin, assignAdminRole, setupFirstAdmin, assignRestaurantOwnerRole, removeRestaurantOwnerRole, removeAdminRole, updateProfile, changePassword, deleteUserAccount, getUsers, refreshAccessToken, logout, assignDeliveryPartnerRole, removeDeliveryPartnerRole } from '../controllers/authController.ts';
import { verifyToken } from '../middlewares/authMiddleware.ts';
import { authorize } from '../middlewares/roleMiddleware.ts';
import { validateRequest } from '../middlewares/payloadValidation.ts'
import { signupSchema, loginSchema, changePasswordSchema, updateProfileSchema, googleLoginSchema} from '../validation/schemas/index.ts'
const router = express.Router();

router.post('/register',validateRequest(signupSchema), register); 
router.post('/login', validateRequest(loginSchema), login);     
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', verifyToken, logout);
router.post('/google-login', validateRequest(googleLoginSchema), googleLogin); 
router.post('/setup-admin', setupFirstAdmin)

router.get('/users', verifyToken, authorize(['admin', 'super_admin']), getUsers);

router.put(
  '/profile',
  verifyToken,
  validateRequest(updateProfileSchema),
  updateProfile
);

router.post(
  '/change-password',
  validateRequest(changePasswordSchema),
  verifyToken,
  changePassword
);

router.post(
  '/assign-admin',
  verifyToken,
  authorize(['super_admin']), 
  assignAdminRole
);

router.post(
  '/remove-admin',
  verifyToken,
  authorize(['super_admin']),
  removeAdminRole  
);


router.post(
  '/assign-restaurant-owner',
  verifyToken,
  authorize(['admin', 'super_admin']), 
  assignRestaurantOwnerRole
);

router.post(
  '/remove-restaurant-owner',
  verifyToken,
  authorize(['admin', 'super_admin']),  
  removeRestaurantOwnerRole
);

router.post(
  '/assign-delivery-partner',
  verifyToken,
  authorize(['admin', 'super_admin']),
  assignDeliveryPartnerRole
);
router.post(
  '/remove-delivery-partner',
  verifyToken,
  authorize(['admin', 'super_admin']),
  removeDeliveryPartnerRole
);

router.delete(
  '/accountdelete',
  verifyToken,
  deleteUserAccount
);


export default router;