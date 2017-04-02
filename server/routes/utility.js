function Utility() {};

Utility.prototype.randomNumber = function () {
  var randomNumber = ( Math.random() * 100000 ) | 0;
  return randomNumber;
};

module.exports = Utility;
