import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const stayService = {
  remove,
  query,
  getById,
  add,
  update,
  addStayMsg,
  removeStayMsg,
}

async function query(filterBy = {}) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('stays')
    let cursor = collection.find(criteria).sort(sort)

    if (filterBy.pageIdx != null) {
      cursor = cursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
      if (filterBy.limit != null) cursor = cursor.limit(+filterBy.limit)
    }

    const stays = await cursor.toArray()
    return stays
  } catch (err) {
    logger.error('cannot find stays', err)
    throw err
  }
}

async function getById(stayId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stayId) }

    const collection = await dbService.getCollection('stays')
    const stay = await collection.findOne(criteria)

    stay.createdAt = stay._id.getTimestamp()
    return stay
  } catch (err) {
    logger.error(`while finding stay ${stayId}`, err)
    throw err
  }
}

async function remove(stayId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(stayId),
    }

    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('stay')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your stay'
    return stayId
  } catch (err) {
    logger.error(`cannot remove stay ${stayId}`, err)
    throw err
  }
}

async function add(stay) {
  try {
    const collection = await dbService.getCollection('stay')
    await collection.insertOne(stay)

    return stay
  } catch (err) {
    logger.error('cannot insert stay', err)
    throw err
  }
}

async function update(stay) {
  const stayToSave = { vendor: stay.vendor, speed: stay.speed }

  try {
    const criteria = { _id: ObjectId.createFromHexString(stay._id) }
    const collection = await dbService.getCollection('stay')
    await collection.updateOne(criteria, { $set: stayToSave })

    return stay
  } catch (err) {
    logger.error(`cannot update stay ${stay._id}`, err)
    throw err
  }
}

async function addStayMsg(stayId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stayId) }
    msg.id = makeId()

    const collection = await dbService.getCollection('stay')
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add stay msg ${stayId}`, err)
    throw err
  }
}

async function removeStayMsg(stayId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stayId) }

    const collection = await dbService.getCollection('stay')
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot remove stay msg ${stayId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}

  if (filterBy.name) {
    criteria.name = { $regex: filterBy.name, $options: 'i' }
  }

  //  country / city
  if (filterBy.country) {
    criteria['loc.country'] = filterBy.country
  }
  if (filterBy.city) {
    criteria['loc.city'] = filterBy.city
  }

  // price
  if (filterBy.price) {
    criteria.price = { $gte: filterBy.price }
  }

  // capacity
  if (filterBy.capacity) {
    criteria.capacity = { $gte: filterBy.capacity }
  }

  return criteria
}

function _buildSort(filterBy) {
  if (!filterBy.sortField) return {}
  return { [filterBy.sortField]: filterBy.sortDir }
}
