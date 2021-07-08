import { createSocketServer } from 'server'

const debug = require('debug')('app')

const server = createSocketServer()
const PORT = process.env.PORT || 30000
server.listen(PORT, () => {
  debug(`Server listening on port ${PORT}`)
})
