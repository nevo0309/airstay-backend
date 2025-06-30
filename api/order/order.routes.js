import express from 'express'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'

import {
  getOrders,
  getOrderById,
  addOrder,
  updateOrder,
  removeOrder,
  updateOrderStatus,
  markHostMsgRead,
} from './order.controller.js'

const router = express.Router()

router.get('/', log, getOrders)
router.get('/:id', log, getOrderById)

router.post('/', requireAuth, addOrder)
router.put('/:id', requireAuth, updateOrder)
router.delete('/:id', requireAuth, removeOrder)
router.patch('/:id/msg-read', requireAuth, markHostMsgRead)
// dedicate PATCH for status to keep it clean
router.patch('/:id/status', requireAuth, updateOrderStatus)

export const orderRoutes = router
