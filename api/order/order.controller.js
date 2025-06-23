import { orderService } from './order.service.js'
import { logger } from '../../services/logger.service.js'

export async function getOrders(req, res) {
  try {
    const orders = await orderService.query(req.query)
    res.json(orders)
  } catch (err) {
    logger.error('Failed to get my orders', err)
    res.status(400).send({ err: 'Failed to get orders' })
  }
}

export async function getOrderById(req, res) {
  try {
    const order = await orderService.getById(req.params.id)
    res.json(order)
  } catch (err) {
    logger.error('Failed to get order', err)
    res.status(400).send({ err: 'Failed to get order' })
  }
}

export async function addOrder(req, res) {
  try {
    const { loggedinUser, body: order } = req
    order.guest = loggedinUser

    const added = await orderService.add(order)
    res.json(added)
  } catch (err) {
    logger.error('Failed to add order', err)
    res.status(400).send({ err: 'Failed to add order' })
  }
}

export async function updateOrder(req, res) {
  const { loggedinUser, body: order } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && order.guest._id !== userId) {
    res.status(403).send('Not your order…')
    return
  }

  try {
    const updated = await orderService.update(order)
    res.json(updated)
  } catch (err) {
    logger.error('Failed to update order', err)
    res.status(400).send({ err: 'Failed to update order' })
  }
}

export async function removeOrder(req, res) {
  try {
    const removedId = await orderService.remove(req.params.id)
    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove order', err)
    res.status(400).send({ err: 'Failed to remove order' })
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    const saved = await orderService.updateStatus(id, status)
    res.json(saved)
  } catch (err) {
    logger.error('Failed to update order status', err)
    res.status(400).send({ err: 'Failed to update order status' })
  }
}
