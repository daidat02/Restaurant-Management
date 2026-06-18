import { Router } from "express";
import { verifyRole, verifyToken } from "../../middlewares/auth.middleware.js";
import orderController from "./order.controller.js";


const router = Router();

router.post('/',orderController.createOrder);
router.post('/add-item',orderController.addItemIntoOrder);
router.post('/item/:itemId/:status',verifyToken,orderController.updateOrederItemStatus);

router.get('/:id',verifyToken,orderController.getDetailOrder)
router.get('/restaurant/:id/:status',verifyToken,orderController.getAllOrderStatusByRestaurant)
router.get('/restaurant/:id', verifyToken,orderController.getAllOrderByRestaurant )
router.get('/active/:restaurantId',verifyToken, orderController.getActiveOrders);
router.get('/table/:tableId', orderController.getOrderByTableId);
router.get('/my-orders', verifyToken,verifyRole(['customer']), orderController.getMyOrders);

router.put('/:id',verifyToken,verifyRole(['staff','manager']),orderController.updateOrder)
router.put('/:id/status',verifyToken,verifyRole(['staff','manager']),orderController.updateOrder)

export default router;