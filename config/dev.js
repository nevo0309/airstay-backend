export default {
  // dbURL: 'mongodb://127.0.0.1:27017',
  // dbName: 'tester_db',
  dbURL: process.env.MONGO_URL || 'mongodb+srv://nevo0309:Ne318194313@nevo-db.6uwjpen.mongodb.net/',
  dbName: process.env.DB_NAME || 'stay_db',
}
