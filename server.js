require('dotenv').config()
const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const socket = require('socket.io')(server, { origins: '*:*' })
const io = socket(server)

const testees = {}
const testers = {}
const users = {}
const socketToRoom = {}

io.on('connection', socket => {
  console.log('connection occured')
  // tester has joined the room
  // make p2p connection with everybody in the room
  socket.on('tester join room', roomID => {
    console.log('Tester has joined the room!', roomID)

    if (users[roomID]) {
      const length = testers[roomID].length
      if (length === 4) {
        console.log('Tester room full')
        socket.emit('room full')
        return
      }

      users[roomID].push(socket.id)
    } else {
      users[roomID] = [socket.id]
    }

    if (testers[roomID]) {
      testers[roomID].push(socket.id)
    } else {
      testers[roomID] = [socket.id]
    }

    socketToRoom[socket.id] = roomID
    console.log(users[roomID], roomID, socket.id)
    const usersInThisRoom = users[roomID].filter(id => id !== socket.id)
    console.log('users in this room:', usersInThisRoom)
    socket.emit('all users', usersInThisRoom)
  })
  // testee has joined the room
  // only make p2p connection with testers
  socket.on('join room', roomID => {
    console.log('User has joined the room!', roomID)

    if (users[roomID]) {
      const length = users[roomID].length
      if (length === 4) {
        console.log('Tester room full')
        socket.emit('room full')
        return
      }

      users[roomID].push(socket.id)
    } else {
      users[roomID] = [socket.id]
    }

    if (testees[roomID]) {
      testees[roomID].push(socket.id)
    } else {
      testees[roomID] = [socket.id]
    }
    console.log(users[roomID], roomID, socket.id)
    socketToRoom[socket.id] = roomID
    if (testers[roomID]) {
      const testersInThisRoom = testers[roomID].filter(id => id !== socket.id)
      socket.emit('all testers', testersInThisRoom)
    } else {
      socket.emit('all testers', [])
    }
  })

  socket.on('sending signal', payload => {
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID
    })
  })

  socket.on('returning signal', payload => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id
    })
  })

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id]
    let room = users[roomID]
    if (room) {
      room = room.filter(id => id !== socket.id)
      users[roomID] = room
    }
  })
})

server.listen(process.env.PORT || 8800, () =>
  console.log('server is running on port 8800')
)
