exports.term = /^20\d{2}-[1-3]$/;
exports.time = /^([01]\d|2[0-3]):[0-5]\d$/;
exports.nonnegativeInteger = { validator: value => Number.isInteger(value) && value >= 0, message: "Must be a nonnegative integer" };
