const User = require('../models/user');

module.exports = app => {
  app.post('/startGame', (req, res) => {
    const { tgId } = req.body;
    const result = { error: false };
    const user = User.findOne({ tgId: tgId }).then(data => data);
    if (user && user.attepmts > 0) {
      User.updateOne({ _id: user.id }, { $set: { attempts: user.attempts - 1 } }).then(() => null);
    } else {
      result.error = true;
    }
    res.json(result);
  });
};
