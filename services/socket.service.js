import { logger } from './logger.service.js'
import { toPlainId } from './util.service.js'

let gIo // will hold the singleton once setup() is called

export function setupSocketAPI(io) {
  gIo = io

  gIo.on('connection', socket => {
    logger.info('Socket connected – ' + socket.id)

    // 1  user tells us who they are so we can put the socket in their room
    socket.on('set-user-socket', userIdRaw => {
      const room = toPlainId(userIdRaw)
      console.log('[SOCKET] join room', room)
      if (socket.userId) socket.leave(socket.userId)
      socket.join(room)
      socket.userId = room
    })

    // 2️  when user logs out or tab closes
    socket.on('unset-user-socket', () => {
      if (socket.userId) socket.leave(socket.userId)
      socket.userId = null
    })

    socket.on('disconnect', () => logger.info('Socket disconnected – ' + socket.id))
  })
}

/** Emit to a single user */
export function emitToUser(userId, evt, data) {
  gIo?.to(toPlainId(userId)).emit(evt, data)
}

/** Emit to two users (guest + host) at once */
export function emitToUsers(ids, evt, data) {
  gIo?.to(ids.map(toPlainId)).emit(evt, data)
}
// Socket.IO accepts an array of rooms
