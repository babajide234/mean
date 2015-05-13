'use strict';

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var morgan = require('morgan');
var compression = require('compression');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var User = require('./models/user');
var mongoose = require('mongoose');

mongoose.connect('mongodb://' + process.env.DB_PORT_27017_TCP_ADDR + '/mean');

app.enable('trust proxy');

app.disable('x-powered-by');

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(compression());
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/users/:id', function(req, res) {
  User.findById(req.params.id, function(err, document) {
    if (err) {
      return res
        .status(500)
        .json(err);
    }

    if (!document) {
      return res
        .status(404)
        .send();
    }

    res.json(document);
  });
});

app.get('/users', function(req, res) {
  User.find({}, function(err, documents) {
    if (err) {
      return res
        .status(500)
        .json(err);
    }
    return res.json(documents);
  });
});

app.post('/users', function(req, res) {
  console.log(req.body);
  User.create(
    {
      email: req.body.email
    },
    function(err, document) {
      if (err) {
        return res
          .status(500)
          .json(err);
      }

      if (!document) {
        return res
          .status(404)
          .send();
      }

      res.json(document);
    }
  )
});

app.put('/users/:id', function(req, res) {
  User.findOneAndUpdate({_id: req.params.id}, { email: req.body.email }, { new: true }, function(err, document) {
    if (err) {
      return res
        .status(500)
        .json(err);
    }

    if (!document) {
      return res
        .status(404)
        .send();
    }

    res.json(document);
  })
});

app.delete('/users/:id', function(req, res) {
  User.findOneAndRemove({_id: req.params.id}, function(err) {
    if (err) {
      return res
        .status(500)
        .json(err);
    }

    res
      .status(204)
      .send();
  })
});

// Catch all
app.use(function(req, res) {
  res
    .status(404)
    .json({
      status: 'Document does not exist'
    });
});

// Error handling
app.use(function(err, req, res, next) {
  res
    .status(500)
    .json({
      status: 'INTERNAL SERVER ERROR',
      message: err.message,
      data: err.stack
    });
});

// Chat
var usernames = {};
var numUsers = 0;

io.on('connection', function(socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function(data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function(username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function() {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function() {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function() {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

module.exports = server;
