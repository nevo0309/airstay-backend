import { ObjectId } from 'bson'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'

const PAGE_SIZE = 3

export const orderService = {
  query,
  getById,
  add,
  update,
  remove,
  updateStatus,
}

export async function query(filterBy = {}) {
  const hostObjId =
    filterBy.hostId && ObjectId.isValid(filterBy.hostId) ? new ObjectId(filterBy.hostId) : null
  const collection = await dbService.getCollection('orders')
  const criteria = _buildCriteria(filterBy)

  return collection
    .aggregate([
      { $match: criteria },
      {
        $lookup: {
          from: 'stays',
          localField: 'stay._id',
          foreignField: '_id',
          as: 'stayDoc',
        },
      },
      { $unwind: { path: '$stayDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          status: 1,
          startDate: 1,
          createdAt: 1,
          endDate: 1,
          totalPrice: 1,
          guests: 1,
          orderedAt: 1,
          message: 1,

          stay: {
            _id: '$stayDoc._id',
            name: '$stayDoc.name',
            city: '$stayDoc.loc.city',
            price: '$stayDoc.price',
            imgUrl: { $arrayElemAt: ['$stayDoc.imgUrls', 0] },
          },

          guest: {
            _id: '$guest._id',
            fullname: '$guest.fullname',
            imgUrl: '$guest.imgUrl',
          },

          host: {
            _id: '$host._id',
            fullname: '$host.fullname',
            imgUrl: '$host.imgUrl',
          },
          isHost: { $eq: ['$host._id', hostObjId] },
        },
      },

      { $sort: { createdAt: -1 } },
    ])
    .toArray()
}

async function getById(orderId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(orderId) }
    const collection = await dbService.getCollection('orders')
    const order = await collection.findOne(criteria)

    if (order) order.createdAt = order._id.getTimestamp()
    return order
  } catch (err) {
    logger.error(`while finding order ${orderId}`, err)
    throw err
  }
}

async function add(order) {
  try {
    const collection = await dbService.getCollection('orders')
    if (order.stay?._id && typeof order.stay._id === 'string')
      order.stay._id = ObjectId.createFromHexString(order.stay._id)
    if (order.host?._id && typeof order.host._id === 'string')
      order.host._id = ObjectId.createFromHexString(order.host._id)
    if (order.guest?._id && typeof order.guest._id === 'string')
      order.guest._id = ObjectId.createFromHexString(order.guest._id)
    order.createdAt = Date.now()
    const { insertedId } = await collection.insertOne(order)
    order._id = insertedId
    return order
  } catch (err) {
    logger.error('cannot insert order', err)
    throw err
  }
}

async function update(order) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(order._id) }
    const collection = await dbService.getCollection('orders')
    await collection.updateOne(criteria, { $set: order })
    return order
  } catch (err) {
    logger.error(`cannot update order ${order._id}`, err)
    throw err
  }
}

async function remove(orderId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: userId, isAdmin } = loggedinUser

  try {
    const criteria = { _id: ObjectId.createFromHexString(orderId) }
    if (!isAdmin) criteria['guest._id'] = userId

    const collection = await dbService.getCollection('orders')
    const res = await collection.deleteOne(criteria)
    if (res.deletedCount === 0) throw 'Not your order'

    return orderId
  } catch (err) {
    logger.error(`cannot remove order ${orderId}`, err)
    throw err
  }
}

async function updateStatus(orderId, status) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(orderId) }
    const collection = await dbService.getCollection('orders')
    await collection.updateOne(criteria, { $set: { status } })
    return { orderId, status }
  } catch (err) {
    logger.error(`cannot update status on order ${orderId}`, err)
    throw err
  }
}

/* ----------------------------------------------------------------- */
/*  Private helpers                                                  */
/* ----------------------------------------------------------------- */

function _buildCriteria(filterBy = {}) {
  const crit = {}

  if (filterBy.stayId && ObjectId.isValid(filterBy.stayId))
    crit['stay._id'] = new ObjectId(filterBy.stayId)

  if (filterBy.hostId && ObjectId.isValid(filterBy.hostId))
    crit['host._id'] = new ObjectId(filterBy.hostId)

  if (filterBy.guestId && ObjectId.isValid(filterBy.guestId))
    crit['guest._id'] = new ObjectId(filterBy.guestId)

  if (filterBy.status) crit.status = filterBy.status
  return crit
}

function _buildSort(filterBy) {
  if (!filterBy.sortField) return {}
  return { [filterBy.sortField]: filterBy.sortDir || 1 }
}
