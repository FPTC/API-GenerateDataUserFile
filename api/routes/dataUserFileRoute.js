
'use strict';

module.exports = function (app) {
    var todoList = require('../controllers/dataUserFileController');

    // todoList Routes
    app.route('/generateUserDataFile')
        .get(todoList.generateUserDataFile); 
 
};