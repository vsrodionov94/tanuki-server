const checkUser = require('./checkUser');
const getRaitings = require('./getRaitings');
const setNewScore = require('./setNewScore');
const startGame = require('./startGame');

module.exports = app => {
  checkUser(app);
  getRaitings(app);
  setNewScore(app);
  startGame(app);
};
