const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  gamesCount: {
    type: Number,
    default: 0,
  },
  botStarted: {
    type: [String],
    default: [],
  },
  refStarted: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model('stats', statsSchema);
