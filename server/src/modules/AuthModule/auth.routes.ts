import { Router } from 'express';
import authController from './auth.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();
// Đăng ký các route cho user
router.get('/profile/me', verifyToken, authController.getProfileUserById);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.refreshToken);
router.patch('/update/me', verifyToken, authController.updateUser);
router.post('/reset-password', verifyToken, authController.updatePassword);

// đăng ký các route cho admin
router.get(
  '/profile/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  authController.getProfileUserById,
);
router.get('/', verifyToken, verifyRole(['manager', 'admin']), authController.getUsersWithFilter);
router.delete(
  '/admin/delete/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  authController.deleteUser,
);
router.put(
  '/admin/update/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  authController.updateUser,
);

export default router;
