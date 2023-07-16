var express = require('express');
var path = require('path');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/', indexRouter);

app.listen(42069, () => {
	console.log('Máy chủ đang chạy: http://localhost:42069')
})